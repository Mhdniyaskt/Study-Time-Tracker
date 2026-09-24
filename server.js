import dotenv from "dotenv";
import express from "express";
import { initDatabase, closeDatabase } from "./models/db.js";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import apiRoutes from "./routes/api.js";
import { saveTimerSession } from "./controllers/studyController.js";

// Get the directory where the executable or script is located.
const __appDir = (typeof __dirname !== 'undefined')
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

// Determine if we're running from a packaged executable
const isPackaged = process.pkg !== undefined;

// Determine if we're running inside Electron
const isElectron = process.versions && process.versions.electron !== undefined;

// Load .env — priority order:
//   1. ELECTRON_ENV_PATH injected by electron-main.js (packaged Electron)
//   2. process.cwd()/.env when running as a pkg-packaged executable
//   3. Project root when running normally with `node server.js`
const envPath = process.env.ELECTRON_ENV_PATH
  ? process.env.ELECTRON_ENV_PATH
  : isPackaged
    ? join(process.cwd(), '.env')
    : join(__appDir, '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Opens the default browser to the specified URL
 * Works on Windows, macOS, and Linux
 */
function openBrowser(url) {
  let command;
  let options = {};

  if (process.platform === 'win32') {
    command = `cmd.exe /c start "" "${url}"`;
    options = { shell: true, windowsHide: true };
  } else if (process.platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, options, (error) => {
    if (error) {
      console.log(`Browser not auto-opened. Please visit: ${url}`);
    } else {
      console.log(`✓ Browser opened to ${url}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ---------------------------------------------------------------------------
// REST API & Legacy Timer Routes
// ---------------------------------------------------------------------------
app.use("/api", apiRoutes);

// Keep /timer/save backward compatibility for timer widget / legacy calls
app.post("/timer/save", saveTimerSession);

// ---------------------------------------------------------------------------
// React Frontend Static Serving (Production Build)
// ---------------------------------------------------------------------------
const reactDistPath = join(__appDir, "dist-react");
const hasReactBuild = existsSync(reactDistPath);

if (hasReactBuild) {
  app.use(express.static(reactDistPath));

  // SPA fallback: return index.html for all non-API GET requests
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/") && !req.path.startsWith("/timer/")) {
      return res.sendFile(join(reactDistPath, "index.html"));
    }
    next();
  });
} else {
  // If React has not been built yet, inform the user
  app.get("/", (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Study Time Tracker</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f8fafc;">
          <h2>React frontend build not found</h2>
          <p>Please run <code>npm run build:react</code> to generate the production bundle.</p>
        </body>
      </html>
    `);
  });
}

// ---------------------------------------------------------------------------
// 404 Handler for unhandled routes
// ---------------------------------------------------------------------------
app.use((req, res) => {
  console.warn("404 - Route not found:", req.method, req.url);
  res.status(404).json({ success: false, error: "Route not found" });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  if (isDevelopment) {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = isDevelopment
    ? err.message
    : "We're sorry, but something went wrong. Please try again later.";

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDevelopment && { stack: err.stack }),
  });
});

// ---------------------------------------------------------------------------
// Embedded Local Database Initialization & Startup
// ---------------------------------------------------------------------------
// Log startup information
console.log("=".repeat(60));
console.log("Study Time Tracker - Starting...");
console.log("=".repeat(60));
if (isPackaged) {
  console.log("Running from: Packaged executable");
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Loading .env from: ${envPath}`);
} else {
  console.log("Running from: Development (node)");
}
console.log("=".repeat(60));

let httpServer = null;

export async function stopServer() {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await closeDatabase();
}

// Initialize embedded database, then start HTTP server
export const serverReadyPromise = initDatabase()
  .then(() => {
    return new Promise((resolve, reject) => {
      httpServer = app.listen(PORT, (err) => {
        if (err) return reject(err);
        const serverUrl = `http://localhost:${PORT}`;
        console.log(`Server running at ${serverUrl}`);
        console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);

        // Auto-open browser after server is ready (but not when running in Electron)
        if (!isElectron) {
          console.log("Opening browser...");
          openBrowser(serverUrl);
        } else {
          console.log("Running inside Electron - browser launch skipped");
        }
        resolve(httpServer);
      });
    });
  })
  .catch((err) => {
    console.error("❌ Database initialization failed:", err.message);
    if (!isElectron) {
      process.exit(1);
    }
    throw err;
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server gracefully...');
  await stopServer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Closing server gracefully...');
  await stopServer();
  process.exit(0);
});

export { app, httpServer };
