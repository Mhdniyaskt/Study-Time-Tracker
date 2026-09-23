import { calculateStreak, toLocalDateString } from '../services/studyService.js';

console.log('============================================================');
console.log('COMPREHENSIVE STUDY STREAK TEST SUITE');
console.log('============================================================\n');

const results = [];
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    results.push({ name, pass: true });
  } catch (err) {
    console.error(`❌ FAIL: ${name}\n   Error: ${err.message}`);
    results.push({ name, pass: false, error: err.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// Helpers
function makeDate(daysAgo, hour = 14) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const DAILY_GOAL_MINUTES = 120; // 2 hours

// Case 1: No study -> 0
test('Case 1: No study → streak = 0, longest = 0', () => {
  const res = calculateStreak([], DAILY_GOAL_MINUTES);
  assert(res.currentStreak === 0, `Expected currentStreak 0, got ${res.currentStreak}`);
  assert(res.longestStreak === 0, `Expected longestStreak 0, got ${res.longestStreak}`);
  assert(res.todayGoalCompleted === false, `Expected todayGoalCompleted false`);
});

// Case 2: Study below goal today -> pending/in-progress (0 days streak if yesterday was not completed)
test('Case 2: Study below goal today (1h 20m / 2h) without yesterday completed → currentStreak = 0, in-progress', () => {
  const sessions = [
    { date: makeDate(0), duration: 80, durationSeconds: 4800, subject: 'Math' }
  ];
  const res = calculateStreak(sessions, DAILY_GOAL_MINUTES);
  assert(res.currentStreak === 0, `Expected currentStreak 0, got ${res.currentStreak}`);
  assert(res.todayGoalCompleted === false, `Expected todayGoalCompleted false`);
  assert(res.todayTotalSeconds === 4800, `Expected 4800s, got ${res.todayTotalSeconds}`);
});

// Case 3: Goal completed today -> streak starts/continues
test('Case 3: Goal completed today (2h 10m) → streak = 1', () => {
  const sessions = [
    { date: makeDate(0), duration: 130, durationSeconds: 7800, subject: 'Physics' }
  ];
  const res = calculateStreak(sessions, DAILY_GOAL_MINUTES);
  assert(res.currentStreak === 1, `Expected currentStreak 1, got ${res.currentStreak}`);
  assert(res.longestStreak === 1, `Expected longestStreak 1, got ${res.longestStreak}`);
  assert(res.todayGoalCompleted === true, `Expected todayGoalCompleted true`);
});

// Case 4: Yesterday completed + today incomplete -> preserve today's in-progress streak
test("Case 4: Yesterday completed (2h 30m) + today incomplete (1h 20m / 2h) → preserve yesterday's streak (1 day)", () => {
  const sessions = [
    { date: makeDate(1), duration: 150, durationSeconds: 9000, subject: 'History' },
    { date: makeDate(0), duration: 80, durationSeconds: 4800, subject: 'Math' },
  ];
  const res = calculateStreak(sessions, DAILY_GOAL_MINUTES);
  assert(res.currentStreak === 1, `Expected currentStreak 1, got ${res.currentStreak}`);
  assert(res.longestStreak === 1, `Expected longestStreak 1, got ${res.longestStreak}`);
  assert(res.todayGoalCompleted === false, `Expected todayGoalCompleted false`);
  assert(res.todayTotalSeconds === 4800, `Expected todayTotalSeconds 4800`);

  // When user finishes today's goal by adding 40 more minutes (2400s)
  const completedTodaySessions = [
    ...sessions,
    { date: makeDate(0), duration: 40, durationSeconds: 2400, subject: 'Math' }
  ];
  const res2 = calculateStreak(completedTodaySessions, DAILY_GOAL_MINUTES);
  assert(res2.currentStreak === 2, `Expected currentStreak 2 once today completes, got ${res2.currentStreak}`);
  assert(res2.longestStreak === 2, `Expected longestStreak 2, got ${res2.longestStreak}`);
  assert(res2.todayGoalCompleted === true, `Expected todayGoalCompleted true`);
});

// Case 5: Multiple consecutive completed days -> correct streak
test('Case 5: Multiple consecutive completed days (Sep 16, 17, 18, 19 all >= 2h) → correct streak = 4', () => {
  const sessions = [
    { date: makeDate(3), duration: 130, durationSeconds: 7800, subject: 'Subject A' },
    { date: makeDate(2), duration: 140, durationSeconds: 8400, subject: 'Subject B' },
    { date: makeDate(1), duration: 125, durationSeconds: 7500, subject: 'Subject C' },
    { date: makeDate(0), duration: 120, durationSeconds: 7200, subject: 'Subject D' },
  ];
  const res = calculateStreak(sessions, DAILY_GOAL_MINUTES);
  assert(res.currentStreak === 4, `Expected currentStreak 4, got ${res.currentStreak}`);
  assert(res.longestStreak === 4, `Expected longestStreak 4, got ${res.longestStreak}`);
  assert(res.todayGoalCompleted === true, `Expected todayGoalCompleted true`);
});

// Case 6: One missed completed-goal day -> streak breaks
test('Case 6: One missed completed-goal day breaks the previous streak', () => {
  const sessions = [
    { date: makeDate(4), duration: 140, durationSeconds: 8400, subject: 'Day -4' }, // ✅
    { date: makeDate(3), duration: 130, durationSeconds: 7800, subject: 'Day -3' }, // ✅
    { date: makeDate(2), duration: 45, durationSeconds: 2700, subject: 'Day -2' },   // ❌ missed (< 2h)
    { date: makeDate(1), duration: 150, durationSeconds: 9000, subject: 'Day -1' }, // ✅
    { date: makeDate(0), duration: 60, durationSeconds: 3600, subject: 'Today' },   // in progress
  ];
  const res = calculateStreak(sessions, DAILY_GOAL_MINUTES);
  assert(res.currentStreak === 1, `Expected currentStreak 1 (only Day -1 preserved), got ${res.currentStreak}`);
  assert(res.todayGoalCompleted === false, `Expected todayGoalCompleted false`);
});

// Case 7: Longest streak -> correct historical value
test('Case 7: Longest streak correctly reflects historical best (3 days) while current streak is 2 days', () => {
  // Day -6 ✅, Day -5 ✅, Day -4 ✅ (streak of 3)
  // Day -3 ❌ (missed)
  // Day -2 ✅, Day -1 ✅ (streak of 2)
  // Today in progress (below goal)
  const sessions = [
    { date: makeDate(6), duration: 130, durationSeconds: 7800, subject: 'Day -6' },
    { date: makeDate(5), duration: 140, durationSeconds: 8400, subject: 'Day -5' },
    { date: makeDate(4), duration: 125, durationSeconds: 7500, subject: 'Day -4' },
    { date: makeDate(3), duration: 50, durationSeconds: 3000, subject: 'Day -3' },
    { date: makeDate(2), duration: 130, durationSeconds: 7800, subject: 'Day -2' },
    { date: makeDate(1), duration: 150, durationSeconds: 9000, subject: 'Day -1' },
    { date: makeDate(0), duration: 80, durationSeconds: 4800, subject: 'Today' },
  ];
  const res = calculateStreak(sessions, DAILY_GOAL_MINUTES);
  assert(res.currentStreak === 2, `Expected currentStreak 2, got ${res.currentStreak}`);
  assert(res.longestStreak === 3, `Expected longestStreak 3, got ${res.longestStreak}`);
  assert(res.todayGoalCompleted === false, `Expected todayGoalCompleted false`);
});

// Case 8: Exact seconds are used for calculation
test('Case 8: Exact seconds are used: 7199s fails 2h goal, 7200s meets 2h goal', () => {
  // Goal: 120 minutes = 7200 seconds
  // Session with duration: 120 (if rounded in UI) but durationSeconds: 7199
  const sessionsFailing = [
    { date: makeDate(0), duration: 120, durationSeconds: 7199, subject: 'Exact seconds fail' }
  ];
  const resFail = calculateStreak(sessionsFailing, DAILY_GOAL_MINUTES);
  assert(resFail.todayGoalCompleted === false, `7199s should not meet 7200s goal`);
  assert(resFail.currentStreak === 0, `currentStreak should be 0 for 7199s`);

  // Adding 1 more second to reach exact 7200s
  const sessionsPassing = [
    { date: makeDate(0), duration: 120, durationSeconds: 7199, subject: 'Exact seconds fail' },
    { date: makeDate(0), duration: 0, durationSeconds: 1, subject: 'Extra 1 sec' }
  ];
  const resPass = calculateStreak(sessionsPassing, DAILY_GOAL_MINUTES);
  assert(resPass.todayGoalCompleted === true, `7200s must meet 7200s goal`);
  assert(resPass.currentStreak === 1, `currentStreak must be 1 for 7200s`);

  // Backward compatibility test: legacy session with durationSeconds = null uses duration * 60
  const legacySessions = [
    { date: makeDate(0), duration: 120, durationSeconds: null, subject: 'Legacy session' }
  ];
  const resLegacy = calculateStreak(legacySessions, DAILY_GOAL_MINUTES);
  assert(resLegacy.todayGoalCompleted === true, `Legacy session with 120 mins must meet goal`);
  assert(resLegacy.currentStreak === 1, `Legacy session currentStreak must be 1`);
});

console.log('\n============================================================');
const passCount = results.filter(r => r.pass).length;
console.log(`RESULTS: ${passCount}/${results.length} PASSED`);
console.log('============================================================\n');

if (passCount !== results.length) {
  process.exit(1);
}
