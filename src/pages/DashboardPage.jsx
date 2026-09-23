import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import StatCardsRow from '../components/dashboard/StatCard';
import AddSessionForm from '../components/dashboard/AddSessionForm';
import StudyTimer from '../components/dashboard/StudyTimer';
import SubjectStats from '../components/dashboard/SubjectStats';
import WeeklyChart from '../components/dashboard/WeeklyChart';
import MonthlyChart from '../components/dashboard/MonthlyChart';
import SessionList from '../components/dashboard/SessionList';
import EditSessionModal from '../components/common/EditSessionModal';

export default function DashboardPage({ refreshTrigger, onRefreshNeeded, onNavigateHistory }) {
  const [dashboardData, setDashboardData] = useState({
    sessions: [],
    groupedSessions: [],
    subjectStats: [],
    todaySubjectStats: [],
    todayTotal: 0,
    totalStudyTime: 0,
    weeklyTotal: 0,
    weeklyDayTotals: [],
    monthlyTotal: 0,
    monthlySessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    todayGoalCompleted: false,
    dailyGoal: 120,
    dailyProgress: 0,
    dailyGoalHours: 2,
    weeklyChartData: [0, 0, 0, 0, 0, 0, 0],
    weeklyChartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    monthlyChartData: [],
    monthlyChartLabels: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSession, setEditingSession] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleRefresh = () => {
    loadData();
    if (onRefreshNeeded) onRefreshNeeded();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Top Statistics Row */}
      <StatCardsRow
        todayTotal={dashboardData.todayTotal}
        dailyGoal={dashboardData.dailyGoal}
        dailyProgress={dashboardData.dailyProgress}
        weeklyTotal={dashboardData.weeklyTotal}
        monthlyTotal={dashboardData.monthlyTotal}
        monthlySessions={dashboardData.monthlySessions}
        totalStudyTime={dashboardData.totalStudyTime}
        currentStreak={dashboardData.currentStreak}
        longestStreak={dashboardData.longestStreak}
        todayGoalCompleted={dashboardData.todayGoalCompleted}
      />

      {/* 3-Column Layout: Add Session Form | Study Timer | Study by Subject */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AddSessionForm onSessionAdded={handleRefresh} />
        <StudyTimer onSessionSaved={handleRefresh} />
        <SubjectStats
          subjectStats={dashboardData.subjectStats}
          todaySubjectStats={dashboardData.todaySubjectStats}
        />
      </div>

      {/* Weekly Study Chart */}
      <WeeklyChart
        labels={dashboardData.weeklyChartLabels}
        data={dashboardData.weeklyChartData}
        weeklyDayTotals={dashboardData.weeklyDayTotals}
      />

      {/* Monthly Study Chart */}
      <MonthlyChart
        labels={dashboardData.monthlyChartLabels}
        data={dashboardData.monthlyChartData}
      />

      {/* Study History list grouped by date */}
      <SessionList
        groupedSessions={dashboardData.groupedSessions}
        onSessionDeleted={handleRefresh}
        onEditSession={(session) => setEditingSession(session)}
        onNavigateHistory={onNavigateHistory}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={Boolean(editingSession)}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSessionUpdated={handleRefresh}
      />
    </div>
  );
}
