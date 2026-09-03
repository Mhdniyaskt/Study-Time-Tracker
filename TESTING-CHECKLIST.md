# Desktop App Testing Checklist

## ⚠️ Test BEFORE Building Installer

Complete this checklist before running `npm run dist` to build the installer.

## 📋 Prerequisites

### Environment Setup
- [ ] MongoDB is installed
- [ ] MongoDB is running (verify with `mongod` or check services)
- [ ] `.env` file exists in project root
- [ ] `.env` contains valid `MONGODB_URI`
- [ ] Dependencies installed (`npm install` completed)

### Quick Verification
```bash
# Check MongoDB is running
mongo --eval "db.version()"

# Or check if mongod process is running
tasklist | findstr mongod

# Verify .env file exists
type .env
```

## 🧪 Development Mode Testing

### Step 1: Launch Development Mode
```bash
npm run electron-dev
```

**Expected behavior:**
- [ ] Terminal shows "Starting Express server..."
- [ ] Terminal shows "MongoDB connected successfully"
- [ ] Terminal shows "Express server is ready"
- [ ] Terminal shows "Application window ready"
- [ ] Desktop window opens (1400x900)
- [ ] No browser window opens
- [ ] Dashboard displays with today's date
- [ ] No errors in terminal

**If it fails:**
- Check MongoDB is running
- Check `.env` file configuration
- Look for error messages in terminal
- See ELECTRON-BUILDER-GUIDE.md troubleshooting section

### Step 2: Test Core Features

#### Add Study Session
- [ ] Click "Add Study Session" or use form on dashboard
- [ ] Enter subject (e.g., "Mathematics")
- [ ] Enter hours (e.g., 2)
- [ ] Enter minutes (e.g., 30)
- [ ] Click "Add Session"
- [ ] Session appears in the list
- [ ] Today's total updates
- [ ] Chart updates (if visible)

#### Edit Study Session
- [ ] Click "Edit" on a session
- [ ] Edit page loads
- [ ] Form is pre-filled with existing data
- [ ] Change subject
- [ ] Change time
- [ ] Click "Update Session"
- [ ] Returns to dashboard
- [ ] Changes are reflected
- [ ] Statistics update

#### Delete Study Session
- [ ] Click "Delete" on a session
- [ ] Session is removed from list
- [ ] Today's total updates
- [ ] Chart updates
- [ ] No errors shown

### Step 3: Test Navigation

#### Statistics Page
- [ ] Click "Statistics" or navigate to /statistics
- [ ] Page loads successfully
- [ ] Shows correct statistics
- [ ] Charts display properly
- [ ] Subject breakdown shows
- [ ] Daily totals show
- [ ] Can filter by time period
- [ ] Can return to dashboard

#### History/Other Pages
- [ ] Navigate to all pages in your app
- [ ] All pages load correctly
- [ ] All features work
- [ ] No broken links

### Step 4: Test Data Persistence
- [ ] Add a test session
- [ ] Note the session details
- [ ] Close the app (click X on window)
- [ ] Terminal shows "Stopping Express server..."
- [ ] App closes cleanly
- [ ] Wait 5 seconds
- [ ] Reopen: `npm run electron-dev`
- [ ] Previous session is still there
- [ ] All data is intact

### Step 5: Test Error Handling

#### Invalid Input
- [ ] Try to add session with empty subject
- [ ] Error message displays
- [ ] Try to add session with 0 hours and 0 minutes
- [ ] Error message displays
- [ ] Try to add session with invalid characters
- [ ] Proper validation works

#### MongoDB Connection
- [ ] Close MongoDB service
- [ ] Try to restart app
- [ ] App shows connection error
- [ ] Error message is clear
- [ ] Restart MongoDB
- [ ] App works again

### Step 6: Test UI/UX

#### Window Behavior
- [ ] Window can be minimized
- [ ] Window can be maximized
- [ ] Window can be restored
- [ ] Window can be resized
- [ ] Window remembers size (if implemented)
- [ ] Close button works

#### Visual Elements
- [ ] All text is readable
- [ ] All buttons work
- [ ] All forms work
- [ ] Charts render correctly
- [ ] No visual glitches
- [ ] Scrolling works properly

## 🎯 Production Mode Testing

### Step 7: Test Production Mode
```bash
npm run electron
```

**Expected behavior:**
- [ ] No terminal/console window visible
- [ ] Desktop window opens
- [ ] App works exactly like dev mode
- [ ] All features functional
- [ ] No visible logs (this is correct)

**Key differences from dev mode:**
- ❌ No terminal logs visible
- ❌ No console output
- ✅ Cleaner user experience
- ✅ Same functionality

### Step 8: Test Clean Shutdown
- [ ] Close app via X button
- [ ] App closes immediately
- [ ] No hanging processes
- [ ] Can reopen immediately
- [ ] No errors on reopen

**Verify no hanging processes:**
```bash
tasklist | findstr node
tasklist | findstr electron
```

## 🔄 Stress Testing (Optional but Recommended)

### Performance Test
- [ ] Add 10 sessions in a row
- [ ] Navigate between pages
- [ ] Check statistics page
- [ ] Verify all data appears
- [ ] Check app performance

### Multiple Restart Test
- [ ] Open app
- [ ] Close app
- [ ] Repeat 5 times
- [ ] No issues on any launch
- [ ] Data persists correctly

### Port Conflict Test
- [ ] Run app
- [ ] Try to run `npm start` (web version)
- [ ] Should show port conflict error
- [ ] Close app
- [ ] Web version works
- [ ] Or change PORT in .env

## ✅ Pre-Build Final Checklist

Before running `npm run dist`, verify:

### Functionality
- [ ] All tests above passed
- [ ] No errors in dev mode
- [ ] No errors in production mode
- [ ] Data persistence works
- [ ] Clean shutdown works

### Configuration
- [ ] package.json version is correct
- [ ] LICENSE.txt exists
- [ ] .env.example exists (for users)
- [ ] All dependencies installed
- [ ] No uncommitted changes (optional)

### Optional (Recommended)
- [ ] Custom icon created (build/icon.ico)
- [ ] Icon looks good at small sizes
- [ ] README.md updated with installation instructions

## 🚀 Ready to Build?

If all tests pass:
```bash
npm run dist
```

**Build will take 2-5 minutes.**

**Output**: `dist/Study Time Tracker Setup.exe`

## 📦 Post-Build Testing

After building the installer:

### Installer Testing
- [ ] Installer file exists
- [ ] File size is reasonable (150-200 MB)
- [ ] Run installer
- [ ] Installation wizard appears
- [ ] Can choose installation directory
- [ ] Installation completes successfully
- [ ] Desktop shortcut created
- [ ] Start Menu entry created

### Installed App Testing
- [ ] Launch from desktop shortcut
- [ ] App opens without console window
- [ ] Copy `.env` to installation directory
- [ ] Restart app
- [ ] MongoDB connection works
- [ ] All features work
- [ ] Test add/edit/delete operations
- [ ] Test statistics page
- [ ] Close app
- [ ] Reopen app (data persists)

### Uninstaller Testing
- [ ] Run uninstaller from Control Panel
- [ ] Or run uninstaller from installation directory
- [ ] Uninstall completes successfully
- [ ] Desktop shortcut removed
- [ ] Start Menu entry removed
- [ ] Installation directory removed (or files deleted)

## 🐛 If Tests Fail

### Development Mode Issues
1. Check MongoDB is running
2. Check `.env` file configuration
3. Check terminal for error messages
4. Review ELECTRON-BUILDER-GUIDE.md troubleshooting

### Production Mode Issues
1. Test in dev mode first
2. Check if it's a logging issue (dev mode shows it)
3. Verify electron-main.js configuration

### Build Issues
1. Delete `dist` folder
2. Run `npm install` again
3. Try `npm run dist` again
4. Check disk space
5. Check antivirus isn't blocking

### Installation Issues
1. Run installer as administrator
2. Try different installation directory
3. Check Windows permissions
4. Verify Node.js isn't already running

## 📊 Test Results Template

Copy and fill this out:

```
=== TESTING RESULTS ===
Date: _______________
Tester: _______________

Prerequisites: PASS / FAIL
Development Mode: PASS / FAIL
Core Features: PASS / FAIL
Navigation: PASS / FAIL
Data Persistence: PASS / FAIL
Error Handling: PASS / FAIL
Production Mode: PASS / FAIL
Clean Shutdown: PASS / FAIL

Issues Found:
1. _______________
2. _______________
3. _______________

Ready to Build: YES / NO

Notes:
_______________
_______________
_______________
```

## ✅ Success Criteria

**You're ready to build when:**
- ✅ All checkboxes above are checked
- ✅ No critical issues found
- ✅ App works smoothly in both dev and production modes
- ✅ Data persists correctly
- ✅ MongoDB connection is stable
- ✅ No console errors

**Then run:**
```bash
npm run dist
```

---

**Good luck with testing!** 🚀

If you encounter issues, see ELECTRON-BUILDER-GUIDE.md for troubleshooting.
