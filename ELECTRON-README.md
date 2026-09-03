# Study Time Tracker - Electron Desktop Application

Your Study Time Tracker now has a desktop application version using Electron! This wraps your existing Express server in a native desktop window.

## 🎯 What Changed

**Nothing was rewritten!** Your existing application remains exactly the same:
- ✅ Express server unchanged
- ✅ MongoDB/Mongoose logic unchanged
- ✅ EJS views unchanged
- ✅ All routes unchanged
- ✅ UI unchanged
- ✅ `npm start` still works as before

**What was added:**
- ➕ Electron wrapper (`electron-main.js`)
- ➕ New npm scripts for desktop app
- ➕ Smart browser detection (won't open browser when running in Electron)

## 📦 Installation

Electron has already been installed as a dev dependency:
```bash
npm install
```

## 🚀 Running the Application

### Option 1: Web Version (Original)
```bash
npm start
```
- Starts Express server on http://localhost:3000
- Opens your default browser automatically
- Perfect for development and web deployment

### Option 2: Desktop Version
```bash
npm run electron
```
- Starts Express server internally
- Opens a desktop application window
- No browser window opens
- The desktop window IS your application

### Option 3: Development Mode (Recommended for testing)
```bash
npm run electron-dev
```
- Same as `npm run electron` but with dev tools enabled
- Use this when testing the desktop app before packaging

## 🔧 How It Works

1. **Electron starts** → Reads `electron-main.js`
2. **Server launches** → Spawns `node server.js` as a child process
3. **Wait for ready** → Polls http://localhost:3000 until server responds
4. **Window opens** → Creates BrowserWindow pointing to localhost:3000
5. **App runs** → Your Express app displays in the desktop window

When you close the window:
- Electron automatically stops the Express server
- MongoDB connection closes gracefully
- Clean shutdown

## 📝 Key Files

### `electron-main.js` (NEW)
The Electron main process:
- Starts your Express server
- Creates the application window
- Manages lifecycle (startup/shutdown)
- Handles server process cleanup

### `server.js` (MODIFIED - minimal)
Only one change:
```javascript
// Added detection for Electron
const isElectron = process.versions && process.versions.electron !== undefined;

// Modified browser auto-open
if (!isElectron) {
  openBrowser(serverUrl);  // Only opens browser if NOT in Electron
}
```

### `package.json` (MODIFIED)
Added scripts:
- `"electron": "electron ."` - Run desktop app
- `"electron-dev": "electron . --dev"` - Run with dev tools
- Changed `"main"` from `"server.js"` to `"electron-main.js"`

## 🎨 Desktop Window Settings

Default window size: 1400x900 pixels

To customize, edit `electron-main.js`:
```javascript
const mainWindow = new BrowserWindow({
  width: 1400,        // Change width
  height: 900,        // Change height
  // ... other options
});
```

## 🐛 Troubleshooting

### Desktop app window is blank
- Check if MongoDB is running
- Check if port 3000 is available
- Look at the terminal for server errors

### Server won't start
- Make sure `.env` file exists with valid `MONGODB_URI`
- Verify MongoDB is running
- Check if another process is using port 3000

### Changes don't appear
- Stop the Electron app completely
- Restart with `npm run electron`
- Remember: you're still editing the same Express app

## 🔒 MongoDB Connection

The desktop app uses the **exact same** MongoDB connection as the web version:
- Reads from `.env` file
- Uses same `MONGODB_URI`
- No configuration changes needed

## ⚙️ Environment Variables

The Electron app loads environment variables from `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/studytracker
PORT=3000
NODE_ENV=development
```

## 🚦 Next Steps

### Testing the Desktop App
1. Run: `npm run electron-dev`
2. Test all features (add session, edit, delete, statistics)
3. Check MongoDB data persistence
4. Verify charts and UI work correctly

### Preparing for Packaging (Future)
To create a standalone `.exe` file:
- Use `electron-builder` or `electron-packager`
- Bundle Node.js runtime
- Include MongoDB connection (user must have MongoDB running)
- Create installer

## 💡 Tips

- **Use `npm start`** when developing server-side code (faster restart)
- **Use `npm run electron-dev`** when testing desktop-specific features
- **Both versions** use the same database, so data is always in sync
- **Ctrl+C** in terminal stops the server (web) or use window close (desktop)

## ❓ Common Questions

**Q: Can I still deploy as a web app?**  
A: Yes! Run `npm start` and deploy as normal. Electron is only for desktop.

**Q: Do I need two separate codebases?**  
A: No! It's the same code. Electron just wraps it in a window.

**Q: Will my MongoDB data work in both?**  
A: Yes! Both versions connect to the same MongoDB instance.

**Q: Can users run this without Node.js?**  
A: Once packaged with Electron, yes! The .exe will bundle Node.js.

**Q: Is the original `npm start` still working?**  
A: Yes! 100% unchanged. You can use either version anytime.

## 📚 Related Commands

```bash
# Web version (original)
npm start

# Desktop version
npm run electron

# Desktop with dev tools
npm run electron-dev

# Check setup
npm run check

# Development with auto-reload (web only)
npm run dev
```

---

**Your app now runs as both a web application and a desktop application!** 🎉
