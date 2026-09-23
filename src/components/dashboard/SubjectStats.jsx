import React, { useState } from 'react';

export default function SubjectStats({ subjectStats = [], todaySubjectStats = [] }) {
  const [viewTab, setViewTab] = useState('today'); // 'today' | 'all'

  const activeStats = viewTab === 'today' ? todaySubjectStats : subjectStats;
  const maxMinutes = activeStats.length > 0 ? activeStats[0].totalMinutes : 0;

  const formatHAndM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const totalMinutes = activeStats.reduce((sum, s) => sum + s.totalMinutes, 0);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* Header & Tabs */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Study by Subject
          </h2>

          <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewTab('today')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewTab === 'today'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setViewTab('all')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewTab === 'all'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Total Header for selected tab */}
        {activeStats.length > 0 && (
          <div className="mb-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-700/60">
            <span>{viewTab === 'today' ? "Today's Study Total" : "All Time Total"}</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{formatHAndM(totalMinutes)}</span>
          </div>
        )}

        {/* Subject Progress Bars */}
        {activeStats.length > 0 ? (
          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            {activeStats.map((stat, idx) => {
              const statTimeStr = formatHAndM(stat.totalMinutes);
              const progressWidth = maxMinutes > 0 ? Math.round((stat.totalMinutes / maxMinutes) * 100) : 0;

              return (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-200 truncate pr-2">
                      {stat.subject}
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {statTimeStr}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-300"
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-xs">
              {viewTab === 'today' ? 'No study logged today yet' : 'No study data recorded yet'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-400 text-center">
        {activeStats.length} {activeStats.length === 1 ? 'subject' : 'subjects'} tracked
      </div>
    </div>
  );
}
