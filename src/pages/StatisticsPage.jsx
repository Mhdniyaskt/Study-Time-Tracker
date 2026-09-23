import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DailyChart from '../components/statistics/DailyChart';
import SubjectDoughnutChart from '../components/statistics/SubjectDoughnutChart';
import StudyCalendar from '../components/statistics/StudyCalendar';
import StudyDetailsModal from '../components/statistics/StudyDetailsModal';

export default function StatisticsPage({ onNavigateDashboard }) {
  const [period, setPeriod] = useState('all-time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const [statsData, setStatsData] = useState({
    period: 'all-time',
    periodLabel: 'All Time',
    totalStudyTime: 0,
    numberOfSessions: 0,
    averageStudyTimePerDay: 0,
    subjectStats: [],
    dailyTotals: [],
    groupedSessions: [],
    sessions: [],
    chartLabels: [],
    chartData: [],
    subjectChartLabels: [],
    subjectChartData: [],
    subjectChartColors: [],
    calendarEvents: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  const loadStats = useCallback(async (p = period, s = startDate, e = endDate) => {
    try {
      setError('');
      setIsLoading(true);
      const data = await api.getStatistics({ period: p, startDate: s, endDate: e });
      setStatsData({
        period: data.period || p,
        periodLabel: data.periodLabel || 'All Time',
        totalStudyTime: data.totalStudyTime || 0,
        numberOfSessions: data.numberOfSessions || 0,
        averageStudyTimePerDay: data.averageStudyTimePerDay || 0,
        subjectStats: data.subjectStats || [],
        dailyTotals: data.dailyTotals || [],
        groupedSessions: data.groupedSessions || [],
        sessions: data.sessions || [],
        chartLabels: data.chartLabels || [],
        chartData: data.chartData || [],
        subjectChartLabels: data.subjectChartLabels || [],
        subjectChartData: data.subjectChartData || [],
        subjectChartColors: data.subjectChartColors || [],
        calendarEvents: data.calendarEvents || [],
      });
    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError(err.message || 'Failed to load statistics.');
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    loadStats(period, startDate, endDate);
  }, [period, startDate, endDate, loadStats]);

  const handleSelectPeriod = (newPeriod) => {
    if (newPeriod === 'custom') {
      setShowCustomRange(prev => !prev);
    } else {
      setShowCustomRange(false);
      setPeriod(newPeriod);
      setStartDate('');
      setEndDate('');
    }
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) {
      setError('Please provide both start and end dates.');
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      setError('Start date cannot be after end date.');
      return;
    }
    setError('');
    setPeriod('custom');
    setStartDate(customStart);
    setEndDate(customEnd);
  };

  const formatHAndM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
  };

  const maxSubjectMinutes = statsData.subjectStats.length > 0 ? statsData.subjectStats[0].totalMinutes : 0;
  const topSubject = statsData.subjectStats.length > 0 ? statsData.subjectStats[0] : null;

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
      {/* Period Selector Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Select Time Period</h2>
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

        {/* Quick Period Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPeriod(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                period === p.id && !showCustomRange
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleSelectPeriod('custom')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              period === 'custom' || showCustomRange
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Range Inline Form */}
        {showCustomRange && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200 mb-4">
            <div>
              <label htmlFor="customStartDate" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="customStartDate"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="customEndDate" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="customEndDate"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleApplyCustom}
                className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-2 rounded-lg text-sm transition"
              >
                Apply Range
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Current Selection Label */}
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            <strong>Showing statistics for:</strong> {statsData.periodLabel}
          </p>
        </div>
      </div>

      {/* 4 Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Study Time */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 dark:bg-indigo-900 rounded-lg p-3">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Study Time</span>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {formatHAndM(statsData.totalStudyTime)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {(statsData.totalStudyTime / 60).toFixed(1)} hours total
          </p>
        </div>

        {/* Sessions */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 dark:bg-emerald-900 rounded-lg p-3">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Number of Sessions</span>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{statsData.numberOfSessions}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {statsData.numberOfSessions === 1 ? 'study session' : 'study sessions'}
          </p>
        </div>

        {/* Average Study Time Per Day */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-sky-100 dark:bg-sky-900 rounded-lg p-3">
              <svg className="w-6 h-6 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Per Day</span>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {formatHAndM(statsData.averageStudyTimePerDay)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {(statsData.averageStudyTimePerDay / 60).toFixed(1)} hours average
          </p>
        </div>

        {/* Top Subject */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-violet-100 dark:bg-violet-900 rounded-lg p-3">
              <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Top Subject</span>
          </div>
          {topSubject ? (
            <>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{topSubject.subject}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatHAndM(topSubject.totalMinutes)}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-400 dark:text-gray-500">No data</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add some sessions</p>
            </>
          )}
        </div>
      </div>

      {/* Charts Row: Daily Study Time & Study by Subject */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DailyChart labels={statsData.chartLabels} data={statsData.chartData} />
        <SubjectDoughnutChart
          labels={statsData.subjectChartLabels}
          data={statsData.subjectChartData}
          colors={statsData.subjectChartColors}
        />
      </div>

      {/* Calendar View */}
      <StudyCalendar
        calendarEvents={statsData.calendarEvents}
        onSelectDate={(dateStr, totalTime, sessions) => {
          setSelectedDayDetails({ dateStr, totalTime, sessions });
        }}
      />

      {/* Two Column Section: Study by Subject Progress Bars & Daily Study Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Study Time by Subject */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Study Time by Subject</h2>

          {statsData.subjectStats.length > 0 ? (
            <div className="space-y-4">
              {statsData.subjectStats.map((stat, idx) => {
                const statTimeStr = formatHAndM(stat.totalMinutes);
                const progressWidth = maxSubjectMinutes > 0 ? Math.round((stat.totalMinutes / maxSubjectMinutes) * 100) : 0;
                const percentage = statsData.totalStudyTime > 0 ? Math.round((stat.totalMinutes / statsData.totalStudyTime) * 100) : 0;

                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{stat.subject}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{statTimeStr}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No study data for this period</p>
            </div>
          )}
        </div>

        {/* Daily Study Totals */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Daily Study Totals</h2>

          {statsData.dailyTotals.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {statsData.dailyTotals.map((daily, idx) => {
                const dailyTimeStr = formatHAndM(daily.minutes);
                const formattedDate = new Date(daily.date + 'T12:00:00').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{formattedDate}</span>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900 px-2 py-1 rounded">
                      {dailyTimeStr}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No study data for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Day Session Details Modal */}
      <StudyDetailsModal
        isOpen={Boolean(selectedDayDetails)}
        onClose={() => setSelectedDayDetails(null)}
        dateStr={selectedDayDetails?.dateStr}
        totalTime={selectedDayDetails?.totalTime}
        sessions={selectedDayDetails?.sessions}
      />
    </div>
  );
}
