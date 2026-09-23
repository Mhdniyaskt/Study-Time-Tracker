import React from 'react';

export default function StatCardsRow({
  todayTotal = 0,
  dailyGoal = 120,
  dailyProgress = 0,
  weeklyTotal = 0,
  monthlyTotal = 0,
  monthlySessions = 0,
  totalStudyTime = 0,
  currentStreak = 0,
  longestStreak = 0,
  todayGoalCompleted = false,
}) {
  const formatHAndM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
  };

  const formatGoal = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const dailyGoalHours = Math.floor(dailyGoal / 60);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Today's Study */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-indigo-100 dark:bg-indigo-900 rounded-lg p-2">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Today's Study</span>
        </div>
        <div className="mb-2">
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {formatHAndM(todayTotal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Goal: {dailyGoalHours}h</p>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, dailyProgress)}%` }}
          />
        </div>
      </div>

      {/* This Week */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-100 dark:bg-emerald-900 rounded-lg p-2">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">This Week</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {formatHAndM(weeklyTotal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total study time</p>
        </div>
      </div>

      {/* This Month */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-sky-100 dark:bg-sky-900 rounded-lg p-2">
            <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">This Month</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {formatHAndM(monthlyTotal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {monthlySessions} {monthlySessions === 1 ? 'session' : 'sessions'}
          </p>
        </div>
      </div>

      {/* Overall Total */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-violet-100 dark:bg-violet-900 rounded-lg p-2">
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zm6.75-9.75C9.75 2.754 10.254 2.25 10.875 2.25h2.25c.621 0 1.125.504 1.125 1.125v16.5c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 019.75 19.875V3.375zm6.75 4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.625c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.25z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Overall Total</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {formatHAndM(totalStudyTime)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">All time</p>
        </div>
      </div>

      {/* Study Streak */}
      <div
        id="streakCard"
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm transition-colors duration-200"
        title={`Current streak: ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}${longestStreak > 0 ? ` (Best: ${longestStreak} ${longestStreak === 1 ? 'day' : 'days'})` : ''}`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={`${currentStreak > 0 ? 'bg-orange-100 dark:bg-orange-900' : 'bg-gray-100 dark:bg-gray-700'} rounded-lg p-2`}>
            <span className="text-2xl">🔥</span>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Study Streak</span>
        </div>
        <div>
          <p id="streakCount" className={`text-2xl font-bold ${currentStreak > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </p>
          <p id="streakSecondary" className="text-xs text-gray-500 dark:text-gray-400">
            {todayGoalCompleted
              ? 'Goal completed today'
              : `${formatGoal(todayTotal)} / ${formatGoal(dailyGoal)} goal`}
          </p>
        </div>
      </div>
    </div>
  );
}
