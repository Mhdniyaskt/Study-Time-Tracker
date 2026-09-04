# Floating Timer Widget Implementation - Complete

## Files Changed/Created

### New Files
1. **preload.js** - IPC bridge between Electron main and renderer processes
2. **floating-timer.html** - Compact floating timer widget UI (280x220px)

### Modified Files
3. **electron-main.js** - Added shared timer state, IPC handlers, floating window management, application menu
4. **views/index.ejs** - Added Electron IPC integration for timer synchronization
5. **package.json** - Added preload.js and floating-timer.html to build files list

---

## How the Shared Timer State Works

### Architecture

```
Main Electron Process (electron-main.js)
        ↓
sharedTimerState Object (Single Source of Truth)
{
  state: 'ready'|'running'|'stopped',
  subject: '',
  startTime: timestamp,
  elapsedSeconds: number,
  isPaused: boolean
}
        ↓
    IPC Events
        ↓
    ┌─────────────────────────┐
    ├─ Main Window            │
    │  (Express/index.ejs)    │
    │  - Start/Stop/Reset     │
    │  - Submit saves to DB   │
    └─────────────────────────┘
        ↕
    ┌─────────────────────────┐
    ├─ Floating Widget        │
    │  (floating-timer.html)  │
    │  - Pause/Resume         │
    │  - Stop & Save          │
    └─────────────────────────┘
```

### Timer State Flow

1. **Starting Timer**
   - User clicks Start in main app → sends IPC 'start' action → main process updates sharedTimerState → broadcasts to both windows
   - User clicks Start in floating widget → same flow

2. **Pause/Resume**
   - Only available in floating widget
   - Pause: calculates elapsed time, stores it, sets isPaused=true
   - Resume: sets isPaused=false, resets startTime to now
   - No elapsed time is lost during pause

3. **Stop**
   - Main app Stop button: calculates final elapsed time, sets state to 'stopped', does NOT save
   - Floating widget Stop & Save: calculates final elapsed time, triggers save via main window, resets state

4. **Submit/Save**
   - Main app Submit: saves current stopped timer to MongoDB via POST /timer/save
   - Floating widget Stop & Save: sends 'stop-and-save' IPC → main process sends 'save-timer-session' event → main window handles save

5. **Reset**
   - Resets all state to initial values
   - Does NOT save anything

### IPC Communication

**Actions sent TO main process (via 'timer-action'):**
- `start` - Start timer with subject
- `stop` - Stop timer (no save)
- `reset` - Reset timer to initial state
- `pause` - Pause running timer
- `resume` - Resume paused timer
- `stop-and-save` - Stop and trigger save
- `update-state` - Update shared state from main window

**Events sent FROM main process:**
- `timer-state-update` - Broadcasts current state to all windows
- `save-timer-session` - Requests main window to save session
- `request-timer-state` - Returns current state

---

## How to Open/Show the Floating Widget

### Method 1: Application Menu
1. Run the Electron app
2. Go to menu: **View** → **Show Floating Timer**
3. The floating widget appears in the top-right area of the screen

### Method 2: Application Menu - Hide
1. Go to menu: **View** → **Hide Floating Timer**
2. The widget hides but timer continues running in background

### Features
- **Always on top**: Widget stays visible over other applications (VS Code, Chrome, PDF readers, etc.)
- **Frameless**: No title bar or window decorations
- **Draggable**: Click and drag anywhere on the widget to move it
- **Compact**: 280x220px dark theme window

---

## How to Run the Electron Development Test

```powershell
npm run electron-dev
```

This command:
1. Starts the Express server in-process
2. Connects to MongoDB
3. Opens the main Electron window
4. Enables developer console for debugging
5. Makes the View menu available for showing/hiding floating timer

---

## Test Results

### ✅ Successful Tests

1. **Electron App Starts**
   - ✅ Express server starts in-process
   - ✅ MongoDB connects successfully
   - ✅ Main window loads at http://localhost:3000
   - ✅ Application menu created with View options

2. **File Structure**
   - ✅ preload.js created with IPC bridge
   - ✅ floating-timer.html created with compact dark UI
   - ✅ electron-main.js updated with shared timer state and IPC handlers
   - ✅ index.ejs updated with Electron IPC integration
   - ✅ package.json updated to include new files in build

3. **Architecture**
   - ✅ Shared timer state object created in main process
   - ✅ IPC handlers implemented for all timer actions
   - ✅ Broadcast function sends state updates to all windows
   - ✅ Preload script exposes safe IPC API to renderers

### 📋 Manual Tests Required

The following tests should be performed manually:

#### Test 1: Start from Main App, Open Floating Widget
1. Start the Electron app: `npm run electron-dev`
2. Enter subject in main app (e.g., "Physics")
3. Click Start button in main app
4. Timer should start counting: 00:00:01, 00:00:02, etc.
5. Go to View → Show Floating Timer
6. **Expected**: Floating widget shows same time and "Physics" subject
7. **Expected**: Widget updates every 250ms showing current time

#### Test 2: Start from Floating Widget
1. If timer is running, click Reset in main app
2. Open floating widget: View → Show Floating Timer
3. Enter subject in main app
4. Click Start in main app
5. **Expected**: Both main app and widget show running timer
6. **Expected**: Times stay synchronized

#### Test 3: Pause/Resume in Widget
1. Start timer in main app
2. Open floating widget
3. Click Pause button (⏸) in widget
4. **Expected**: Timer freezes at current time
5. **Expected**: Status shows "Paused" in yellow
6. **Expected**: Resume button (▶) appears
7. Wait 5 seconds
8. Click Resume button in widget
9. **Expected**: Timer continues from exact paused time (no time lost)
10. **Expected**: Status shows "Running ●" in green

#### Test 4: Stop & Save from Floating Widget
1. Start timer with subject "Mathematics"
2. Let it run for ~10 seconds
3. Click Stop & Save (■) in floating widget
4. Confirm the dialog
5. **Expected**: Main window reloads showing new session
6. **Expected**: Only ONE session is saved to MongoDB
7. **Expected**: Session has exact seconds (not rounded)
8. Check MongoDB or History page to verify durationSeconds

#### Test 5: Hide Widget While Running
1. Start timer in main app
2. Open floating widget
3. Let timer run to ~5 seconds
4. Close widget using × button
5. Wait 5 more seconds
6. Open widget again: View → Show Floating Timer
7. **Expected**: Widget shows correct current time (~10 seconds)
8. **Expected**: No time was lost while hidden

#### Test 6: Stop from Main App While Widget Visible
1. Start timer
2. Open floating widget
3. Both show running timer
4. Click Stop button in main app
5. **Expected**: Widget immediately shows stopped state
6. **Expected**: Stop & Save button becomes disabled in widget
7. **Expected**: No session is saved yet

#### Test 7: Submit from Main App
1. Follow Test 6 to get a stopped timer
2. Click Submit in main app
3. **Expected**: Session is saved to MongoDB
4. **Expected**: Dashboard refreshes showing new session
5. **Expected**: Only ONE session is created
6. **Expected**: Duration matches exactly what was shown

#### Test 8: Exact Seconds Preservation
1. Start timer
2. Stop at exactly 3 seconds
3. Submit
4. Check MongoDB or History:
   - **Expected**: durationSeconds = 3
   - **Expected**: NOT saved as 3 minutes
   - **Expected**: Display shows correct time

#### Test 9: Normal Web Version Still Works
1. Stop Electron app
2. Start web version: `npm start`
3. Open browser to http://localhost:3000
4. **Expected**: Timer works normally without IPC
5. **Expected**: Start/Stop/Reset/Submit all function
6. **Expected**: No JavaScript errors in browser console

#### Test 10: Floating Widget Stays On Top
1. Start Electron app
2. Open floating widget
3. Open other applications (VS Code, Chrome, Notepad, etc.)
4. **Expected**: Floating widget stays visible on top of all windows
5. **Expected**: Widget is draggable to different positions
6. **Expected**: Widget cannot be resized

---

## Technical Details

### Shared Timer State Structure
```javascript
{
  state: 'ready'|'running'|'stopped',
  subject: string,
  startTime: number | null,  // Date.now() timestamp
  elapsedSeconds: number,
  isPaused: boolean
}
```

### Timestamp-Based Timing
The timer uses **timestamps** for accuracy, not `setInterval` counters:
- When started: `startTime = Date.now()`
- Current elapsed: `Math.floor((Date.now() - startTime) / 1000) + elapsedSeconds`
- When paused: `elapsedSeconds += Math.floor((Date.now() - startTime) / 1000)`
- This prevents drift from window switches, hidden windows, or delayed renders

### Floating Widget Specifications
- **Size**: 280x220px (fixed, not resizable)
- **Frame**: None (frameless window)
- **Always on top**: Yes
- **Skip taskbar**: Yes
- **Background**: #1a1a1a (dark charcoal)
- **Update interval**: 250ms visual refresh
- **Draggable**: Entire window except buttons

### Button States in Floating Widget
| Timer State | Pause Button | Resume Button | Stop Button |
|-------------|--------------|---------------|-------------|
| ready       | hidden       | hidden        | disabled    |
| running     | visible      | hidden        | enabled     |
| paused      | hidden       | visible       | enabled     |
| stopped     | hidden       | hidden        | disabled    |

### Main Window Button States (unchanged from Stage 1)
All four buttons always visible:
- **Start**: Enabled when ready
- **Stop**: Enabled when running
- **Reset**: Enabled when stopped
- **Submit**: Enabled when stopped with valid duration

---

## Known Limitations & Notes

1. **Cache Warnings**: Electron shows cache permission warnings on Windows - these are harmless and don't affect functionality
2. **Pause in Main App**: Main app doesn't have pause/resume - only floating widget has these controls
3. **Single Save**: Stop & Save in widget triggers one save via main window to avoid duplicates
4. **Window Position**: Floating widget doesn't remember position between sessions (defaults to top-right)
5. **MongoDB Required**: Both web and Electron versions require MongoDB running

---

## Files Summary

### preload.js (New)
- Exposes `window.electronAPI` to renderer processes
- Provides safe IPC bridge with contextIsolation
- Handles timer actions, state updates, and widget controls

### floating-timer.html (New)
- Compact 280x220px dark theme widget
- Shows subject, timer, status, and controls
- Updates display every 250ms when running
- Pause/Resume and Stop & Save buttons

### electron-main.js (Modified)
- Added `sharedTimerState` object (single source of truth)
- Added IPC handlers for all timer actions
- Added `broadcastTimerState()` function
- Added `createFloatingTimerWindow()` function
- Added application menu with View → Show/Hide Floating Timer
- Added preload script to main window webPreferences

### views/index.ejs (Modified)
- Added Electron IPC integration section (lines ~1160-1240)
- Overrides timer functions to use IPC when in Electron
- Listens for `timer-state-update` events
- Handles `save-timer-session` requests from floating widget
- Syncs local state changes to shared state

### package.json (Modified)
- Added `preload.js` and `floating-timer.html` to build.files array
- Ensures new files are included in packaged app

---

## Next Steps

1. ✅ Implementation complete
2. 📋 **User should perform manual tests** (see Test Results section above)
3. 🔧 Report any issues found during testing
4. 📦 When all tests pass, build the installer: `npm run dist`

---

## How to Build Installer (When Ready)

**DO NOT run this yet - wait for manual testing to complete!**

```powershell
npm run dist
```

This will create the Windows installer in the `dist/` folder.

---

## Support

If any issues occur during testing:
1. Check the Electron console (automatically visible in dev mode)
2. Check the browser console in main window (F12)
3. Verify MongoDB is running: `Get-Service -Name MongoDB`
4. Check server console output for Express/database errors
5. Report specific error messages and reproduction steps
