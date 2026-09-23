import React from 'react';

export default function SubjectStats({ subjectStats = [] }) {
  const maxMinutes = subjectStats.length > 0 ? subjectStats[0].totalMinutes : 0;

  const formatHAndM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Study by Subject</h2>

      {subjectStats.length > 0 ? (
        <div className="space-y-3">
          {subjectStats.map((stat, idx) => {
            const statTimeStr = formatHAndM(stat.totalMinutes);
            const progressWidth = maxMinutes > 0 ? Math.round((stat.totalMinutes / maxMinutes) * 100) : 0;

            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate pr-2">
                    {stat.subject}
                  </span>
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                    {statTimeStr}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-sm">No study data yet</p>
        </div>
      )}
    </div>
  );
}
