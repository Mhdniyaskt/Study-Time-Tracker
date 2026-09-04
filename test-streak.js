/**
 * Test Script: Verify Streak Calculation Logic
 * 
 * This script demonstrates how the streak calculation works
 * Run with: node test-streak.js
 */

// Simulate the streak calculation logic from server.js
function calculateStreak(sessions, dailyGoal) {
  // Helper to get date string in YYYY-MM-DD format
  const toLocalDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Build daily totals map
  const dailyTotalsMap = {};
  for (const session of sessions) {
    const dateStr = toLocalDateString(session.date);
    dailyTotalsMap[dateStr] = (dailyTotalsMap[dateStr] || 0) + session.duration;
  }

  // Check if a day meets the goal
  const meetsGoal = (dateStr) => {
    const total = dailyTotalsMap[dateStr] || 0;
    return total >= dailyGoal;
  };

  // Calculate streak
  let currentStreak = 0;
  const now = new Date();
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  let cursorStr = toLocalDateString(cursor);
  
  // Streak only starts if today meets the goal
  if (meetsGoal(cursorStr)) {
    while (meetsGoal(cursorStr)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
      cursorStr = toLocalDateString(cursor);
    }
  }

  return {
    streak: currentStreak,
    dailyTotals: dailyTotalsMap
  };
}

// Test Cases
console.log('='.repeat(60));
console.log('STREAK CALCULATION TEST SUITE');
console.log('='.repeat(60));

const dailyGoal = 120; // 2 hours in minutes
console.log(`\nDaily Goal: ${dailyGoal} minutes (2 hours)\n`);

// Test 1: No sessions
console.log('TEST 1: No Sessions');
console.log('-'.repeat(60));
const test1 = calculateStreak([], dailyGoal);
console.log(`Result: Streak = ${test1.streak} days`);
console.log(`Expected: 0 days`);
console.log(`Status: ${test1.streak === 0 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Today only, under goal
console.log('TEST 2: Today Only - Under Goal (90 minutes)');
console.log('-'.repeat(60));
const today = new Date();
const test2Sessions = [
  { date: today, duration: 90, subject: 'Math' }
];
const test2 = calculateStreak(test2Sessions, dailyGoal);
console.log(`Result: Streak = ${test2.streak} days`);
console.log(`Expected: 0 days (90 < 120)`);
console.log(`Status: ${test2.streak === 0 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Today only, meets goal exactly
console.log('TEST 3: Today Only - Meets Goal Exactly (120 minutes)');
console.log('-'.repeat(60));
const test3Sessions = [
  { date: today, duration: 120, subject: 'Math' }
];
const test3 = calculateStreak(test3Sessions, dailyGoal);
console.log(`Result: Streak = ${test3.streak} days`);
console.log(`Expected: 1 day (120 = 120)`);
console.log(`Status: ${test3.streak === 1 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: Today exceeds goal
console.log('TEST 4: Today Only - Exceeds Goal (150 minutes)');
console.log('-'.repeat(60));
const test4Sessions = [
  { date: today, duration: 150, subject: 'Math' }
];
const test4 = calculateStreak(test4Sessions, dailyGoal);
console.log(`Result: Streak = ${test4.streak} days`);
console.log(`Expected: 1 day (150 > 120)`);
console.log(`Status: ${test4.streak === 1 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: Multiple sessions same day reaching goal
console.log('TEST 5: Multiple Sessions Today - Total Meets Goal');
console.log('-'.repeat(60));
const test5Sessions = [
  { date: today, duration: 45, subject: 'Math' },
  { date: today, duration: 30, subject: 'Science' },
  { date: today, duration: 50, subject: 'History' }
];
const test5 = calculateStreak(test5Sessions, dailyGoal);
console.log(`Sessions: 45m + 30m + 50m = 125m total`);
console.log(`Result: Streak = ${test5.streak} days`);
console.log(`Expected: 1 day (125 > 120)`);
console.log(`Status: ${test5.streak === 1 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 6: Yesterday meets, today doesn't
console.log('TEST 6: Yesterday Meets Goal, Today Doesn\'t');
console.log('-'.repeat(60));
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const test6Sessions = [
  { date: yesterday, duration: 130, subject: 'Math' },
  { date: today, duration: 60, subject: 'Science' }
];
const test6 = calculateStreak(test6Sessions, dailyGoal);
console.log(`Yesterday: 130m ✅, Today: 60m ❌`);
console.log(`Result: Streak = ${test6.streak} days`);
console.log(`Expected: 0 days (today must also meet goal)`);
console.log(`Status: ${test6.streak === 0 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 7: Two consecutive days both meet goal
console.log('TEST 7: Two Consecutive Days Both Meet Goal');
console.log('-'.repeat(60));
const test7Sessions = [
  { date: yesterday, duration: 130, subject: 'Math' },
  { date: today, duration: 125, subject: 'Science' }
];
const test7 = calculateStreak(test7Sessions, dailyGoal);
console.log(`Yesterday: 130m ✅, Today: 125m ✅`);
console.log(`Result: Streak = ${test7.streak} days`);
console.log(`Expected: 2 days`);
console.log(`Status: ${test7.streak === 2 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 8: Streak broken in the middle
console.log('TEST 8: Streak Broken in the Middle');
console.log('-'.repeat(60));
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(today.getDate() - 3);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(today.getDate() - 2);
const test8Sessions = [
  { date: threeDaysAgo, duration: 140, subject: 'Math' },    // ✅
  { date: twoDaysAgo, duration: 80, subject: 'Science' },    // ❌ breaks streak
  { date: yesterday, duration: 130, subject: 'History' },     // ✅
  { date: today, duration: 125, subject: 'English' }          // ✅
];
const test8 = calculateStreak(test8Sessions, dailyGoal);
console.log(`3 days ago: 140m ✅`);
console.log(`2 days ago: 80m ❌ (breaks streak)`);
console.log(`Yesterday: 130m ✅`);
console.log(`Today: 125m ✅`);
console.log(`Result: Streak = ${test8.streak} days`);
console.log(`Expected: 2 days (only yesterday and today count)`);
console.log(`Status: ${test8.streak === 2 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 9: Long streak
console.log('TEST 9: Seven Day Streak');
console.log('-'.repeat(60));
const test9Sessions = [];
for (let i = 0; i < 7; i++) {
  const date = new Date(today);
  date.setDate(today.getDate() - i);
  test9Sessions.push({ date, duration: 120 + i * 10, subject: 'Study' });
}
const test9 = calculateStreak(test9Sessions, dailyGoal);
console.log(`7 consecutive days, all meeting goal`);
console.log(`Result: Streak = ${test9.streak} days`);
console.log(`Expected: 7 days`);
console.log(`Status: ${test9.streak === 7 ? '✅ PASS' : '❌ FAIL'}\n`);

// Summary
console.log('='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`
✅ All tests demonstrate the streak logic:
   1. Streak counts consecutive days ending with TODAY
   2. Each day must meet or exceed the daily goal
   3. Multiple sessions on the same day are summed
   4. If TODAY doesn't meet the goal, streak is 0
   5. A day under the goal breaks the streak

🔥 This is the NEW streak behavior implemented in your app!
`);
