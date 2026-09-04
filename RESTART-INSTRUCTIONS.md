# How to Apply the Changes

## You're seeing the old version because the server is still running the old code!

### Steps to See the Changes:

#### 1. Stop the Current Server
- Go to the terminal/command prompt where the server is running
- Press `Ctrl + C` to stop the server
- Wait for it to fully stop

#### 2. Restart the Server
- Run: `node server.js`
- Wait for "MongoDB connected successfully"
- Wait for "Server running at http://localhost:3000"

#### 3. Refresh Your Browser
- Go to your browser
- Press `Ctrl + Shift + R` (hard refresh to clear cache)
- Or press `F5` several times

### What You Should See After Restart:

✅ **This Week card:**
- Shows only total time (e.g., "0m")
- Says "Total study time" underneath
- **NO** "Goal: 21h" text
- **NO** progress bar

✅ **Today's Study card:**
- Shows "Goal: 2h" (not 3h)
- Progress bar shows progress toward 2 hours

✅ **Study Streak card:**
- Shows "0 days" if you haven't met today's goal yet
- Says "Reach your goal today" underneath

---

## Testing the Streak

After restarting, test the streak:

### Test 1: Add session UNDER 2 hours
1. Add a study session: Subject = "Test", Hours = 1, Minutes = 30
2. Click "Add Study Session"
3. **Expected:** Streak stays at "0 days"

### Test 2: Add session to MEET 2 hours
1. Add another session: Subject = "Test", Hours = 0, Minutes = 30
2. Click "Add Study Session"
3. **Expected:** 
   - "Today's Study" shows "2h 0m"
   - Progress bar is 100%
   - **Streak changes to "1 day"** 🔥
   - Flame icon turns orange
   - Text says "Keep going!"

### Test 3: Test tomorrow
1. Wait until tomorrow (or manually add a session with tomorrow's date in MongoDB)
2. Add a session that meets the goal
3. **Expected:** Streak becomes "2 days"

---

## If You Still See "Goal: 21h":

### Hard Reset:
1. Stop the server (Ctrl + C)
2. Close ALL browser tabs with the app
3. Clear browser cache:
   - Chrome/Edge: Ctrl + Shift + Delete → Clear cache
   - Firefox: Ctrl + Shift + Delete → Clear cache
4. Restart the server: `node server.js`
5. Open a NEW browser tab: http://localhost:3000

### Check the File:
Open `views/index.ejs` and search for "21" - you should NOT find any references to "21h" or "Goal: 21"

---

## Verify Changes Are Applied:

Run this command to check the code:
```bash
# Windows PowerShell
Select-String -Path "views\index.ejs" -Pattern "21h"
```

**Expected result:** No matches found (empty result)

If you see matches, the file wasn't saved correctly. Make sure to save the file before restarting.

---

## Common Issues:

### Issue 1: "Cannot GET /"
**Solution:** MongoDB is not running. Start MongoDB first.

### Issue 2: Changes not showing
**Solution:** 
- Hard refresh: Ctrl + Shift + R
- Clear browser cache completely
- Make sure you saved the files

### Issue 3: Server won't start
**Solution:**
- Check if port 3000 is already in use
- Kill any other node processes
- Check MongoDB connection

---

## Quick Restart Command (Windows PowerShell):

```powershell
# Stop any running node processes and restart
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
node server.js
```

---

## Confirmation Checklist:

After restart, verify these changes:

- [ ] "This Week" card has NO progress bar
- [ ] "This Week" card says "Total study time" (not a goal)
- [ ] NO "Goal: 21h" text anywhere
- [ ] "Today's Study" shows "Goal: 2h"
- [ ] Study Streak shows "0 days" initially
- [ ] Adding 2+ hours of sessions makes streak = "1 day"
- [ ] Flame icon turns orange when streak > 0

If ALL items are checked ✅, the changes are working correctly!
