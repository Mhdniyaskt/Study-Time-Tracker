# Electron Builder - Windows Installer Guide

## ✅ Setup Complete!

Your Study Time Tracker is now configured to build a Windows desktop installer using electron-builder.

## 📋 What Was Configured

### 1. Installed electron-builder
```bash
npm install --save-dev electron-builder
```

### 2. Updated package.json
Added electron-builder configuration:
- **App ID**: `com.studytimetracker.app`
- **Product Name**: `Study Time Tracker`
- **Output**: `dist/Study Time Tracker Setup.exe`
- **Target**: NSIS installer (Windows x64)
- **Features**: Desktop shortcut, Start Menu entry, custom install directory

### 3. Enhanced electron-main.js
- **Console window**: Hidden in production mode
- **Development mode**: Shows logs when running with `--dev` flag
- **Error handling**: Captures and logs server errors
- **Clean shutdown**: Properly closes server process

### 4. Created Build Assets
- `LICENSE.txt` - License agreement for installer
- `build/` directory - For icon and resources
- `build/ICON-INSTRUCTIONS.md` - How to add custom icon

## 🚀 How to Use

### Development Testing (FIRST - DO THIS NOW!)

Before building the installer, test the desktop app:

```bash
npm run electron-dev
```

**What this does:**
- ✅ Starts Express server
- ✅ Opens desktop window
- ✅ Shows console logs (for debugging)
- ✅ No browser window opens
- ✅ MongoDB connection works

**Test these features:**
1. ✅ App window opens
2. ✅ Dashboard displays correctly
3. ✅ Add a study session
4. ✅ Edit a session
5. ✅ Delete a session
6. ✅ View statistics page
7. ✅ Check charts display
8. ✅ Close app (should shut down cleanly)

### Production Preview

Test the app as it will run for end users (no console):

```bash
npm run electron
```

**Differences from dev mode:**
- ❌ No console window visible
- ❌ No logs displayed
- ✅ Clean production experience
- ✅ Same functionality

### Building the Installer

⚠️ **IMPORTANT**: Only build after successful testing!

#### Option 1: Full Installer (Recommended)
```bash
npm run dist
```

**Output:**
- `dist/Study Time Tracker Setup.exe` - NSIS installer
- `dist/win-unpacked/` - Unpacked application files

**File size**: ~150-200 MB (includes Node.js + dependencies)

#### Option 2: Build Directory Only (Testing)
```bash
npm run dist-dir
```

**Output:**
- `dist/win-unpacked/` - Unpacked application files only
- No installer created
- Faster for testing

#### Option 3: Pack Only (Dev Testing)
```bash
npm run pack
```

**Output:**
- `dist/win-unpacked/` - Development build
- Very fast
- For quick testing

## 📦 What Gets Included in the Build

### ✅ Included Files
- `electron-main.js` - Electron entry point
- `server.js` - Express server
- `models/**/*` - MongoDB models
- `views/**/*` - EJS templates
- `node_modules/**/*` - All dependencies
- `.env.example` - Example environment file

### ❌ Excluded Files
- `dist/**` - Previous build output
- `*.md` - Documentation files
- `*.bat` - Batch scripts
- `node_modules/@yao-pkg/**` - Unused dependencies
- `node_modules/esbuild/**` - Development only
- `node_modules/nodemon/**` - Development only

## 🎯 Installer Features

### NSIS Installer Settings
- **Type**: Multi-step installer (not one-click)
- **Install Location**: User can choose (default: `C:\Program Files\Study Time Tracker`)
- **Desktop Shortcut**: Created automatically
- **Start Menu**: Created automatically
- **Uninstaller**: Included
- **License Agreement**: Shows LICENSE.txt during installation

### Installer Behavior
1. Welcome screen
2. License agreement
3. Choose installation directory
4. Choose shortcuts (desktop, start menu)
5. Installing files progress
6. Finish screen with "Launch Study Time Tracker" option

## 🔧 Configuration Details

### package.json Build Config

```json
"build": {
  "appId": "com.studytimetracker.app",
  "productName": "Study Time Tracker",
  "artifactName": "${productName} Setup.${ext}",
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

## 🖼️ Adding a Custom Icon

**Required file**: `build/icon.ico`

See `build/ICON-INSTRUCTIONS.md` for detailed instructions.

**Quick steps:**
1. Create a 256x256 PNG image
2. Convert to .ico format (use online converter)
3. Save as `build/icon.ico`
4. Rebuild: `npm run dist`

**Without a custom icon:**
- App will use default Electron icon
- Everything else works normally

## 🧪 Testing Checklist

### Before Building

- [ ] MongoDB is installed and running
- [ ] `.env` file exists with valid `MONGODB_URI`
- [ ] Run `npm run electron-dev` successfully
- [ ] All features work (add/edit/delete sessions)
- [ ] Statistics page displays correctly
- [ ] Charts render properly
- [ ] App closes cleanly

### After Building

- [ ] Installer file created: `dist/Study Time Tracker Setup.exe`
- [ ] File size reasonable (~150-200 MB)
- [ ] No errors during build process

### Installation Testing

- [ ] Run the installer
- [ ] Choose installation directory
- [ ] Desktop shortcut created
- [ ] Start menu entry created
- [ ] Launch application from shortcut
- [ ] App opens without console window
- [ ] MongoDB connection works
- [ ] Test all features work
- [ ] Close app cleanly
- [ ] Reopen app (data persists)
- [ ] Test uninstaller

## 🐛 Common Issues & Solutions

### Issue: Build fails with "Cannot find module"
**Solution:**
```bash
npm install
npm run dist
```

### Issue: Installer shows default Electron icon
**Solution:** 
- Create `build/icon.ico` 
- Rebuild with `npm run dist`

### Issue: MongoDB connection fails in installed app
**Solution:**
- Make sure MongoDB is running
- Check user has `.env` file in app directory
- Or guide user to configure MongoDB connection

### Issue: Console window shows in production
**Solution:**
- Make sure running with `npm run electron` (not `electron-dev`)
- Check electron-main.js has `windowsHide: !isDev`

### Issue: Build is too large
**Solution:** 
- This is normal (~150-200 MB)
- Includes Node.js runtime and all dependencies
- Cannot be significantly reduced

### Issue: "Port 3000 already in use"
**Solution:**
- Close other instances
- Or change PORT in `.env` file

## 📁 Build Output Structure

After running `npm run dist`:

```
dist/
├── Study Time Tracker Setup.exe    ← Installer (distribute this)
├── win-unpacked/                   ← Unpacked app files
│   ├── Study Time Tracker.exe      ← Main executable
│   ├── resources/
│   │   └── app.asar               ← Packed application
│   └── ... (other files)
└── builder-debug.yml               ← Build metadata
```

**Distribute**: `Study Time Tracker Setup.exe` (only this file)

## 🚀 Distribution

### For End Users

**What they need:**
1. Download `Study Time Tracker Setup.exe`
2. Run the installer
3. Install MongoDB separately (if not already installed)
4. Create `.env` file in app directory with `MONGODB_URI`
5. Launch "Study Time Tracker" from Start Menu or Desktop

**App location after install:**
```
C:\Program Files\Study Time Tracker\
├── Study Time Tracker.exe
├── resources/
└── ... (other files)
```

**User data location:**
MongoDB connection must be configured via `.env` file

### Creating .env for Users

Users need to create `.env` file in the app installation directory:

**Location**: `C:\Program Files\Study Time Tracker\.env`

**Content**:
```env
MONGODB_URI=mongodb://localhost:27017/studytracker
PORT=3000
NODE_ENV=production
```

## 📊 Build Statistics

Typical build output:
- **Installer size**: 150-200 MB
- **Installed size**: 250-300 MB
- **Build time**: 2-5 minutes
- **Includes**: Node.js, Electron, Express, MongoDB driver, all dependencies

## 🔄 Rebuild/Update Process

When you make changes to the app:

1. Test changes: `npm run electron-dev`
2. Verify everything works
3. Update version in `package.json`
4. Rebuild: `npm run dist`
5. Test new installer
6. Distribute updated installer

## 📝 Scripts Reference

| Command | Purpose | Use Case |
|---------|---------|----------|
| `npm start` | Web version (browser) | Web development |
| `npm run electron` | Desktop app (production mode) | Test final experience |
| `npm run electron-dev` | Desktop app (dev mode) | Development & debugging |
| `npm run pack` | Pack only (fast) | Quick testing |
| `npm run dist-dir` | Build unpacked only | Build testing |
| `npm run dist` | Full installer build | Production build |

## ✅ Next Steps

1. **Test in development:**
   ```bash
   npm run electron-dev
   ```

2. **Test all features** (see testing checklist above)

3. **Add custom icon** (optional but recommended)

4. **Build installer:**
   ```bash
   npm run dist
   ```

5. **Test installer** on your machine

6. **Distribute** `Study Time Tracker Setup.exe`

## 🎉 Success Criteria

Your setup is complete when:
- ✅ `npm run electron-dev` opens the app with logs
- ✅ `npm run electron` opens the app without console
- ✅ All features work (CRUD operations, charts, statistics)
- ✅ App closes cleanly
- ✅ MongoDB connection works
- ✅ No errors in console

**Then you're ready to build the installer!**

---

**Build configured successfully!**  
Date: September 3, 2026  
Electron: 44.1.1  
Electron Builder: 25.1.8  
Target: Windows x64 NSIS Installer
