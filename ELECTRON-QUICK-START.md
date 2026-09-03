# Electron Desktop App - Quick Start Guide

## 🚀 Run the Desktop App

### Method 1: npm Command
```bash
npm run electron
```

### Method 2: Batch File (Windows)
Double-click: **`start-desktop.bat`**

## ⚙️ Prerequisites

Before running the desktop app, ensure:
1. ✅ MongoDB is running
2. ✅ `.env` file exists with valid `MONGODB_URI`
3. ✅ Dependencies installed (`npm install`)

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Web version (opens in browser) |
| `npm run electron` | Desktop version (native window) |
| `npm run electron-dev` | Desktop version with DevTools |
| `npm run dev` | Web version with auto-reload |

## 🔄 Switching Between Modes

### Use Web Mode When:
- Developing server-side code (faster restarts)
- Testing in actual browser
- Deploying to web server
- Sharing via URL

### Use Desktop Mode When:
- Testing desktop-specific features
- Want native window experience
- Preparing for packaging
- Final user experience testing

## 🧪 First Time Testing

1. Make sure MongoDB is running:
   ```bash
   mongod
   ```

2. Run desktop app:
   ```bash
   npm run electron-dev
   ```

3. Test these features:
   - ✅ Add a study session
   - ✅ Edit a session
   - ✅ Delete a session
   - ✅ View statistics
   - ✅ Check charts display
   - ✅ Close and reopen app

## ❌ Troubleshooting

### Desktop window is blank
→ Check terminal for errors  
→ Verify MongoDB is running  
→ Wait a few seconds for server to start

### "Port 3000 in use" error
→ Stop other instances  
→ Or change PORT in `.env` file

### Changes don't appear
→ Stop Electron completely (Ctrl+C)  
→ Restart: `npm run electron`

### Server won't connect to MongoDB
→ Check `.env` has correct `MONGODB_URI`  
→ Start MongoDB service  
→ Verify network connection

## 📁 Key Files

- **electron-main.js** - Electron entry point (starts server + window)
- **server.js** - Your Express app (unchanged functionality)
- **package.json** - Updated with Electron scripts
- **start-desktop.bat** - Quick launch shortcut

## 💡 Pro Tips

1. **Development**: Use `npm run electron-dev` to see console logs
2. **Debugging**: Press F12 in the window to open DevTools
3. **Quit**: Close window OR press Ctrl+C in terminal
4. **Data**: Both web and desktop use same MongoDB database
5. **Original**: `npm start` still works exactly as before!

## 🎯 What's Next?

### For Regular Use:
- Use `npm run electron` daily
- All your data is saved in MongoDB
- Close and reopen anytime

### For Distribution:
- Package into standalone .exe
- Users won't need Node.js installed
- MongoDB must still be available

## ⚡ Quick Test Script

Test everything in 2 minutes:

```bash
# 1. Start desktop app
npm run electron-dev

# 2. In the app window:
# - Add a test study session
# - View statistics page
# - Close the app

# 3. Restart
npm run electron

# 4. Verify:
# - Your test session is still there
# - Everything works the same
```

## 📖 More Information

- **Full Documentation**: See `ELECTRON-README.md`
- **Setup Details**: See `ELECTRON-SETUP-SUMMARY.md`
- **Original Docs**: See `README.md`

---

## ✅ Quick Checklist

Before your first run:
- [ ] MongoDB is running
- [ ] `.env` file exists
- [ ] Ran `npm install`
- [ ] Port 3000 is available

Ready? Run:
```bash
npm run electron
```

🎉 **Your Study Time Tracker is now a desktop app!**
