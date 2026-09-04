# Daily Goal and Streak Update - Summary

## Changes Implemented

### 1. Daily Goal Default Changed to 2 Hours

**Files Modified:**
- `models/Settings.js`: Changed default from 180 minutes (3 hours) to 120 minutes (2 hours)
- `server.js`: Updated fallback values in multiple locations from 180 to 120 minutes

**Impact:**
- New users will see a 2-hour daily goal by default
- Existing users' custom goals are preserved (stored in database)
- The goal remains fully editable through the Settings modal

### 2. Weekly Goal Removed

**Files Modified:**
- `server.js`: 
  - Removed `weeklyGoal` variable calculations (was hardcoded to 21 hours)
  - Removed `weeklyGoal` from all `res.render()` calls
  - Updated validation error handling to exclude weekly goal
  
- `views/index.ejs`:
  - Removed weekly goal progress bar from "This Week" card
  - Removed "Goal: 21h" text
  - Changed subtitle from goal comparison to "Total study time"
  - Card now shows only weekly total without comparison

**Result:**
- Weekly study time is still displayed as a statistic
- No goal comparison or progress bar shown for weekly data
- Clean, simplified display focusing on actual time studied

### 3. Streak Rules Updated

**Old Behavior:**
- Streak counted consecutive days with at least one study session
- Any amount of study (even 1 minute) counted toward the streak

**New Behavior:**
- Streak only counts consecutive days where total study time ≥ daily goal
- Daily goal must be met or exceeded for the day to count
- If any day falls short of the goal, streak resets to 0
- Streak is recalculated correctly when app restarts

**Implementation Details:**
- Created `dailyTotalsMap` to aggregate all sessions per day
- Added `meetsGoal()` function to check if a day reaches the daily goal
- Streak calculation now checks `meetsGoal()` instead of just presence of sessions
- Applied to both main dashboard route and validation error re-render

**Example with 2-hour daily goal:**
- Day 1: 2h 30m → Counts (streak = 1)
- Day 2: 2h 0m → Counts (streak = 2)
- Day 3: 1h 45m → Doesn't count (streak = 0)
- Day 4: 3h 0m → Starts new streak (streak = 1)

### 4. Dashboard Text Updates

**Changes:**
- Today's Study: Shows current goal (e.g., "Goal: 2h")
- This Week: Changed from goal-based to informational ("Total study time")
- Study Streak: Updated subtitle text:
  - Active streak: "Keep going!" (was "Keep it up!")
  - No streak: "Reach your goal today" (was "Start today")

## Testing Recommendations

1. **Daily Goal Display:**
   - Open the app and verify the "Today's Study" card shows "Goal: 2h"
   - Open Settings modal and confirm default is 2 hours
   - Change the goal and verify it persists after restart

2. **Weekly Display:**
   - Verify "This Week" card shows total time only
   - Confirm no progress bar or goal text appears
   - Check that weekly study time is still tracked and displayed

3. **Streak Calculation:**
   - Add a session that meets the 2-hour goal → streak should be 1
   - Add sessions for consecutive days reaching the goal → streak increases
   - Add a session for the next day that's under 2 hours → streak resets to 0
   - Restart the app and verify streak persists correctly

4. **Settings Persistence:**
   - Change daily goal to 3 hours
   - Restart the app
   - Verify goal shows as 3 hours
   - Verify streak calculation now uses 3-hour threshold

## Database Impact

**No Migration Required:**
- Daily goal is stored in the `Settings` collection
- Existing users with custom goals are unaffected
- New installations will automatically use 2-hour default
- Streak is calculated on-the-fly from session data (not stored)

## Files Changed

1. `models/Settings.js` - Default daily goal
2. `server.js` - Streak logic, weekly goal removal, default values
3. `views/index.ejs` - UI updates for weekly card and streak text

## Backward Compatibility

✅ **Fully Compatible:**
- Existing study sessions unchanged
- Custom daily goals preserved
- History and statistics unaffected
- Charts continue to work normally
- Timer functionality unchanged
