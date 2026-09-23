import React, { useState } from 'react';
import api from '../../services/api';

const ITEMS_PER_PAGE = 5;

export default function SessionList({
  groupedSessions = [],
  onSessionDeleted,
  onEditSession,
  onNavigateHistory,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const formatHAndM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await api.deleteSession(id);
      if (onSessionDeleted) onSessionDeleted();
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Failed to delete session: ' + err.message);
    }
  };

  const totalGroups = groupedSessions.length;
  const totalPages = Math.ceil(totalGroups / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const visibleGroups = groupedSessions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Study History</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {totalGroups > 0
              ? `${totalGroups} recorded study ${totalGroups === 1 ? 'day' : 'days'}`
              : 'Recent study sessions'}
          </p>
        </div>

        {onNavigateHistory && (
          <button
            type="button"
            onClick={onNavigateHistory}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
          >
            <span>View Full History</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        )}
      </div>

      {totalGroups === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <svg className="w-14 h-14 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
          <p className="text-base">No study sessions yet</p>
          <p className="text-sm mt-1">Add your first session above</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {visibleGroups.map((group, gIdx) => {
              const dailyTotalStr = formatHAndM(group.total);

              return (
                <div key={group.label || gIdx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Date header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {group.label}
                    </span>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded">
                      Total: {dailyTotalStr}
                    </span>
                  </div>

                  {/* Sessions for this day */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {group.sessions.map((session) => {
                      const durationStr = formatHAndM(session.duration);

                      return (
                        <div
                          key={session._id}
                          className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg p-2 shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                              {session.subject}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 py-1 rounded">
                              {durationStr}
                            </span>

                            <button
                              onClick={() => onEditSession(session)}
                              className="text-xs text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 px-2 py-1 rounded transition"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(session._id)}
                              className="text-xs text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-300 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-500 px-2 py-1 rounded transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalGroups > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{startIndex + 1}</span>–
                <span className="font-semibold text-gray-700 dark:text-gray-200">{Math.min(startIndex + ITEMS_PER_PAGE, totalGroups)}</span> of{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{totalGroups}</span> days
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      safePage === p
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
