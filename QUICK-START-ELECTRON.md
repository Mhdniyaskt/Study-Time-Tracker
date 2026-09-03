# Quick Start - Desktop App Development

## 🎯 What You Have Now

Your Study Time Tracker is configured as a **Windows desktop application** with:
- ✅ Electron wrapper around your Express app
- ✅ No code changes to your existing app
- ✅ Console window hidden in production
- ✅ electron-builder configured for Windows installer
- ✅ NSIS installer setup

## 🚀 Test It Now (3 Steps)

### Step 1: Make Sure Prerequisites Are Ready

```bash
# Verify MongoDB is running
mongo --eval "db.version()"
```

If MongoDB isn't running, start it:
```bash
mongod
```

### Step 2: Launch Development Mode

```bash
npm run electron-dev
```

**What you should see:**
1. Terminal shows server starting messages
2. A desktop window opens (1400x900)
3. Your Study Time Tracker dashboard appears
4. NO browser window opens

**What to test:**
- Add a study session
- Edit a session
- Delete a session
- Navigate to statistics
- Close the app
- Reopen and verify data persisted

### Step 3: Test Production Mode (No Console)

```bash
npm run electron
```

**What's different:**
- No terminal/console window visible
- App works exactly the same
- This is how end users will experience it

## ✅ If Tests Pass

If everything works in steps 1-3 above, you're ready to build!

## 📦 Build the Installer (After Testing)

When you're ready to create the installer:

```bash
npm run dist
```

**This will create:**
- `dist/Study Time Tracker Setup.exe` ← The installer file
- Build time: 2-5 minutes
- File size: ~150-200 MB

## 🎁 What the Installer Includes

- Your complete Express application
- Node.js runtime (bundled)
- Electron framework
- All npm dependencies
- EJS views and models
- Desktop + Start Menu shortcuts

## 📋 Key Commands

| Command | What It Does |
|---------|--------------|
| `npm run electron-dev` | Open desktop app with console logs (for testing) |
| `npm run electron` | Open desktop app without console (production mode) |
| `npm run dist` | Build Windows installer (do this AFTER testing) |
| `npm run dist-dir` | Build unpacked app only (faster, for testing builds) |
| `npm start` | Original web version (still works!) |

## 🐛 Troubleshooting Quick Fixes

### Desktop window is blank
→ MongoDB isn't running. Start it: `mongod`

### "Port 3000 already in use"
→ Close other instances or change PORT in `.env`

### Changes don't appear
→ Completely close the app (including terminal) and restart

### MongoDB connection error
→ Check `.env` file has correct `MONGODB_URI`

## 📚 Full Documentation

For complete details, see:
- **ELECTRON-BUILDER-GUIDE.md** - Complete building guide
- **TESTING-CHECKLIST.md** - Comprehensive testing checklist
- **build/ICON-INSTRUCTIONS.md** - How to add a custom icon

## 🎨 Optional: Add Custom Icon

Create a 256x256 icon and save as `build/icon.ico`

See `build/ICON-INSTRUCTIONS.md` for details.

## ⚡ Quick Test Script

Copy and run this entire block:

```bash
# Step 1: Verify MongoDB
echo "Checking MongoDB..."
mongo --eval "db.version()"

# Step 2: Test desktop app
echo "Launching desktop app in dev mode..."
npm run electron-dev

# In the app window:
# 1. Add a test session
# 2. Close the app
# 3. Run npm run electron-dev again
# 4. Verify the session is still there
```

## ✅ Success Checklist

You're ready to build when:
- [ ] `npm run electron-dev` opens the app
- [ ] You can add/edit/delete sessions
- [ ] Statistics page works
- [ ] Data persists after closing
- [ ] `npm run electron` works (no console)

**Then run:** `npm run dist`

## 🎉 What's Next?

1. **Test now**: `npm run electron-dev`
2. **Verify features** work correctly
3. **Optional**: Add custom icon to `build/icon.ico`
4. **Build installer**: `npm run dist`
5. **Test installer** on your machine
6. **Distribute**: Share `dist/Study Time Tracker Setup.exe`

---

## 💡 Important Notes

### Your Original App Still Works
```bash
npm start  # Opens in browser, exactly as before
```

### MongoDB Required
Users will need MongoDB installed and configured via `.env` file.

### No Internet Required (After Install)
The installed app runs completely offline (except MongoDB connection).

### Distribution
Only share: `dist/Study Time Tracker Setup.exe` (installer)
Users run the installer, it handles everything else.

---

**Ready? Start testing with:**
```bash
npm run electron-dev
```

🚀 **Good luck!**
