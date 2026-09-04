# Testing Checklist: Daily Goals & Streaks Update

## Pre-Testing Setup

- [ ] MongoDB is running
- [ ] `.env` file is configured with `MONGODB_URI`
- [ ] Run `node server.js` to start the application
- [ ] Open http://localhost:3000 in your browser

---

## Test 1: Daily Goal Default (New Installation)

**For testing, you may need to delete the Settings document from MongoDB:**

```javascript
// In MongoDB shell or Compass:
db.settings.deleteMany({})
```

### Steps:
1. [ ] Delete all settings from database (or use a fresh database)
2. [ ] Restart the app
3. [ ] Check "Today's Study" card

### Expected Results:
- [ ] Shows "Goal: 2h" (not 3h)
- [ ] Progress bar appears correctly
- [ ] Settings modal shows "2" as default value

---

## Test 2: Weekly Goal Removal

### Steps:
1. [ ] Look at the "This Week" card on dashboard

### Expected Results:
- [ ] Card shows weekly total time only
- [ ] **NO** progress bar visible
- [ ] **NO** "Goal: 21h" text visible
- [ ] Subtitle says "Total study time" (not goal-related)
- [ ] Weekly total still calculates correctly

---

## Test 3: Streak - No Streak When Under Goal

### Steps:
1. [ ] Set daily goal to 2 hours (Settings)
2. [ ] Add a session: 1 hour 30 minutes
3. [ ] Check the Study Streak card

### Expected Results:
- [ ] Streak shows "0 days"
- [ ] Gray flame icon (not orange)
- [ ] Text says "Reach your goal today"

---

## Test 4: Streak - Day 1 When Goal Met

### Steps:
1. [ ] Continue from Test 3
2. [ ] Add another session: 30 minutes (total now = 2h)
3. [ ] Refresh the page
4. [ ] Check the Study Streak card

### Expected Results:
- [ ] Streak shows "1 day"
- [ ] Orange flame icon
- [ ] Text says "Keep going!"
- [ ] "Today's Study" shows 100% progress

---

## Test 5: Streak - Consecutive Days

### Preparation:
You need to create sessions with specific dates. Use MongoDB:

```javascript
// Add session for yesterday that meets 2h goal
db.studysessions.insertOne({
  subject: "Test Subject",
  duration: 130, // 2h 10m in minutes
  date: new Date(Date.now() - 24*60*60*1000), // yesterday
  createdAt: new Date()
})

// Add session for today that meets 2h goal
db.studysessions.insertOne({
  subject: "Test Subject",
  duration: 125, // 2h 5m in minutes
  date: new Date(), // today
  createdAt: new Date()
})
```

### Steps:
1. [ ] Add sessions for yesterday and today (both ≥ 2 hours)
2. [ ] Refresh the dashboard

### Expected Results:
- [ ] Streak shows "2 days"
- [ ] Orange flame icon
- [ ] Text says "Keep going!"

---

## Test 6: Streak - Break and Reset

### Preparation:
```javascript
// Add session for 3 days ago that meets goal
db.studysessions.insertOne({
  subject: "Test Subject",
  duration: 140,
  date: new Date(Date.now() - 3*24*60*60*1000),
  createdAt: new Date()
})

// Add session for 2 days ago that DOESN'T meet goal
db.studysessions.insertOne({
  subject: "Test Subject",
  duration: 90, // only 1h 30m
  date: new Date(Date.now() - 2*24*60*60*1000),
  createdAt: new Date()
})

// Sessions from Test 5 still exist for yesterday and today (both meet goal)
```

### Steps:
1. [ ] Set up sessions as above
2. [ ] Refresh dashboard

### Expected Results:
- [ ] Streak shows "2 days" (only yesterday and today count)
- [ ] Day from 3 days ago is NOT counted (broken by the day 2 days ago)

---

## Test 7: Streak - Today Must Also Meet Goal

### Steps:
1. [ ] Delete today's sessions
2. [ ] Ensure yesterday has a session ≥ 2 hours
3. [ ] Refresh dashboard

### Expected Results:
- [ ] Streak shows "0 days"
- [ ] Even though yesterday met the goal
- [ ] Text says "Reach your goal today"

---

## Test 8: Settings Persistence

### Steps:
1. [ ] Open Settings modal
2. [ ] Change daily goal to 3.5 hours
3. [ ] Click "Save Settings"
4. [ ] Wait for page refresh
5. [ ] Check "Today's Study" card
6. [ ] Restart the server (`Ctrl+C`, then `node server.js` again)
7. [ ] Refresh browser

### Expected Results:
- [ ] After save: "Goal: 3.5h" appears
- [ ] After restart: Goal still shows 3.5h
- [ ] Streak calculation now uses 3.5h threshold
- [ ] Settings modal shows 3.5 when reopened

---

## Test 9: Streak with Changed Goal

### Steps:
1. [ ] With daily goal at 2 hours
2. [ ] Add session for today: 2h 30m (meets 2h goal)
3. [ ] Verify streak = 1 day
4. [ ] Change goal to 3 hours
5. [ ] Refresh page

### Expected Results:
- [ ] Streak becomes 0 (today's 2h 30m is now under the 3h goal)
- [ ] "Today's Study" progress bar shows ~83%

---

## Test 10: Multiple Sessions Same Day

### Steps:
1. [ ] Set goal to 2 hours
2. [ ] Add session 1: 45 minutes
3. [ ] Refresh - check streak
4. [ ] Add session 2: 30 minutes (total = 1h 15m)
5. [ ] Refresh - check streak
6. [ ] Add session 3: 1 hour (total = 2h 15m)
7. [ ] Refresh - check streak

### Expected Results:
- [ ] After session 1: Streak = 0
- [ ] After session 2: Streak = 0
- [ ] After session 3: Streak = 1 (total finally meets goal)

---

## Test 11: Study Timer Integration

### Steps:
1. [ ] Set daily goal to 2 hours
2. [ ] Current day has 1h 30m already logged
3. [ ] Use Study Timer for 35 minutes
4. [ ] Stop and Submit the timer
5. [ ] Check streak

### Expected Results:
- [ ] Timer time adds to daily total
- [ ] Total becomes 2h 5m
- [ ] Streak changes from 0 to 1

---

## Test 12: History Page (No Breaking Changes)

### Steps:
1. [ ] Navigate to History page
2. [ ] Check various date filters
3. [ ] Verify session display

### Expected Results:
- [ ] All sessions display correctly
- [ ] Date filtering works
- [ ] No weekly goal references appear
- [ ] Statistics calculate correctly

---

## Test 13: Statistics Page (No Breaking Changes)

### Steps:
1. [ ] Navigate to Statistics page
2. [ ] Try different period filters
3. [ ] Check charts and subject breakdown

### Expected Results:
- [ ] All statistics calculate correctly
- [ ] Charts render properly
- [ ] No weekly goal references appear
- [ ] Subject stats show correctly

---

## Test 14: Edge Cases

### Test 14a: Exactly Meeting Goal
1. [ ] Set goal to 2 hours
2. [ ] Add session: exactly 120 minutes
3. [ ] Expected: Streak = 1 (≥ counts)

### Test 14b: Goal of 0.5 hours
1. [ ] Set goal to 0.5 hours (30 minutes)
2. [ ] Add session: 30 minutes
3. [ ] Expected: Streak = 1

### Test 14c: Very High Goal
1. [ ] Set goal to 12 hours
2. [ ] Add session: 8 hours
3. [ ] Expected: Streak = 0 (under goal)

### Test 14d: Session on Future Date
1. [ ] Manually add session with tomorrow's date
2. [ ] Expected: Doesn't affect today's streak

---

## Test 15: App Restart Persistence

### Steps:
1. [ ] Build a 3-day streak (verify on dashboard)
2. [ ] Note the exact streak count
3. [ ] Close browser
4. [ ] Stop server (Ctrl+C)
5. [ ] Restart server
6. [ ] Open browser and navigate to app

### Expected Results:
- [ ] Streak count is identical
- [ ] Calculated from session data, not cached
- [ ] All sessions are accounted for

---

## Regression Testing

Ensure existing features still work:

### Session Management
- [ ] Add study session (form) - works
- [ ] Edit study session - works
- [ ] Delete study session - works
- [ ] Form validation - works

### Timer
- [ ] Start timer - works
- [ ] Stop timer - works
- [ ] Reset timer - works
- [ ] Submit timer - works
- [ ] Timer subject validation - works

### Charts
- [ ] Weekly chart renders - works
- [ ] Monthly chart renders - works
- [ ] Data displays correctly - works

### Navigation
- [ ] Home/Dashboard - loads
- [ ] History - loads
- [ ] Statistics - loads
- [ ] Settings modal - opens/closes

---

## Clean Up After Testing

```javascript
// If you want to reset test data:
db.studysessions.deleteMany({})
db.settings.deleteMany({})
```

Then restart the app for a fresh start.

---

## Bug Report Template

If you find issues, report them with:

**Bug:** [Brief description]  
**Steps to Reproduce:**  
1. [Step 1]
2. [Step 2]

**Expected:** [What should happen]  
**Actual:** [What actually happened]  
**Streak count:** [Number shown]  
**Daily goal:** [Current goal setting]  
**Today's total:** [Study time today]

---

## Success Criteria

All tests pass ✅:
- [ ] Daily goal defaults to 2 hours
- [ ] Weekly goal is removed from UI
- [ ] Streak requires meeting daily goal
- [ ] Streak calculates correctly over multiple days
- [ ] Streak resets when goal not met
- [ ] Settings persist after restart
- [ ] No existing features are broken
- [ ] All pages load without errors
