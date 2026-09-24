import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { TimerProvider } from './context/TimerContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import DashboardPage from './pages/DashboardPage';
import StatisticsPage from './pages/StatisticsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsModal from './components/common/SettingsModal';
import UpdateNotification from './components/common/UpdateNotification';
import InPageWidget from './components/widget/InPageWidget';
import api from './services/api';

function getPageFromUrl() {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.replace(/^\/+/, '').toLowerCase();
  if (path.startsWith('statistics')) return 'statistics';
  if (path.startsWith('history')) return 'history';
  return 'dashboard';
}

function MainApp() {
  const [activePage, setActivePage] = useState(getPageFromUrl);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentGoalHours, setCurrentGoalHours] = useState(2);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sync state with popstate (browser Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      setActivePage(getPageFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page) => {
    setActivePage(page);
    const targetPath = page === 'dashboard' ? '/' : `/${page}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.getSettings();
      if (res && res.dailyGoalHours != null) {
        setCurrentGoalHours(res.dailyGoalHours);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <TimerProvider onSessionSaved={triggerRefresh}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
        <Header
          activePage={activePage}
          setActivePage={navigateTo}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <main className="flex-1">
          {activePage === 'dashboard' && (
            <DashboardPage
              refreshTrigger={refreshTrigger}
              onRefreshNeeded={triggerRefresh}
              onNavigateHistory={() => navigateTo('history')}
            />
          )}

          {activePage === 'statistics' && (
            <StatisticsPage
              onNavigateDashboard={() => navigateTo('dashboard')}
            />
          )}

          {activePage === 'history' && (
            <HistoryPage
              onNavigateDashboard={() => navigateTo('dashboard')}
            />
          )}
        </main>

        <Footer />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentGoalHours={currentGoalHours}
          onSettingsSaved={(newGoalHours) => {
            setCurrentGoalHours(newGoalHours);
            triggerRefresh();
          }}
        />

        <InPageWidget />
        <UpdateNotification />
      </div>
    </TimerProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
