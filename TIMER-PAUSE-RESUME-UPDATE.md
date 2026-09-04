# Timer Pause/Resume Update

## Changes Implemented

### ✅ New Timer Controls

The Study Timer now has **Pause/Resume functionality** instead of a simple Stop button.

---

## How It Works Now

### States

1. **Ready** - Initial state, timer at 00:00:00
2. **Running** - Timer is actively counting
3. **Paused** - Timer is stopped but time is preserved

### Button Behavior

#### Start Button (Green)
- **Shows:** When timer is in "Ready" state
- **Action:** Starts the timer from 00:00:00
- **Requires:** Subject must be filled in (2-50 characters)
- **After click:** Button becomes disabled, Stop button becomes active

#### Stop/Resume Button (Changes dynamically)
- **When Running (Amber):**
  - Label: "Stop" with pause icon (⏸)
  - Action: Pauses the timer
  - Time is frozen and preserved
  - Button changes to "Resume"
  
- **When Paused (Green):**
  - Label: "Resume" with play icon (▶)
  - Action: Continues timer from paused time
  - Does NOT reset to 00:00:00
  - Button changes back to "Stop"

#### Reset Button (Gray)
- **Always available**
- **Action:** Resets timer to 00:00:00
- **State:** Returns to "Ready" state
- **Confirmation:** Asks for confirmation if timer is running

#### Submit Button (Blue)
- **Enabled when:** Timer is paused
- **Action:** Saves the study session to database
- **Shows:** "Submit (Add [time])" when paused
- **Requires:** Subject validation (can be edited while paused)

---

## User Flow Examples

### Example 1: Basic Study Session

1. **Start:**
   - Enter subject: "Mathematics"
   - Click "Start"
   - Timer begins: 00:00:01, 00:00:02...

2. **Pause (Take a break):**
   - Click "Stop" (pause button)
   - Timer shows: 00:15:30 (frozen)
   - Status: "Paused"
   - Submit button now enabled

3. **Resume:**
   - Click "Resume"
   - Timer continues: 00:15:31, 00:15:32...
   - Status: "Running ●"

4. **Finish:**
   - Click "Stop" again
   - Timer shows: 00:45:20 (frozen)
   - Click "Submit (Add 45m 20s)"
   - Session saved!

---

### Example 2: Multiple Pause/Resume Cycles

```
Start → 00:00:00
Running for 20 minutes...
Stop (Pause) → 00:20:00 (take 5-min break)
Resume → 00:20:00
Running for 15 more minutes...
Stop (Pause) → 00:35:00 (another break)
Resume → 00:35:00
Running for 10 more minutes...
Stop (Pause) → 00:45:00
Submit → Session saved with 45 minutes
```

**Total study time:** 45 minutes (breaks not counted)

---

### Example 3: Reset During Session

```
Start → 00:00:00
Running for 10 minutes...
Oops, wrong subject!
Click "Reset" → Confirm "Yes"
Timer → 00:00:00 (Ready state)
Change subject
Start again → New session
```

---

## Visual Changes

### Button States

#### Ready State:
```
[  Start  ]  [  Stop   ]  [  Reset  ]
   (Green)     (Disabled)    (Gray)
```

#### Running State:
```
[  Start  ]  [  Stop   ]  [  Reset  ]
  (Disabled)   (Amber)       (Gray)
                 ⏸
```

#### Paused State:
```
[  Start  ]  [ Resume  ]  [  Reset  ]
  (Disabled)   (Green)       (Gray)
                 ▶
```

---

## Technical Details

### State Management

**Before (Old):**
- States: `ready`, `running`, `stopped`
- Stop button completely stopped the timer
- No way to resume

**After (New):**
- States: `ready`, `running`, `paused`
- Stop button pauses (preserves time)
- Resume button continues from paused time

### Timer Calculation

```javascript
// When paused:
timerElapsedSeconds += (now - timerStartTime) / 1000
timerStartTime = null

// When resumed:
timerStartTime = Date.now()
// timerElapsedSeconds is preserved!

// Display calculation:
currentElapsed = timerElapsedSeconds + 
                 (timerState === 'running' ? 
                  (now - timerStartTime) / 1000 : 0)
```

### LocalStorage Persistence

The timer state persists across page refreshes:
- Current state (ready/running/paused)
- Elapsed seconds
- Subject
- Start time (if running)

This means you can:
- Refresh the page and timer continues
- Navigate away and come back
- Close browser and reopen (timer continues where you left off)

---

## Status Indicators

### Status Text (below timer display):

- **"Ready to start"** - Gray text
- **"Running ●"** - Green text with dot
- **"Paused"** - Amber text

### Button Colors:

- **Start:** Green (emerald-600)
- **Stop (while running):** Amber (amber-600)
- **Resume (while paused):** Green (emerald-600)
- **Reset:** Gray (gray-500)
- **Submit:** Blue (indigo-600)

---

## Subject Validation

### Requirements:
- Must be filled before starting
- Minimum 2 characters
- Maximum 50 characters
- Can be edited while paused (before submit)
- Cannot be edited while running

### Validation Triggers:
- Before starting timer
- Before submitting session

### Error Messages:
- "Subject is required."
- "Subject must be at least 2 characters."
- "Subject must be 50 characters or fewer."

---

## Submit Behavior

### Submit is enabled when:
- Timer is in "Paused" state
- At least 1 second has elapsed
- Subject is valid

### Submit shows:
- "Submit" - when not paused
- "Submit (Add 45m 20s)" - when paused (shows exact time)

### After submit:
- Session saved to database
- Timer resets to 00:00:00
- State returns to "Ready"
- Page reloads to show new session

---

## Reset Behavior

### When Ready or Paused:
- Immediately resets to 00:00:00
- Clears subject
- Returns to "Ready" state

### When Running:
- Shows confirmation: "Reset the running timer? Your current time will be lost."
- If confirmed: resets
- If cancelled: continues running

---

## Integration with Existing Features

### ✅ Daily Goal Tracking
- Only counts when you click "Submit"
- Paused time is preserved
- Multiple pause/resume cycles supported

### ✅ Streak Calculation
- Session only counts after submit
- Paused time doesn't affect streak
- Works with 2-hour daily goal requirement

### ✅ History & Statistics
- Sessions appear after submit
- Shows total study time (pauses not included)
- Subject and duration recorded accurately

### ✅ Electron Integration
- Pause state syncs with Electron
- Floating widget shows pause/resume
- State persists across main and floating windows

---

## Testing Checklist

### Basic Functions:
- [ ] Start timer with valid subject
- [ ] Pause timer (shows elapsed time)
- [ ] Resume timer (continues from paused time)
- [ ] Multiple pause/resume cycles work
- [ ] Submit saves session
- [ ] Reset clears timer

### Subject Validation:
- [ ] Cannot start without subject
- [ ] Error shows for empty subject
- [ ] Error shows for subject < 2 chars
- [ ] Error shows for subject > 50 chars
- [ ] Can edit subject while paused

### Button States:
- [ ] Stop button shows "Stop" when running
- [ ] Stop button shows "Resume" when paused
- [ ] Stop button changes color (amber ↔ green)
- [ ] Submit enabled only when paused
- [ ] Start disabled when not in ready state

### Timer Persistence:
- [ ] Timer survives page refresh
- [ ] Paused state persists
- [ ] Running state continues after refresh
- [ ] Subject persists

### Edge Cases:
- [ ] Reset during running asks confirmation
- [ ] Reset while paused works immediately
- [ ] Submit requires paused state
- [ ] Cannot submit while running
- [ ] Minimum 1 second required to submit

---

## Differences from Old Behavior

### Old (Stop):
```
Start → Running → Stop → Can Submit
                 (Time frozen, cannot resume)
```

### New (Pause/Resume):
```
Start → Running → Stop (Pause) → Can Resume or Submit
                  ↓
                Resume → Running (continues from paused time)
```

---

## Key Benefits

1. **Flexibility:** Take breaks without losing time
2. **Accuracy:** Only counts actual study time
3. **Natural flow:** Matches real study patterns
4. **Intuitive:** Pause/Resume is familiar to users
5. **No data loss:** Can pause and resume multiple times

---

## Info Message Update

**Old:** "ⓘ Time will be added only when you click Submit."

**New:** "ⓘ Stop pauses the timer. Click Submit when done to save your study time."

This clarifies that "Stop" means "Pause" and emphasizes the submit step.

---

## Files Modified

- `views/index.ejs` - Timer JavaScript implementation

### Lines Changed:
- State definition: `'stopped'` → `'paused'`
- `updateUI()`: Added pause state handling + button label changes
- `stopTimer()`: Converted to pause/resume toggle
- `submitTimer()`: Changed from `'stopped'` to `'paused'`
- Electron integration: Updated pause state handling
- Info message: Updated to mention pause behavior

---

## Backward Compatibility

### Session Data:
- ✅ No changes to database structure
- ✅ All existing sessions intact
- ✅ Submit behavior unchanged (still saves to DB)

### Features:
- ✅ All features work as before
- ✅ Timer still tracks seconds accurately
- ✅ History and stats unchanged
- ✅ Goal tracking unchanged

### LocalStorage:
- Old timer states automatically migrate
- `'stopped'` treated as `'paused'` if found

---

## Summary

**What changed:**
- Stop button now pauses (preserves time)
- New Resume button to continue from pause
- Button dynamically changes label and color
- "Paused" state replaces "Stopped"

**What stayed the same:**
- Start requires subject validation
- Reset clears timer to 00:00:00
- Submit saves session to database
- Timer persistence works as before
- All existing features intact

**Result:**
More flexible and user-friendly timer that matches natural study patterns with breaks!
