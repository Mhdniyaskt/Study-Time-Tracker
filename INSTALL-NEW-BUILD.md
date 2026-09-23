# Install New Build - Fix Electron Window Issue

**Date:** September 4, 2026  
**Status:** Ready to install

---

## Current Situation

### ✅ Good News
The code is correct! Testing shows:
- ✅ Electron window IS being created properly
- ✅ Server correctly detects Electron mode: "Running inside Electron - browser launch skipped"
- ✅ Main window has title "Study Time Tracker" and is visible
- ✅ MongoDB default URI is working

### ⚠️ The Problem
You have an **old installation** from 4:56 PM at:
```
C:\Users\conne\AppData\Local\Programs\Study Time Tracker\Study Time Tracker.exe
```

This old version:
- ❌ Has the MongoDB URI crash bug (requires .env file)
- ❌ Crashes on startup with "MONGODB_URI is not set"
- ❌ May cause Windows to fall back to opening URLs in browser

### ✅ The Solution
The **new installer** (also at 4:56 PM) includes the MongoDB fix and is ready to install:
```
C:\Users\conne\Study-Time-Tracker\dist\Study Time Tracker Setup.exe
```

---

## Installation Steps

### Step 1: Close the Old App
Make sure no instances are running:
```powershell
Stop-Process -Name "Study Time Tracker" -Force -ErrorAction SilentlyContinue
```

### Step 2: Run the New Installer
```powershell
& "C:\Users\conne\Study-Time-Tracker\dist\Study Time Tracker Setup.exe"
```

The installer will:
1. Detect the old installation
2. Uninstall the old version
3. Install the new version (same location)
4. Update the desktop shortcut
5. Update the Start Menu shortcut

### Step 3: Launch the App

Click the desktop shortcut "Study Time Tracker" or run:
```powershell
& "$env:LOCALAPPDATA\Programs\Study Time Tracker\Study Time Tracker.exe"
```

### Step 4: Verify Correct Behavior

**You should see:**
1. ✅ **Electron desktop window** opens (NOT a browser window)
2. ✅ Window title shows "Study Time Tracker"
3. ✅ Window is resizable and can be minimized
4. ✅ Dashboard loads with 2-hour daily goal
5. ✅ Widget button shows **green dot** and label "Desktop Widget"
6. ✅ Console log shows:
   ```
   ℹ️  MONGODB_URI not set in environment - using local default
   Running inside Electron - browser launch skipped
   ```

**You should NOT see:**
- ❌ Browser opening to localhost:3000
- ❌ Error message about MONGODB_URI
- ❌ App crash on startup

### Step 5: Test the Floating Widget

1. Click "Desktop Widget" button (with green dot)
2. A separate frameless window should appear
3. Drag it outside the main window
4. Minimize the main window - widget stays visible
5. Widget shows timer controls and stays always-on-top

---

## Troubleshooting

### If browser opens instead of Electron window:

**Check which executable you're running:**
```powershell
Get-Process -Name "Study Time Tracker" | Select-Object Id,Path
```

**Should show:**
```
C:\Users\conne\AppData\Local\Programs\Study Time Tracker\Study Time Tracker.exe
```

**Should NOT show:**
- Browser processes (chrome.exe, msedge.exe, firefox.exe)
- npm or node processes

### If you see "MONGODB_URI is not set" error:

This means you're running the **old installation**. Reinstall using Step 2 above.

### If MongoDB connection fails:

**Check MongoDB service:**
```powershell
Get-Service -Name "MongoDB" | Select-Object Status,Name
```

**Start MongoDB if stopped:**
```powershell
net start MongoDB
```

**If MongoDB is not installed:**
- Download: https://www.mongodb.com/try/download/community
- Install with "Install as Windows Service" option

---

## File Locations After Installation

| Item | Path |
|------|------|
| **Executable** | `%LOCALAPPDATA%\Programs\Study Time Tracker\Study Time Tracker.exe` |
| **Desktop Shortcut** | `%USERPROFILE%\Desktop\Study Time Tracker.lnk` |
| **Start Menu** | `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Study Time Tracker.lnk` |
| **User Data** | `%APPDATA%\study-time-tracker\` |
| **Widget Bounds** | `%APPDATA%\study-time-tracker\widget-bounds.json` |
| **Uninstaller** | `%LOCALAPPDATA%\Programs\Study Time Tracker\Uninstall Study Time Tracker.exe` |

---

## Confirming the Fix

After installation, check that the installed version has the fix:

### Test 1: Check Build Date
```powershell
$exe = "$env:LOCALAPPDATA\Programs\Study Time Tracker\Study Time Tracker.exe"
(Get-Item $exe).LastWriteTime
```

Should show: **September 4, 2026 at 4:56 PM or later**

### Test 2: Check It's Running in Electron
While the app is running:
```powershell
Get-Process -Name "Study Time Tracker" | Select-Object Id,MainWindowTitle,@{N='HasWindow';E={$_.MainWindowHandle -ne 0}}
```

Should show at least one process with:
- `MainWindowTitle: Study Time Tracker`
- `HasWindow: True`

### Test 3: Check Server is NOT Opening Browser
Look at the console output when launching. Should see:
```
Running inside Electron - browser launch skipped
```

NOT:
```
Opening browser...
✓ Browser opened to http://localhost:3000
```

### Test 4: Check Widget Indicator
Open the app and look at the Widget button in the top right.

Should show:
- 🟢 **Green dot** next to "Desktop Widget"

This confirms Electron mode is active and the native floating widget is available.

---

## Technical Details

### Why the old installation opened in browser:

The old installation (pre-MongoDB-fix) would:
1. Start the Express server
2. Check for `MONGODB_URI` environment variable
3. Throw error: "MONGODB_URI is not set"
4. Crash the Electron process
5. Windows might fall back to opening the last accessed URL

OR you may have been running:
```bash
npm start
```

This starts ONLY the Express server (browser mode), not Electron. The correct command for Electron is:
```bash
npm run electron
```

### How the new build fixes this:

1. **No crash on missing MONGODB_URI** - uses safe default
2. **Electron window always created** - `createMainWindow()` is called
3. **Browser launch skipped** - checks `isElectron` flag
4. **Proper window lifecycle** - window shows after `ready-to-show` event

---

## Development vs Production Commands

| Mode | Command | Opens In | Requires .env | Notes |
|------|---------|----------|---------------|-------|
| **Browser Dev** | `npm start` | Browser | Optional | Express only, no Electron |
| **Browser Watch** | `npm run dev` | Browser | Optional | Auto-restart on changes |
| **Electron Prod** | `npm run electron` | Electron | Optional | Standalone, in-process server |
| **Electron Dev** | `npm run electron-dev` | Electron | Optional | Can run alongside `npm run dev` |
| **Installed App** | (desktop shortcut) | Electron | Optional | Packaged .exe, includes all dependencies |

---

**Ready to install!** Run Step 2 above to update your installation with the MongoDB fix and proper Electron window behavior.
