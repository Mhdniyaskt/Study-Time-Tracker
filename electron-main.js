/**
 * Electron Main Process
 *
 * Architecture:
 *   Electron main process
 *     └─ dynamic import('./server.js')      ← Express + MongoDB, same process
 *     └─ mainWindow      BrowserWindow      ← http://localhost:3000
 *     └─ widgetWindow    BrowserWindow      ← floating-timer.html
 *                                              frameless · alwaysOnTop · resizable
 *                                              survives main-window minimize
 *                                              position/size persisted via JSON file
 *
 * IPC channels (renderer → main):
 *   open-floating-widget   show/create the widget
 *   close-floating-widget  hide the widget (does NOT touch timer state)
 *   focus-main-window      un-minimize + focus the main window
 *   timer-action           start | stop | pause | resume | reset | stop-and-save | update-state
 *   request-timer-state    main replies with current sharedTimerState
 *   save-widget-bounds     persist { x, y, width, height }
 *   load-widget-bounds     (invoke) return saved bounds or null
 *   minimize-window        minimize the main window
 *
 * IPC channels (main → renderer):
 *   timer-state-update     broadcast sharedTimerState to all windows
 *   save-timer-session     ask dashboard to POST /timer/save
 */

import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { fileURLToPath }  from 'url';
import { dirname, join }  from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const PORT  = process.env.PORT || 3000;
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

// ---------------------------------------------------------------------------
// Window references
// ---------------------------------------------------------------------------
let mainWindow   = null;
let widgetWindow = null;

// ---------------------------------------------------------------------------
// Widget bounds persistence
// We store bounds next to the user-data directory so they survive updates.
// ---------------------------------------------------------------------------
function boundsFilePath() {
  const dir = app.getPath('userData');
  return join(dir, 'widget-bounds.json');
}

function loadWidgetBounds() {
  try {
    const p = boundsFilePath();
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8'));
    }
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

// ---------------------------------------------------------------------------
// Shared timer state — single source of truth for both windows
// ---------------------------------------------------------------------------
let sharedTimerState = {
  state:          'ready',   // 'ready' | 'running' | 'paused'
  subject:        '',
  startTime:      null,      // Date.now() timestamp of last start/resume
  elapsedSeconds: 0,
  isPaused:       false
};

function broadcastTimerState() {
  const snapshot = { ...sharedTimerState };
  if (mainWindow   && !mainWindow.isDestroyed())   mainWindow.webContents.send('timer-state-update', snapshot);
  if (widgetWindow && !widgetWindow.isDestroyed())  widgetWindow.webContents.send('timer-state-update', snapshot);
}

// ---------------------------------------------------------------------------
// IPC — timer actions
// ---------------------------------------------------------------------------
ipcMain.on('timer-action', (_event, { action, data }) => {
  const now = Date.now();

  switch (action) {

    case 'start':
      if (sharedTimerState.state !== 'ready') break;
      sharedTimerState.state          = 'running';
      sharedTimerState.subject        = (data && data.subject) ? data.subject : '';
      sharedTimerState.startTime      = now;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.isPaused       = false;
      break;

    case 'stop':   // pause (the main-window "Stop" button toggles pause/resume)
      if (sharedTimerState.state !== 'running') break;
      if (!sharedTimerState.isPaused && sharedTimerState.startTime) {
        sharedTimerState.elapsedSeconds += Math.floor((now - sharedTimerState.startTime) / 1000);
      }
      sharedTimerState.isPaused  = true;
      sharedTimerState.startTime = null;
      // Map to 'paused' so the widget can render the right buttons
      sharedTimerState.state = 'paused';
      break;

    case 'pause':
      if (sharedTimerState.state !== 'running' || sharedTimerState.isPaused) break;
      if (sharedTimerState.startTime) {
        sharedTimerState.elapsedSeconds += Math.floor((now - sharedTimerState.startTime) / 1000);
      }
      sharedTimerState.isPaused  = true;
      sharedTimerState.startTime = null;
      sharedTimerState.state     = 'paused';
      break;

    case 'resume':
      if (sharedTimerState.state !== 'paused') break;
      sharedTimerState.isPaused  = false;
      sharedTimerState.startTime = now;
      sharedTimerState.state     = 'running';
      break;

    case 'reset':
      sharedTimerState.state          = 'ready';
      sharedTimerState.subject        = '';
      sharedTimerState.startTime      = null;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.isPaused       = false;
      break;

    case 'stop-and-save': {
      // Compute final elapsed
      let finalElapsed = sharedTimerState.elapsedSeconds;
      if (!sharedTimerState.isPaused && sharedTimerState.startTime) {
        finalElapsed += Math.floor((now - sharedTimerState.startTime) / 1000);
      }
      // Ask the dashboard renderer to call /timer/save (it has the cookie session)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('save-timer-session', {
          subject:        sharedTimerState.subject,
          elapsedSeconds: finalElapsed
        });
      }
      // Reset immediately; the dashboard will reload on success
      sharedTimerState.state          = 'ready';
      sharedTimerState.subject        = '';
      sharedTimerState.startTime      = null;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.isPaused       = false;
      break;
    }

    case 'update-state':
      // Dashboard syncs its localStorage state into the shared state
      if (data) {
        // Map localStorage timerState ('running'/'paused'/'ready') to sharedTimerState
        if (data.timerState !== undefined) sharedTimerState.state          = data.timerState;
        if (data.state      !== undefined) sharedTimerState.state          = data.state;
        if (data.subject    !== undefined) sharedTimerState.subject        = data.subject;
        if (data.startTime  !== undefined) sharedTimerState.startTime      = data.startTime;
        if (data.elapsedSeconds !== undefined) sharedTimerState.elapsedSeconds = data.elapsedSeconds;
        // Derive isPaused from state when not explicitly provided
        sharedTimerState.isPaused = (sharedTimerState.state === 'paused');
      }
      break;
  }

  broadcastTimerState();
});

ipcMain.on('request-timer-state', (event) => {
  event.reply('timer-state-update', { ...sharedTimerState });
});

// ---------------------------------------------------------------------------
// IPC — widget window lifecycle
// ---------------------------------------------------------------------------
ipcMain.on('open-floating-widget', () => {
  openWidgetWindow();
});

ipcMain.on('close-floating-widget', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    // Save current bounds before hiding
    saveWidgetBounds(widgetWindow.getBounds());
    widgetWindow.hide();
  }
});

ipcMain.on('focus-main-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

// ---------------------------------------------------------------------------
// IPC — widget bounds persistence (invoke = returns a value)
// ---------------------------------------------------------------------------
ipcMain.on('save-widget-bounds', (_event, bounds) => {
  saveWidgetBounds(bounds);
});

ipcMain.handle('load-widget-bounds', () => {
  return loadWidgetBounds();
});

// ---------------------------------------------------------------------------
// Create / show the floating widget window
// ---------------------------------------------------------------------------
function openWidgetWindow() {
  // If the window already exists, just show + focus it
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show();
    widgetWindow.focus();
    return;
  }

  // Restore last known bounds, fall back to sensible defaults
  const saved   = loadWidgetBounds();
  const bounds  = {
    x:      saved ? saved.x      : undefined,   // undefined → Electron centres it
    y:      saved ? saved.y      : undefined,
    width:  saved ? Math.max(220, saved.width)  : 260,
    height: saved ? Math.max(180, saved.height) : 230,
  };

  widgetWindow = new BrowserWindow({
    x:               bounds.x,
    y:               bounds.y,
    width:           bounds.width,
    height:          bounds.height,
    minWidth:        200,
    minHeight:       170,
    frame:           false,          // no OS titlebar — we draw our own
    transparent:     false,
    alwaysOnTop:     true,           // stays above every other window
    resizable:       true,           // user can resize
    skipTaskbar:     true,           // no taskbar entry
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          join(__dirname, 'preload.js'),
    },
  });

  widgetWindow.loadFile('floating-timer.html');

  // Keep alwaysOnTop even when the main window is focused
  widgetWindow.setAlwaysOnTop(true, 'floating');

  // Send current timer state as soon as the widget is ready
  widgetWindow.webContents.once('did-finish-load', () => {
    widgetWindow.webContents.send('timer-state-update', { ...sharedTimerState });
  });

  // Persist bounds whenever the user moves or resizes the widget
  widgetWindow.on('moved',   () => { if (!widgetWindow.isDestroyed()) saveWidgetBounds(widgetWindow.getBounds()); });
  widgetWindow.on('resized', () => { if (!widgetWindow.isDestroyed()) saveWidgetBounds(widgetWindow.getBounds()); });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });

  if (isDev) widgetWindow.webContents.openDevTools({ mode: 'detach' });
}

// ---------------------------------------------------------------------------
// Create the main application window
// ---------------------------------------------------------------------------
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    show:   false,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    buildAppMenu();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Application menu
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

    { label: 'File', submenu: [ isMac ? { role: 'close' } : { role: 'quit' } ] },

    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      ...( isMac ? [
        { role: 'pasteAndMatchStyle' }, { role: 'delete' },
        { role: 'selectAll' }, { type: 'separator' },
        { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
      ] : [ { role: 'delete' }, { type: 'separator' }, { role: 'selectAll' } ])
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
// Env path helper (packaged vs dev)
// ---------------------------------------------------------------------------
function resolveEnvPath() {
  if (app.isPackaged) return join(dirname(app.getPath('exe')), '.env');
  return join(__dirname, '.env');
}

// ---------------------------------------------------------------------------
// Probe whether Express is already listening on PORT (e.g. `npm run dev`)
// ---------------------------------------------------------------------------
function isServerAlreadyRunning(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => { res.resume(); resolve(true); })
        .on('error', () => resolve(false));
  });
}

// ---------------------------------------------------------------------------
// Wait for Express to become ready (used after in-process start)
// ---------------------------------------------------------------------------
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
// Start Express in-process OR attach to an already-running server
// ---------------------------------------------------------------------------
async function startServer() {
  const serverUrl = `http://localhost:${PORT}`;

  // Guard: if a server is already answering on this port (e.g. `npm run dev`
  // is running in another terminal), skip the in-process import entirely.
  // This prevents EADDRINUSE crashes and lets Electron work alongside nodemon.
  const alreadyUp = await isServerAlreadyRunning(serverUrl);
  if (alreadyUp) {
    console.log(`[electron-main] Server already running on port ${PORT} — skipping in-process start.`);
    return;
  }

  // No server yet — start Express inside this Electron process.
  process.env.ELECTRON_ENV_PATH = resolveEnvPath();
  const serverModule = new URL('./server.js', import.meta.url).href;
  console.log(`[electron-main] Starting in-process server: ${serverModule}`);
  await import(serverModule);
  await waitForServer(serverUrl);
  console.log(`[electron-main] Express ready on port ${PORT}`);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  try {
    await startServer();
    createMainWindow();
  } catch (err) {
    console.error('Fatal startup error:', err.message);
    await dialog.showErrorBox(
      'Study Time Tracker – Startup Error',
      `The application could not start.\n\n${err.message}\n\n` +
      `Please make sure:\n` +
      `  • MongoDB is installed and running\n` +
      `  • A .env file exists with MONGODB_URI set\n\n` +
      `Example:\n  MONGODB_URI=mongodb://localhost:27017/studytracker`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('before-quit', () => {
  console.log('Application closing…');
});
