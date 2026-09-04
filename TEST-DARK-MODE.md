# Dark Mode Testing Guide

## ✅ Quick Test (5 Minutes)

### Step 1: Open the App
```
URL: http://localhost:3000
Action: Press Ctrl + Shift + R (hard refresh)
```

### Step 2: Locate Theme Toggle
- **Where:** Header, top-right area
- **Look for:** Button with moon icon 🌙 (before Statistics button)
- **Text:** Shows "Dark" in light mode

### Step 3: Toggle to Dark Mode
1. Click the theme toggle button
2. Watch the page transition smoothly
3. Everything should turn dark

**Expected Result:**
```
Before: ☀️ White background, dark text
After:  🌙 Dark background, light text
```

### Step 4: Check Key Elements

| Element | Should Be Dark | ✓ |
|---------|----------------|---|
| Page background | Dark gray | [ ] |
| Header | Dark gray-800 | [ ] |
| All 5 stat cards | Dark gray-800 | [ ] |
| Form inputs | Dark gray-700 | [ ] |
| Timer | Dark theme | [ ] |
| Charts | Visible with light text | [ ] |
| Text | Light and readable | [ ] |

### Step 5: Toggle Back to Light
1. Click theme toggle again (shows sun icon ☀️ now)
2. Page transitions back to light mode
3. Everything returns to original colors

### Step 6: Test Persistence
1. Choose dark mode
2. **Refresh page** (F5)
3. Page should load in dark mode
4. **Close browser completely**
5. Reopen and go to http://localhost:3000
6. Should still be in dark mode

---

## 🎨 Visual Reference

### Light Mode Appearance:
```
╔════════════════════════════════════╗
║  Study Time Tracker      [🌙 Dark]║  ← White header
╠════════════════════════════════════╣
║                                    ║
║  ┌─────────┐  ┌─────────┐         ║  ← White cards
║  │Today's  │  │This Week│         ║
║  │  Study  │  │         │         ║
║  └─────────┘  └─────────┘         ║
║                                    ║
╚════════════════════════════════════╝
 Gray-50 background
```

### Dark Mode Appearance:
```
╔════════════════════════════════════╗
║  Study Time Tracker      [☀️ Light]║  ← Dark gray-800 header
╠════════════════════════════════════╣
║                                    ║
║  ┌─────────┐  ┌─────────┐         ║  ← Dark gray-800 cards
║  │Today's  │  │This Week│         ║  ← Light text
║  │  Study  │  │         │         ║
║  └─────────┘  └─────────┘         ║
║                                    ║
╚════════════════════════════════════╝
 Gray-900 background
```

---

## 🔍 Detailed Component Tests

### Test 1: Header Elements
- [ ] Background changes white → dark
- [ ] "Study Time Tracker" text changes indigo-600 → indigo-400
- [ ] Subtitle text readable
- [ ] All buttons visible
- [ ] Theme toggle shows correct icon

### Test 2: Statistics Cards
For EACH of the 5 cards check:
- [ ] Card background dark
- [ ] Icon background darker shade
- [ ] Text readable (light color)
- [ ] Numbers clearly visible
- [ ] Progress bars visible

### Test 3: Forms
- [ ] "Add Study Session" card dark
- [ ] Input fields have dark background
- [ ] Text inside inputs readable
- [ ] Borders visible
- [ ] Submit button maintains color
- [ ] Error messages (if any) readable

### Test 4: Study Timer
- [ ] Timer display readable (large numbers)
- [ ] Status text visible
- [ ] Start/Stop/Resume buttons visible
- [ ] Subject input dark themed
- [ ] Info message readable

### Test 5: Charts
- [ ] Weekly chart visible
- [ ] Axis labels readable (light color)
- [ ] Monthly chart visible
- [ ] Grid lines subtle but visible
- [ ] Tooltips work (hover over bars/points)

### Test 6: Settings Modal
1. Click Settings button
2. Modal appears
- [ ] Modal background dark
- [ ] Text readable
- [ ] Input field dark
- [ ] Close button (X) visible
- [ ] Save button maintains color

### Test 7: History Section
- [ ] Date headers readable
- [ ] Session cards visible
- [ ] Subject names clear
- [ ] Duration times visible
- [ ] Edit/Delete buttons visible

---

## 🐛 Common Issues & Fixes

### Issue 1: Theme Toggle Not Visible
**Look for:** Moon icon button between title and Statistics button
**If missing:** Hard refresh (Ctrl + Shift + R)

### Issue 2: Some Parts Still Light
**Cause:** Browser cache
**Fix:** Clear cache (Ctrl + Shift + Delete) and hard refresh

### Issue 3: Theme Doesn't Save
**Test in console (F12):**
```javascript
localStorage.setItem('theme', 'dark')
location.reload()
// Should stay dark after reload
```

### Issue 4: Charts Have White Background
**This is OK!** Charts have transparent backgrounds
**Check:** Are the axis labels light colored?

### Issue 5: Text Hard to Read
**Check contrast:**
- Main text should be gray-100 (very light)
- Subtle text should be gray-400 (medium light)
- If too dark, report the specific element

---

## 📊 Test Results Template

```
Date: _______________
Browser: _____________
Version: _____________

BASIC FUNCTIONALITY
[ ] Theme toggle button visible
[ ] Clicking toggle switches theme
[ ] Smooth transition (no flash)
[ ] Icons change (moon ↔ sun)

PERSISTENCE
[ ] Theme survives page refresh
[ ] Theme survives browser restart
[ ] Correct theme loads on first visit

VISUAL QUALITY
[ ] All text readable in dark mode
[ ] Cards clearly visible
[ ] Forms usable
[ ] Charts readable
[ ] No jarring colors

RESPONSIVENESS
[ ] Works on desktop
[ ] Works on tablet (if testing)
[ ] Works on mobile (if testing)

ISSUES FOUND:
_________________________________
_________________________________
_________________________________

OVERALL: PASS / FAIL
```

---

## 🎯 Success Metrics

### Must Pass (Critical):
1. ✅ Theme toggle works
2. ✅ Theme persists
3. ✅ All text readable
4. ✅ Forms usable
5. ✅ No elements broken

### Should Pass (Important):
6. ✅ Charts update automatically
7. ✅ Smooth transitions
8. ✅ Settings modal dark
9. ✅ History readable
10. ✅ No flash on load

### Nice to Have:
11. ✅ Icons change smoothly
12. ✅ Colors look professional
13. ✅ Feels cohesive
14. ✅ Consistent throughout

---

## 🚀 Advanced Tests

### Test A: System Preference Detection
1. Set OS to dark mode
2. Clear browser data (localStorage)
3. Visit app for first time
4. **Should:** Load in dark mode automatically

### Test B: Cross-Tab Sync
1. Open app in two tabs
2. Toggle theme in Tab 1
3. **Should:** Tab 2 updates when you switch to it (refresh)

### Test C: Form Validation in Dark Mode
1. Switch to dark mode
2. Try to submit form with errors
3. **Check:** Error messages readable with red background

### Test D: Empty States
1. Fresh database or delete all sessions
2. Check "No study data yet" message
3. **Should:** Icons and text visible in dark mode

---

## ✅ Final Checklist

Before reporting "DONE":
- [ ] Tested theme toggle multiple times
- [ ] Verified theme persistence
- [ ] Checked all major components
- [ ] Tested Settings modal
- [ ] Verified charts update
- [ ] Checked forms and inputs
- [ ] Tested on actual device (not just screenshot)
- [ ] No console errors (F12 → Console tab)
- [ ] Looks professional and polished
- [ ] Would use it yourself!

---

## 📝 Feedback Template

```
WHAT WORKS WELL:
- [List what you like]

WHAT NEEDS IMPROVEMENT:
- [List issues]

SUGGESTIONS:
- [Your ideas]

OVERALL IMPRESSION:
[Your thoughts]
```

---

**Server running at:** http://localhost:3000  
**Feature:** Dark Mode implemented ✅  
**Ready to test!** 🌙

Click the theme toggle in the header and explore!
