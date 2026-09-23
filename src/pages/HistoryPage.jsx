import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import CustomRangeModal from '../components/history/CustomRangeModal';
import EditSessionModal from '../components/common/EditSessionModal';

const DEFAULT_PAGE_LIMIT = 10;

export default function HistoryPage({ onNavigateDashboard }) {
  const [period, setPeriod] = useState('all-time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(DEFAULT_PAGE_LIMIT);

  const [historyData, setHistoryData] = useState({
    period: 'all-time',
    periodLabel: 'All Time',
    totalStudyTime: 0,
    numberOfSessions: 0,
    subjectStats: [],
    dailyTotals: [],
    groupedSessions: [],
    sessions: [],
    pagination: {
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      total: 0,
      totalPages: 1,
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  const loadHistory = useCallback(async (p = period, s = startDate, e = endDate, pg = currentPage, lim = pageLimit) => {
    try {
      setError('');
      setIsLoading(true);
      const data = await api.getHistory({
        period: p,
        startDate: s,
        endDate: e,
        page: pg,
        limit: lim,
      });
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(err.message || 'Failed to load history data.');
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, currentPage, pageLimit]);

  useEffect(() => {
    loadHistory(period, startDate, endDate, currentPage, pageLimit);
  }, [period, startDate, endDate, currentPage, pageLimit, loadHistory]);

  const handleSelectPeriod = (newPeriod) => {
    if (newPeriod === 'custom') {
      setIsCustomModalOpen(true);
    } else {
      setPeriod(newPeriod);
      setStartDate('');
      setEndDate('');
      setCurrentPage(1);
    }
  };

  const handleApplyCustomRange = (start, end) => {
    setPeriod('custom');
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (historyData.pagination && newPage > historyData.pagination.totalPages)) return;
    setCurrentPage(newPage);
  };

  const getPageNumbers = (current, total) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await api.deleteSession(id);
      if (historyData.sessions.length <= 1 && currentPage > 1) {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else {
        loadHistory(period, startDate, endDate, currentPage, pageLimit);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Failed to delete session: ' + err.message);
    }
  };

  const formatHAndM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
  };

  const maxMinutes = historyData.subjectStats.length > 0 ? historyData.subjectStats[0].totalMinutes : 0;
  const avgMins = historyData.numberOfSessions > 0
    ? Math.round(historyData.totalStudyTime / historyData.numberOfSessions)
    : 0;

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this-week', label: 'This Week' },
    { id: 'last-week', label: 'Last Week' },
    { id: 'this-month', label: 'This Month' },
    { id: 'last-month', label: 'Last Month' },
    { id: 'all-time', label: 'All Time' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Subheader / Period Filter Bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm transition-colors duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Study History</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">View and filter your recorded study sessions</p>
          </div>
          {onNavigateDashboard && (
            <button
              onClick={onNavigateDashboard}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          )}
        </div>

        {/* Period Buttons */}
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPeriod(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                period === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => handleSelectPeriod('custom')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              period === 'custom'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Period Title */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{historyData.periodLabel}</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 3 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Study Time */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 dark:bg-indigo-900 rounded-lg p-2">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Study Time</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {formatHAndM(historyData.totalStudyTime)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{historyData.totalStudyTime} minutes</p>
          </div>
        </div>

        {/* Number of Sessions */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 dark:bg-emerald-900 rounded-lg p-2">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Sessions</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{historyData.numberOfSessions}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {historyData.numberOfSessions} {historyData.numberOfSessions === 1 ? 'session' : 'sessions'} recorded
            </p>
          </div>
        </div>

        {/* Average per Session */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-violet-100 dark:bg-violet-900 rounded-lg p-2">
              <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Average per Session</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {formatHAndM(avgMins)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">per session</p>
          </div>
        </div>
      </div>

      {/* 2-Column: Study by Subject & Daily Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Study by Subject */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Study by Subject</h2>

          {historyData.subjectStats.length > 0 ? (
            <div className="space-y-3">
              {historyData.subjectStats.map((stat, idx) => {
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
              <p className="text-sm">No study data for this period</p>
            </div>
          )}
        </div>

        {/* Daily Totals */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Daily Totals</h2>

          {historyData.dailyTotals.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {historyData.dailyTotals.map((day, idx) => {
                const dayTimeStr = formatHAndM(day.minutes);
                const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition">
                    <span className="text-sm text-gray-700 dark:text-gray-200">{formattedDate}</span>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{dayTimeStr}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <p className="text-sm">No study data for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Study Sessions grouped by date */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Study Sessions ({historyData.numberOfSessions})
        </h2>

        {historyData.groupedSessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <svg className="w-14 h-14 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
            <p className="text-base">No sessions found</p>
            <p className="text-sm mt-1">Try selecting a different period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyData.groupedSessions.map((group, gIdx) => {
              const dailyTotalStr = formatHAndM(group.total);

              return (
                <div key={gIdx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{group.label}</span>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded">
                      Total: {dailyTotalStr}
                    </span>
                  </div>

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
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{session.subject}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 py-1 rounded">
                              {durationStr}
                            </span>
                            <button
                              onClick={() => setEditingSession(session)}
                              className="text-xs text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 px-2 py-1 rounded transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session._id)}
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
        )}

        {/* Pagination Controls */}
        {historyData.pagination && historyData.pagination.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{((historyData.pagination.page - 1) * historyData.pagination.limit) + 1}</span> to{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {Math.min(historyData.pagination.page * historyData.pagination.limit, historyData.pagination.total)}
                </span>{' '}
                of <span className="font-semibold text-gray-700 dark:text-gray-200">{historyData.pagination.total}</span> sessions
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span>Per page:</span>
                <select
                  value={pageLimit}
                  onChange={(e) => {
                    const newLim = Number(e.target.value);
                    setPageLimit(newLim);
                    setCurrentPage(1);
                  }}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={2}>2</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                id="paginationPrev"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {getPageNumbers(currentPage, historyData.pagination.totalPages).map((p, idx) => (
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePageChange(p)}
                    disabled={isLoading || historyData.pagination.totalPages <= 1}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      currentPage === p
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              ))}

              <button
                type="button"
                id="paginationNext"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= historyData.pagination.totalPages || isLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Range Modal */}
      <CustomRangeModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={handleApplyCustomRange}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={Boolean(editingSession)}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSessionUpdated={loadHistory}
      />
    </div>
  );
}
