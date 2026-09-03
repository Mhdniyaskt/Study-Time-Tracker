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
 *
 * Development:   npm run electron-dev   (shows console, --dev flag)
 * Production:    npm run electron        (no console window)
 * Build:         npm run dist            (NSIS installer)
 */

import { app, BrowserWindow, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const PORT = process.env.PORT || 3000;
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

let mainWindow = null;

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
    },
    show: false, // prevent white flash before content loads
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
