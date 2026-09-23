/**
 * Electron Main Process — Study Time Tracker Desktop
 *
 * Architecture:
 *   Electron main process
 *     ├─ in-process Express server (routes/api.js, models, controllers, dist-react)
 *     ├─ mainWindow      BrowserWindow      ← http://localhost:${actualPort}
 *     ├─ widgetWindow    BrowserWindow      ← floating-timer.html (frameless, alwaysOnTop)
 *     ├─ systemTray      Tray               ← Windows notification area controls
 *     └─ Notification    electron.Notification ← Native Windows notifications
 *
 * IPC channels (renderer → main):
 *   open-floating-widget   show/create the widget
 *   close-floating-widget  hide the widget (does NOT touch timer state)
 *   focus-main-window      un-minimize + focus the main window
 *   minimize-window        minimize the main window
 *   timer-action           start | stop | pause | resume | reset | stop-and-save | update-state | switch-mode | skip-break
 *   request-timer-state    main replies with current sharedTimerState
 *   save-widget-bounds     persist { x, y, width, height }
 *   load-widget-bounds     (invoke) return saved bounds or null
 *   show-notification      display native desktop notification
 *
 * IPC channels (main → renderer):
 *   timer-state-update     broadcast sharedTimerState to all windows
 *   save-timer-session     ask dashboard to POST /timer/save
 */

import { app, BrowserWindow, ipcMain, Menu, Tray, Notification, dialog } from 'electron';
import { fileURLToPath }  from 'url';
import { dirname, join }  from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import http from 'http';
import net  from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

let actualPort = parseInt(process.env.PORT || '3000', 10);
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

// ---------------------------------------------------------------------------
// Window & Tray references
// ---------------------------------------------------------------------------
let mainWindow            = null;
let widgetWindow          = null;
let appTray               = null;
let serverModuleInstance  = null;
let isQuitting            = false;

// ---------------------------------------------------------------------------
// App Icon Helper
// ---------------------------------------------------------------------------
function getAppIconPath() {
  const icoPath = join(__dirname, 'build', 'icon.ico');
  const pngPath = join(__dirname, 'build', 'icon.png');
  if (process.platform === 'win32' && existsSync(icoPath)) return icoPath;
  if (existsSync(pngPath)) return pngPath;
  return undefined;
}

// ---------------------------------------------------------------------------
// Window State & Bounds persistence (userData directory)
// ---------------------------------------------------------------------------
function boundsFilePath() {
  return join(app.getPath('userData'), 'widget-bounds.json');
}

function windowStateFilePath() {
  return join(app.getPath('userData'), 'window-state.json');
}

function loadWidgetBounds() {
  try {
    const p = boundsFilePath();
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  } catch (_) {}
  return null;
}

function saveWidgetBounds(bounds) {
  try {
    const dir = app.getPath('userData');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(boundsFilePath(), JSON.stringify(bounds), 'utf8');
  } catch (err) {
    console.warn('Could not save widget bounds:', err.message);
  }
}

function loadWindowState() {
  try {
    const p = windowStateFilePath();
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  } catch (_) {}
  return null;
}

function saveWindowState(bounds) {
  try {
    const dir = app.getPath('userData');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(windowStateFilePath(), JSON.stringify(bounds), 'utf8');
  } catch (err) {
    console.warn('Could not save window state:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Shared timer state — SINGLE SOURCE OF TRUTH FOR ALL WINDOWS & TRAY
// ---------------------------------------------------------------------------
let sharedTimerState = {
  mode:              'free',    // 'free' | 'focus'
  state:             'ready',   // 'ready' | 'running' | 'paused'
  subject:           '',
  startTime:         null,      // Date.now() timestamp of last start/resume
  elapsedSeconds:    0,
  durationSeconds:   0,
  isPaused:          false,
  isSubmitting:      false,
  phase:             'focus',   // 'focus' | 'shortBreak' | 'longBreak'
  round:             1,
  totalRounds:       4,
  remainingSeconds:  25 * 60,
  totalPhaseSeconds: 25 * 60,
};

function broadcastTimerState() {
  const snapshot = { ...sharedTimerState };
  if (mainWindow   && !mainWindow.isDestroyed())   mainWindow.webContents.send('timer-state-update', snapshot);
  if (widgetWindow && !widgetWindow.isDestroyed())  widgetWindow.webContents.send('timer-state-update', snapshot);
  updateTrayMenu();
}

// ---------------------------------------------------------------------------
// IPC — Timer actions
// ---------------------------------------------------------------------------
ipcMain.on('timer-action', (_event, { action, data }) => {
  const now = Date.now();

  switch (action) {

    case 'switch-mode': {
      if (data && data.mode) {
        sharedTimerState.mode = data.mode;
      }
      break;
    }

    case 'skip-break': {
      sharedTimerState.phase = 'focus';
      sharedTimerState.state = 'ready';
      sharedTimerState.startTime = null;
      sharedTimerState.isPaused = false;
      break;
    }

    case 'start': {
      const subject = (data && data.subject) ? data.subject.trim() : sharedTimerState.subject.trim();
      if (!subject) break;
      sharedTimerState.state           = 'running';
      sharedTimerState.subject         = subject;
      sharedTimerState.startTime       = now;
      if (data && typeof data.elapsedSeconds === 'number') {
        sharedTimerState.elapsedSeconds  = data.elapsedSeconds;
        sharedTimerState.durationSeconds = data.elapsedSeconds;
      }
      sharedTimerState.isPaused        = false;
      sharedTimerState.isSubmitting    = false;
      break;
    }

    case 'stop':
    case 'pause': {
      if (sharedTimerState.state !== 'running') break;
      if (sharedTimerState.startTime) {
        sharedTimerState.elapsedSeconds += Math.floor((now - sharedTimerState.startTime) / 1000);
      }
      sharedTimerState.durationSeconds = sharedTimerState.elapsedSeconds;
      sharedTimerState.isPaused        = true;
      sharedTimerState.startTime       = null;
      sharedTimerState.state           = 'paused';
      break;
    }

    case 'resume': {
      if (sharedTimerState.state !== 'paused' && sharedTimerState.state !== 'ready') break;
      sharedTimerState.isPaused  = false;
      sharedTimerState.startTime = now;
      sharedTimerState.state     = 'running';
      break;
    }

    case 'reset': {
      sharedTimerState.state           = 'ready';
      sharedTimerState.subject         = '';
      sharedTimerState.startTime       = null;
      sharedTimerState.elapsedSeconds  = 0;
      sharedTimerState.durationSeconds = 0;
      sharedTimerState.isPaused        = false;
      sharedTimerState.isSubmitting    = false;
      if (sharedTimerState.mode === 'focus') {
        sharedTimerState.phase         = 'focus';
        sharedTimerState.remainingSeconds = sharedTimerState.totalPhaseSeconds || 25 * 60;
      }
      break;
    }

    case 'stop-and-save': {
      let finalElapsed = sharedTimerState.elapsedSeconds;
      if (!sharedTimerState.isPaused && sharedTimerState.startTime) {
        finalElapsed += Math.floor((now - sharedTimerState.startTime) / 1000);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('save-timer-session', {
          subject:         sharedTimerState.subject,
          elapsedSeconds:  finalElapsed,
          durationSeconds: finalElapsed,
        });
      }
      sharedTimerState.state           = 'ready';
      sharedTimerState.subject         = '';
      sharedTimerState.startTime       = null;
      sharedTimerState.elapsedSeconds  = 0;
      sharedTimerState.durationSeconds = 0;
      sharedTimerState.isPaused        = false;
      sharedTimerState.isSubmitting    = false;
      break;
    }

    case 'update-state': {
      if (data) {
        if (data.mode              !== undefined) sharedTimerState.mode = data.mode;
        if (data.timerState        !== undefined) sharedTimerState.state = data.timerState;
        if (data.state             !== undefined) sharedTimerState.state = data.state;
        if (data.subject           !== undefined) sharedTimerState.subject = data.subject;
        if (data.startTime         !== undefined) sharedTimerState.startTime = data.startTime;
        if (data.phase             !== undefined) sharedTimerState.phase = data.phase;
        if (data.round             !== undefined) sharedTimerState.round = data.round;
        if (data.totalRounds       !== undefined) sharedTimerState.totalRounds = data.totalRounds;
        if (data.remainingSeconds  !== undefined) sharedTimerState.remainingSeconds = data.remainingSeconds;
        if (data.totalPhaseSeconds !== undefined) sharedTimerState.totalPhaseSeconds = data.totalPhaseSeconds;
        if (data.elapsedSeconds    !== undefined) {
          sharedTimerState.elapsedSeconds = data.elapsedSeconds;
          sharedTimerState.durationSeconds = data.elapsedSeconds;
        }
        if (data.durationSeconds   !== undefined) {
          sharedTimerState.durationSeconds = data.durationSeconds;
          sharedTimerState.elapsedSeconds = data.durationSeconds;
        }
        sharedTimerState.isPaused = (sharedTimerState.state === 'paused');
        if (data.isSubmitting      !== undefined) sharedTimerState.isSubmitting = data.isSubmitting;
      }
      break;
    }
  }

  broadcastTimerState();
});

ipcMain.on('request-timer-state', (event) => {
  event.reply('timer-state-update', { ...sharedTimerState });
});

// ---------------------------------------------------------------------------
// IPC — Native Desktop Notifications
// ---------------------------------------------------------------------------
ipcMain.on('show-notification', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Study Time Tracker',
      body:  body || '',
      icon:  getAppIconPath(),
    }).show();
  }
});

// ---------------------------------------------------------------------------
// IPC — Widget Window Lifecycle
// ---------------------------------------------------------------------------
ipcMain.on('open-floating-widget', () => {
  openWidgetWindow();
});

ipcMain.on('close-floating-widget', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    saveWidgetBounds(widgetWindow.getBounds());
    widgetWindow.hide();
  }
});

ipcMain.on('focus-main-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

// ---------------------------------------------------------------------------
// IPC — Widget Bounds Persistence
// ---------------------------------------------------------------------------
ipcMain.on('save-widget-bounds', (_event, bounds) => {
  saveWidgetBounds(bounds);
});

ipcMain.handle('load-widget-bounds', () => {
  return loadWidgetBounds();
});

// ---------------------------------------------------------------------------
// Create / Show Floating Widget Window
// ---------------------------------------------------------------------------
function openWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show();
    widgetWindow.focus();
    return;
  }

  const saved  = loadWidgetBounds();
  const bounds = {
    x:      saved ? saved.x : undefined,
    y:      saved ? saved.y : undefined,
    width:  saved ? Math.max(220, saved.width)  : 260,
    height: saved ? Math.max(160, saved.height) : 195,
  };

  widgetWindow = new BrowserWindow({
    x:               bounds.x,
    y:               bounds.y,
    width:           bounds.width,
    height:          bounds.height,
    minWidth:        220,
    minHeight:       160,
    frame:           false,
    transparent:     false,
    alwaysOnTop:     true,
    resizable:       true,
    skipTaskbar:     true,
    backgroundColor: '#121316',
    icon:            getAppIconPath(),
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          join(__dirname, 'preload.js'),
    },
  });

  widgetWindow.loadFile('floating-timer.html');
  widgetWindow.setAlwaysOnTop(true, 'floating');

  widgetWindow.webContents.once('did-finish-load', () => {
    widgetWindow.webContents.send('timer-state-update', { ...sharedTimerState });
  });

  widgetWindow.on('moved',   () => { if (!widgetWindow.isDestroyed()) saveWidgetBounds(widgetWindow.getBounds()); });
  widgetWindow.on('resized', () => { if (!widgetWindow.isDestroyed()) saveWidgetBounds(widgetWindow.getBounds()); });

  widgetWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      saveWidgetBounds(widgetWindow.getBounds());
      widgetWindow.hide();
    }
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });

  if (isDev) widgetWindow.webContents.openDevTools({ mode: 'detach' });
}

// ---------------------------------------------------------------------------
// Create Main Application Window
// ---------------------------------------------------------------------------
function createMainWindow() {
  const savedState = loadWindowState();

  mainWindow = new BrowserWindow({
    x:      savedState ? savedState.x : undefined,
    y:      savedState ? savedState.y : undefined,
    width:  savedState ? Math.max(1000, savedState.width) : 1400,
    height: savedState ? Math.max(700, savedState.height) : 900,
    title:  'Study Time Tracker',
    icon:   getAppIconPath(),
    show:   false,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          join(__dirname, 'preload.js'),
    },
  });

  mainWindow.on('moved',   () => { if (!mainWindow.isDestroyed()) saveWindowState(mainWindow.getBounds()); });
  mainWindow.on('resized', () => { if (!mainWindow.isDestroyed()) saveWindowState(mainWindow.getBounds()); });

  const targetUrl = `http://localhost:${actualPort}`;
  console.log(`[electron-main] Loading target URL: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    buildAppMenu();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// System Tray Integration
// ---------------------------------------------------------------------------
function createTray() {
  if (appTray) return;
  const iconPath = getAppIconPath();
  if (!iconPath) return;

  try {
    appTray = new Tray(iconPath);
    appTray.setToolTip('Study Time Tracker');

    appTray.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else {
        createMainWindow();
      }
    });

    appTray.on('double-click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else {
        createMainWindow();
      }
    });

    updateTrayMenu();
  } catch (err) {
    console.warn('[electron-main] Could not create system tray:', err.message);
  }
}

function updateTrayMenu() {
  if (!appTray) return;

  const isRunning = sharedTimerState.state === 'running' && !sharedTimerState.isPaused;
  const timerLabel = isRunning ? '⏸ Pause Timer' : '▶ Start / Resume Timer';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Study Tracker',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      },
    },
    {
      label: 'Show / Hide Timer Widget',
      click: () => {
        if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
          saveWidgetBounds(widgetWindow.getBounds());
          widgetWindow.hide();
        } else {
          openWidgetWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: timerLabel,
      click: () => {
        if (isRunning) {
          ipcMain.emit('timer-action', null, { action: 'pause' });
        } else {
          ipcMain.emit('timer-action', null, { action: 'resume' });
        }
      },
    },
    {
      label: '↺ Reset Timer',
      click: () => {
        ipcMain.emit('timer-action', null, { action: 'reset' });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Study Tracker',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  appTray.setContextMenu(contextMenu);
}

// ---------------------------------------------------------------------------
// Application Menu
// ---------------------------------------------------------------------------
function buildAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ label: app.getName(), submenu: [
      { role: 'about' }, { type: 'separator' },
      { role: 'services' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
      { type: 'separator' }, { role: 'quit' }
    ]}] : []),

    { label: 'File', submenu: [
      {
        label: 'Quit Study Tracker',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]},

    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      { role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }
    ]},

    { label: 'View', submenu: [
      {
        label:       'Show Timer Widget',
        accelerator: 'CmdOrCtrl+T',
        click:       () => openWidgetWindow(),
      },
      {
        label:       'Hide Timer Widget',
        accelerator: 'CmdOrCtrl+Shift+T',
        click:       () => {
          if (widgetWindow && !widgetWindow.isDestroyed()) {
            saveWidgetBounds(widgetWindow.getBounds());
            widgetWindow.hide();
          }
        },
      },
      { type: 'separator' },
      { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' }, { role: 'togglefullscreen' },
    ]},

    { label: 'Window', submenu: [
      { role: 'minimize' }, { role: 'close' },
      ...(isMac ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }] : []),
    ]},
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------
// Dynamic Port & Health Probing
// ---------------------------------------------------------------------------
function resolveEnvPath() {
  if (app.isPackaged) return join(dirname(app.getPath('exe')), '.env');
  return join(__dirname, '.env');
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port, '127.0.0.1');
  });
}

function findOpenPort(startPort) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function checkAppHealth(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          resolve(json && json.app === 'study-time-tracker');
        } catch (_) {
          resolve(false);
        }
      });
    }).on('error', () => resolve(false));
  });
}

function waitForServer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      http.get(url, (res) => { res.resume(); resolve(); })
        .on('error', () => {
          if (Date.now() >= deadline) reject(new Error(`Server not ready within ${timeoutMs}ms`));
          else setTimeout(check, 150);
        });
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Start In-Process Server with Dynamic Port
// ---------------------------------------------------------------------------
async function startServer() {
  const desiredPort = parseInt(process.env.PORT || '3000', 10);

  // 1. Check if an existing Study Time Tracker is already responding on desiredPort
  const isSelfRunning = await checkAppHealth(`http://127.0.0.1:${desiredPort}/api/health`);
  if (isSelfRunning) {
    actualPort = desiredPort;
    console.log(`[electron-main] Attaching to existing Study Time Tracker backend on port ${actualPort}`);
    return;
  }

  // 2. Check if desiredPort is free to bind
  const desiredAvailable = await isPortAvailable(desiredPort);
  if (desiredAvailable) {
    actualPort = desiredPort;
  } else {
    // Dynamically find another open port to avoid conflict
    actualPort = await findOpenPort(desiredPort + 1);
    console.log(`[electron-main] Port ${desiredPort} occupied. Selected dynamic port: ${actualPort}`);
  }

  process.env.PORT = String(actualPort);
  process.env.ELECTRON_ENV_PATH = resolveEnvPath();

  const serverUrl = `http://127.0.0.1:${actualPort}`;
  const serverModule = new URL('./server.js', import.meta.url).href;
  console.log(`[electron-main] Starting in-process server on port ${actualPort}`);

  serverModuleInstance = await import(serverModule);

  // Wait for server ready promise from server.js
  if (serverModuleInstance.serverReadyPromise) {
    await serverModuleInstance.serverReadyPromise;
  } else {
    await waitForServer(serverUrl);
  }

  console.log(`[electron-main] Express & MongoDB ready on port ${actualPort}`);
}

// ---------------------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  try {
    await startServer();
    createTray();
    createMainWindow();
  } catch (err) {
    console.error('Fatal startup error:', err.message);
    await dialog.showErrorBox(
      'Study Time Tracker – Database Connection Required',
      `Could not start the Study Time Tracker.\n\n` +
      `Error: ${err.message}\n\n` +
      `Please ensure:\n` +
      `  1. MongoDB Community Server is installed on your computer.\n` +
      `  2. The MongoDB service is running (e.g. run "net start MongoDB" in PowerShell).\n` +
      `  3. Or configure a custom cloud connection in a .env file:\n` +
      `     MONGODB_URI=mongodb://localhost:27017/study_tracker`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('before-quit', async (e) => {
  isQuitting = true;
  console.log('[electron-main] Application shutting down...');
  if (serverModuleInstance && typeof serverModuleInstance.stopServer === 'function') {
    try {
      await serverModuleInstance.stopServer();
      console.log('[electron-main] Server stopped cleanly.');
    } catch (err) {
      console.warn('[electron-main] Error stopping server:', err.message);
    }
  }
});
