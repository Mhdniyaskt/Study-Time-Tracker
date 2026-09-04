/**
 * Electron Main Process
 *
 * Loads the existing Express server IN-PROCESS using Electron's bundled
 * Node.js runtime. No external `node` binary is required — the packaged
 * application is fully self-contained.
 *
 * Architecture:
 *   Electron main process
 *     └─ dynamic import('./server.js')   <── Express starts here, same process
 *     └─ BrowserWindow → http://localhost:3000
 *     └─ Floating Timer Widget (frameless, always-on-top)
 *     └─ Shared Timer State (IPC communication)
 *
 * Development:   npm run electron-dev   (shows console, --dev flag)
 * Production:    npm run electron        (no console window)
 * Build:         npm run dist            (NSIS installer)
 */

import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const PORT = process.env.PORT || 3000;
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

let mainWindow = null;
let floatingTimerWindow = null;

// ---------------------------------------------------------------------------
// Shared Timer State - Single source of truth
// ---------------------------------------------------------------------------
let sharedTimerState = {
  state: 'ready',        // 'ready' | 'running' | 'stopped'
  subject: '',
  startTime: null,
  elapsedSeconds: 0,
  isPaused: false
};

function broadcastTimerState() {
  const state = { ...sharedTimerState };
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('timer-state-update', state);
  }
  
  if (floatingTimerWindow && !floatingTimerWindow.isDestroyed()) {
    floatingTimerWindow.webContents.send('timer-state-update', state);
  }
}

// ---------------------------------------------------------------------------
// IPC Handlers for Timer Actions
// ---------------------------------------------------------------------------
ipcMain.on('timer-action', (event, { action, data }) => {
  const now = Date.now();
  
  switch (action) {
    case 'start':
      if (sharedTimerState.state !== 'ready') break;
      sharedTimerState.state = 'running';
      sharedTimerState.subject = data.subject || '';
      sharedTimerState.startTime = now;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.isPaused = false;
      break;
      
    case 'stop':
      if (sharedTimerState.state !== 'running') break;
      // Calculate final elapsed time
      if (!sharedTimerState.isPaused && sharedTimerState.startTime) {
        const additionalSeconds = Math.floor((now - sharedTimerState.startTime) / 1000);
        sharedTimerState.elapsedSeconds += additionalSeconds;
      }
      sharedTimerState.state = 'stopped';
      sharedTimerState.startTime = null;
      sharedTimerState.isPaused = false;
      break;
      
    case 'reset':
      sharedTimerState.state = 'ready';
      sharedTimerState.subject = '';
      sharedTimerState.startTime = null;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.isPaused = false;
      break;
      
    case 'pause':
      if (sharedTimerState.state !== 'running' || sharedTimerState.isPaused) break;
      // Accumulate elapsed time before pausing
      if (sharedTimerState.startTime) {
        const additionalSeconds = Math.floor((now - sharedTimerState.startTime) / 1000);
        sharedTimerState.elapsedSeconds += additionalSeconds;
      }
      sharedTimerState.isPaused = true;
      sharedTimerState.startTime = null;
      break;
      
    case 'resume':
      if (sharedTimerState.state !== 'running' || !sharedTimerState.isPaused) break;
      sharedTimerState.isPaused = false;
      sharedTimerState.startTime = now;
      break;
      
    case 'stop-and-save':
      if (sharedTimerState.state !== 'running') break;
      // Calculate final elapsed time
      let finalElapsed = sharedTimerState.elapsedSeconds;
      if (!sharedTimerState.isPaused && sharedTimerState.startTime) {
        const additionalSeconds = Math.floor((now - sharedTimerState.startTime) / 1000);
        finalElapsed += additionalSeconds;
      }
      
      // Send save request to main window (which has access to the Express server)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('save-timer-session', {
          subject: sharedTimerState.subject,
          elapsedSeconds: finalElapsed
        });
      }
      
      // Reset timer state after save
      sharedTimerState.state = 'ready';
      sharedTimerState.subject = '';
      sharedTimerState.startTime = null;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.isPaused = false;
      break;
      
    case 'update-state':
      // Allow main window to update the shared state
      if (data) {
        sharedTimerState = { ...sharedTimerState, ...data };
      }
      break;
  }
  
  broadcastTimerState();
});

ipcMain.on('request-timer-state', (event) => {
  event.reply('timer-state-update', sharedTimerState);
});

ipcMain.on('close-floating-widget', () => {
  if (floatingTimerWindow && !floatingTimerWindow.isDestroyed()) {
    floatingTimerWindow.hide();
  }
});

// ---------------------------------------------------------------------------
// Resolve the correct .env path for the packaged app.
//
// When electron-builder packs the app into an asar, __dirname inside the
// asar is something like:  C:\…\resources\app.asar
// process.resourcesPath is: C:\…\resources
//
// We want to find the .env file next to the executable, which lives at:
//   app.getPath('exe') → C:\…\Study Time Tracker.exe
// So the sibling directory is: dirname(app.getPath('exe'))
// ---------------------------------------------------------------------------
function resolveEnvPath() {
  if (app.isPackaged) {
    // Installed app: .env sits beside the .exe
    return join(dirname(app.getPath('exe')), '.env');
  }
  // Development: .env is in the project root
  return join(__dirname, '.env');
}

// ---------------------------------------------------------------------------
// Poll localhost until the Express server responds, then resolve.
// ---------------------------------------------------------------------------
function waitForServer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const check = () => {
      http.get(url, (res) => {
        // Any HTTP response means the server is up
        res.resume(); // discard body
        resolve();
      }).on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Server did not become ready within ${timeoutMs}ms`));
        } else {
          setTimeout(check, 150);
        }
      });
    };

    check();
  });
}

// ---------------------------------------------------------------------------
// Start the Express server by importing server.js IN-PROCESS.
//
// Because server.js is an ES module that calls mongoose.connect() +
// app.listen() as top-level side-effects, a dynamic import() is all that's
// needed to start it.  Electron's own Node.js runtime executes it —
// no external `node` binary is involved.
// ---------------------------------------------------------------------------
async function startServer() {
  // Inject the correct .env path so server.js picks up the right file
  // regardless of the working directory at runtime.
  process.env.ELECTRON_ENV_PATH = resolveEnvPath();

  // In the packaged asar the path to server.js is relative to this file.
  const serverModule = new URL('./server.js', import.meta.url).href;

  console.log(`Loading server module: ${serverModule}`);
  await import(serverModule);

  // Give app.listen() time to bind, then confirm the port is open.
  await waitForServer(`http://localhost:${PORT}`);
  console.log(`Express server ready on port ${PORT}`);
}

// ---------------------------------------------------------------------------
// Create the desktop window
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    show: false, // prevent white flash before content loads
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Wait for the window to be ready, then create the menu
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Create application menu after window is ready
    createApplicationMenu();
  });
}

// ---------------------------------------------------------------------------
// Create floating timer widget window
// ---------------------------------------------------------------------------
function createFloatingTimerWindow() {
  if (floatingTimerWindow && !floatingTimerWindow.isDestroyed()) {
    floatingTimerWindow.show();
    floatingTimerWindow.focus();
    return;
  }
  
  floatingTimerWindow = new BrowserWindow({
    width: 280,
    height: 220,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a1a'
  });
  
  // Load the floating timer HTML
  floatingTimerWindow.loadFile('floating-timer.html');
  
  floatingTimerWindow.on('closed', () => {
    floatingTimerWindow = null;
  });
  
  // Send initial state
  floatingTimerWindow.webContents.once('did-finish-load', () => {
    floatingTimerWindow.webContents.send('timer-state-update', sharedTimerState);
  });
}

// ---------------------------------------------------------------------------
// Create application menu
// ---------------------------------------------------------------------------
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // App menu (macOS) or File menu (Windows/Linux)
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    
    {
      label: 'File',
      submenu: [
        ...(isMac ? [
          { role: 'close' }
        ] : [
          { role: 'quit' }
        ])
      ]
    },
    
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    
    {
      label: 'View',
      submenu: [
        {
          label: 'Show Floating Timer',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            createFloatingTimerWindow();
          }
        },
        {
          label: 'Hide Floating Timer',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            if (floatingTimerWindow && !floatingTimerWindow.isDestroyed()) {
              floatingTimerWindow.hide();
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    console.error('Fatal: could not start application:', err.message);

    // Show a user-friendly error dialog before quitting
    await dialog.showErrorBox(
      'Study Time Tracker – Startup Error',
      `The application could not start.\n\n${err.message}\n\nPlease make sure:\n` +
      `  • MongoDB is installed and running\n` +
      `  • A .env file exists beside the application with MONGODB_URI set\n\n` +
      `Example .env content:\n  MONGODB_URI=mongodb://localhost:27017/studytracker`
    );

    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ---------------------------------------------------------------------------
// In-process server means no child process to kill — mongoose and the
// HTTP server share this process.  app.quit() triggers Electron's own
// shutdown sequence, which ends the process cleanly.
// ---------------------------------------------------------------------------
app.on('before-quit', () => {
  console.log('Application closing…');
});

