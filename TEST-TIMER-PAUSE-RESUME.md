# Test Guide: Timer Pause/Resume Feature

## ✅ Server Status

- **Running:** http://localhost:3000
- **Changes Applied:** Timer now has pause/resume functionality

---

## Quick Test Steps

### Step 1: Open the App

1. Go to: **http://localhost:3000**
2. Hard refresh: **Ctrl + Shift + R**
3. Look at the "Study Timer" section (middle column)

---

### Step 2: Visual Verification

Check the initial state:

- [ ] Timer display shows: **00:00:00**
- [ ] Status shows: **"Ready to start"**
- [ ] Start button: **Green, enabled**
- [ ] Stop button: **Gray, disabled, says "Stop"**
- [ ] Reset button: **Gray, enabled**
- [ ] Submit button: **Gray, disabled**

---

### Step 3: Test Start Timer

1. **Enter subject:** Type "Test Math" in the Subject field
2. **Click "Start" button**

**Expected results:**
- [ ] Timer starts counting: 00:00:01, 00:00:02...
- [ ] Status changes to: **"Running ●"** (green text)
- [ ] Start button: **Disabled (gray)**
- [ ] Stop button: **Amber color, enabled, shows pause icon (⏸)**
- [ ] Stop button label: **"Stop"**
- [ ] Subject field: **Disabled (can't edit)**
- [ ] Submit button: **Still disabled**

---

### Step 4: Test Pause (Stop)

Wait a few seconds (let timer reach at least 00:00:10), then:

1. **Click "Stop" button** (the amber one)

**Expected results:**
- [ ] Timer **freezes** (stops counting but shows time, e.g., 00:00:15)
- [ ] Status changes to: **"Paused"** (amber text)
- [ ] Start button: **Still disabled**
- [ ] Stop button changes:
  - **Color:** Amber → Green
  - **Icon:** ⏸ → ▶
  - **Label:** "Stop" → **"Resume"**
- [ ] Submit button: **Now enabled (blue)**
- [ ] Submit shows: **"Submit (Add 15s)"** or similar
- [ ] Subject field: **Enabled (can edit)**

---

### Step 5: Test Resume

1. **Click "Resume" button** (the green one that was "Stop")

**Expected results:**
- [ ] Timer **continues** from paused time (e.g., 00:00:15 → 00:00:16...)
- [ ] Timer does **NOT** reset to 00:00:00
- [ ] Status back to: **"Running ●"**
- [ ] Stop/Resume button changes:
  - **Color:** Green → Amber
  - **Icon:** ▶ → ⏸
  - **Label:** "Resume" → **"Stop"**
- [ ] Submit button: **Disabled again**
- [ ] Subject field: **Disabled**

---

### Step 6: Test Multiple Pause/Resume Cycles

1. Wait until timer reaches ~00:00:25
2. Click "Stop" (pause) - timer freezes at 00:00:25
3. Verify button shows "Resume"
4. Click "Resume" - timer continues from 00:00:25
5. Wait until timer reaches ~00:00:40
6. Click "Stop" again - timer freezes at 00:00:40
7. Verify button shows "Resume"

**Expected:**
- [ ] Each pause preserves the time
- [ ] Each resume continues from paused time
- [ ] Button toggles correctly: Stop ↔ Resume
- [ ] Colors alternate: Amber ↔ Green

---

### Step 7: Test Submit

With timer paused (showing some time like 00:00:45):

1. **Click "Submit" button**

**Expected results:**
- [ ] Page reloads
- [ ] New session appears in "Study History"
- [ ] Session shows: "Test Math" with duration "45s" or similar
- [ ] Timer resets to: **00:00:00**
- [ ] Status back to: **"Ready to start"**
- [ ] All buttons back to initial state

---

### Step 8: Test Reset

1. Start timer again with any subject
2. Let it run to ~00:00:20
3. **Click "Reset" button**

**Expected:**
- [ ] Confirmation dialog appears: **"Reset the running timer? Your current time will be lost."**
- [ ] Click **OK**
- [ ] Timer resets to: **00:00:00**
- [ ] Status: **"Ready to start"**
- [ ] Subject field: **Cleared**
- [ ] All buttons: **Back to initial state**

---

### Step 9: Test Reset While Paused (No Confirmation)

1. Start timer
2. Let it run to ~00:00:15
3. Click "Stop" (pause)
4. **Click "Reset" button**

**Expected:**
- [ ] **NO** confirmation dialog (immediate reset)
- [ ] Timer resets to: **00:00:00**
- [ ] Status: **"Ready to start"**
- [ ] Subject field: **Cleared**

---

### Step 10: Test Subject Validation

Try to start without a subject:

1. Leave Subject field **empty**
2. Click "Start"

**Expected:**
- [ ] Timer does **NOT** start
- [ ] Error message appears: **"Subject is required."**
- [ ] Subject field has **red border**

Now test minimum length:

1. Type just **"M"** (1 character)
2. Click "Start"

**Expected:**
- [ ] Timer does **NOT** start
- [ ] Error message: **"Subject must be at least 2 characters."**

Now test with valid subject:

1. Type **"Math"** (4 characters)
2. Click "Start"

**Expected:**
- [ ] Timer **starts** successfully
- [ ] Error message **disappears**
- [ ] Subject field **normal border**

---

## Advanced Tests

### Test A: Edit Subject While Paused

1. Start timer with subject "Math"
2. Let it run to 00:00:20
3. Click "Stop" (pause)
4. Change subject to "Science"
5. Click "Submit"

**Expected:**
- [ ] Session saves with subject **"Science"** (not "Math")
- [ ] Duration is 20 seconds

---

### Test B: Timer Persistence (Page Refresh)

1. Start timer with any subject
2. Let it run to 00:00:15
3. Click "Stop" (pause) - timer at 00:00:15
4. **Refresh the page** (F5)

**Expected:**
- [ ] Timer still shows **00:00:15**
- [ ] Status: **"Paused"**
- [ ] Subject: **Still filled**
- [ ] Resume button: **Available**
- [ ] Can click "Resume" to continue

---

### Test C: Timer Persistence (Running State)

1. Start timer
2. Let it run to 00:00:10
3. **Refresh the page** (F5) while running

**Expected:**
- [ ] Timer **continues** running (doesn't reset)
- [ ] Time approximately matches (may be slightly ahead due to refresh time)
- [ ] Status: **"Running ●"**
- [ ] Stop button: **Available (amber)**

---

### Test D: Try to Submit While Running

1. Start timer
2. Let it run for a bit
3. Try to click "Submit" button

**Expected:**
- [ ] Submit button is **disabled** (gray, can't click)
- [ ] Must pause first before submitting

---

### Test E: Info Message

Look at the text below the Submit button:

**Expected:**
- [ ] Says: **"ⓘ Stop pauses the timer. Click Submit when done to save your study time."**
- [ ] (NOT the old message about "Time will be added only when you click Submit")

---

## Button Visual Reference

### Initial State (Ready):
```
┌─────────┐ ┌─────────┐ ┌─────────┐
│  Start  │ │  Stop   │ │  Reset  │
│ (Green) │ │ (Gray)  │ │ (Gray)  │
│    ▶    │ │    ■    │ │    ↻    │
└─────────┘ └─────────┘ └─────────┘
  Enabled    Disabled    Enabled
```

### Running State:
```
┌─────────┐ ┌─────────┐ ┌─────────┐
│  Start  │ │  Stop   │ │  Reset  │
│ (Gray)  │ │ (Amber) │ │ (Gray)  │
│    ▶    │ │    ⏸    │ │    ↻    │
└─────────┘ └─────────┘ └─────────┘
  Disabled   Enabled     Enabled
```

### Paused State:
```
┌─────────┐ ┌─────────┐ ┌─────────┐
│  Start  │ │ Resume  │ │  Reset  │
│ (Gray)  │ │ (Green) │ │ (Gray)  │
│    ▶    │ │    ▶    │ │    ↻    │
└─────────┘ └─────────┘ └─────────┘
  Disabled   Enabled     Enabled
```

---

## Common Issues & Solutions

### Issue: Stop button stays as "Stop" (doesn't change to "Resume")

**Solution:** Hard refresh the browser (Ctrl + Shift + R) to clear cache

---

### Issue: Timer resets to 00:00:00 after pause

**Problem:** You might be using the old version

**Solution:** 
1. Clear browser cache completely
2. Restart server
3. Hard refresh

---

### Issue: Submit button doesn't enable after pausing

**Check:**
1. Is timer actually paused? (status should say "Paused")
2. Is there any time recorded? (must be at least 1 second)
3. Is subject valid? (2-50 characters)

---

### Issue: Changes not showing

**Solution:**
```powershell
# Stop server
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Clear browser cache (Ctrl + Shift + Delete)

# Start server fresh
node server.js

# Hard refresh browser (Ctrl + Shift + R)
```

---

## Success Criteria

✅ **All these must work:**

1. [ ] Timer starts with valid subject
2. [ ] Stop button pauses (freezes time)
3. [ ] Resume button continues from paused time
4. [ ] Button label toggles: Stop ↔ Resume
5. [ ] Button color changes: Amber ↔ Green
6. [ ] Multiple pause/resume cycles work
7. [ ] Submit only works when paused
8. [ ] Reset works with confirmation when running
9. [ ] Subject validation works
10. [ ] Timer persists across page refresh
11. [ ] Time does NOT reset to 00:00:00 when resuming

---

## Quick Test Script (Copy to Browser Console)

Press F12 and paste this into the console:

```javascript
// Check timer elements exist and initial state
const startBtn = document.getElementById('timerStartBtn');
const stopBtn = document.getElementById('timerStopBtn');
const resetBtn = document.getElementById('timerResetBtn');

console.log('=== TIMER BUTTON CHECK ===');
console.log('Start button:', startBtn ? '✅ Found' : '❌ Missing');
console.log('Stop button:', stopBtn ? '✅ Found' : '❌ Missing');
console.log('Reset button:', resetBtn ? '✅ Found' : '❌ Missing');

if (stopBtn) {
  const stopText = stopBtn.querySelector('span:last-child')?.textContent;
  console.log('Stop button label:', stopText);
  console.log('Expected: "Stop" or "Resume"');
  
  if (stopText === 'Stop' || stopText === 'Resume') {
    console.log('✅ Button label is correct');
  } else {
    console.log('❌ Button label is wrong');
  }
}

console.log('\nℹ️ If all checks pass, the update is working!');
```

---

## Timing Reference

For testing, use these time markers:

- **10 seconds:** Quick test
- **30 seconds:** Short pause/resume test
- **1 minute:** Medium test
- **2 minutes:** Verify it counts toward daily goal

---

**Server is running at:** http://localhost:3000  
**Feature:** Pause/Resume timer implemented ✅  
**Ready to test!** 🚀
