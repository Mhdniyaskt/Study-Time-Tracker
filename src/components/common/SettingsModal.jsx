import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTimer, playChime } from '../../context/TimerContext';
import { useTheme } from '../../hooks/useTheme';

export default function SettingsModal({ isOpen, onClose, currentGoalHours = 2, onSettingsSaved }) {
  const { refreshSettings, hasElectron } = useTimer();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'appearance' | 'notifications' | 'shortcuts' | 'system'

  // Settings State
  const [goalHours, setGoalHours] = useState(currentGoalHours);
  const [focusDuration, setFocusDuration] = useState(25);
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [roundsUntilLongBreak, setRoundsUntilLongBreak] = useState(4);
  const [disableShortBreaks, setDisableShortBreaks] = useState(false);
  const [disableLongBreaks, setDisableLongBreaks] = useState(false);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartWork, setAutoStartWork] = useState(false);
  const [countdownDial, setCountdownDial] = useState(true);
  const [timerStyle, setTimerStyle] = useState('circular');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [chimeTested, setChimeTested] = useState(false);

  // Auto-Update State
  const [appVersion, setAppVersion] = useState('1.0.1');
  const [updateCheckStatus, setUpdateCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'not-available' | 'error' | 'downloading' | 'downloaded'
  const [updateStatusMessage, setUpdateStatusMessage] = useState('');

  // Fetch app version when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== 'undefined' && window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setAppVersion(v);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Listen to update status events
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((data) => {
      if (!data) return;
      if (data.status === 'checking') {
        setUpdateCheckStatus('checking');
        setUpdateStatusMessage('Checking for updates...');
      } else if (data.status === 'available') {
        setUpdateCheckStatus('available');
        setUpdateStatusMessage(`Update v${data.version} is available!`);
      } else if (data.status === 'not-available') {
        setUpdateCheckStatus('not-available');
        setUpdateStatusMessage(`You are on the latest version (v${data.version || appVersion}).`);
      } else if (data.status === 'downloading') {
        setUpdateCheckStatus('downloading');
        setUpdateStatusMessage('Downloading update...');
      } else if (data.status === 'downloaded') {
        setUpdateCheckStatus('downloaded');
        setUpdateStatusMessage(`Update v${data.version} downloaded! Ready to restart.`);
      } else if (data.status === 'error') {
        setUpdateCheckStatus('error');
        setUpdateStatusMessage(data.error ? `Check failed: ${data.error}` : 'Unable to check for updates right now.');
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [appVersion]);

  const handleCheckForUpdates = () => {
    setUpdateCheckStatus('checking');
    setUpdateStatusMessage('Connecting to update server...');
    if (window.electronAPI?.checkForUpdates) {
      window.electronAPI.checkForUpdates();
    } else {
      setTimeout(() => {
        setUpdateCheckStatus('not-available');
        setUpdateStatusMessage('Web version is always up to date.');
      }, 600);
    }
  };

  // Fetch current settings whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError('');

    api.getSettings()
      .then((data) => {
        if (data && data.success) {
          if (data.dailyGoalHours) setGoalHours(data.dailyGoalHours);
          if (data.focusDuration) setFocusDuration(data.focusDuration);
          if (data.shortBreakDuration) setShortBreakDuration(data.shortBreakDuration);
          if (data.longBreakDuration) setLongBreakDuration(data.longBreakDuration);
          if (data.roundsUntilLongBreak) setRoundsUntilLongBreak(data.roundsUntilLongBreak);
          setDisableShortBreaks(Boolean(data.disableShortBreaks));
          setDisableLongBreaks(Boolean(data.disableLongBreaks));
          setAutoStartBreaks(Boolean(data.autoStartBreaks));
          setAutoStartWork(Boolean(data.autoStartWork));
          setCountdownDial(data.countdownDial !== false);
          if (data.timerStyle) setTimerStyle(data.timerStyle);
          setNotificationsEnabled(data.notificationsEnabled !== false);
        }
      })
      .catch((err) => {
        console.warn('Could not load settings in modal:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestChime = () => {
    playChime();
    setChimeTested(true);
    setTimeout(() => setChimeTested(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(goalHours);
    if (isNaN(val) || val < 0.5 || val > 24) {
      setError('Daily goal must be between 0.5 and 24 hours.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const payload = {
        dailyGoalHours: val,
        focusDuration: parseInt(focusDuration, 10),
        shortBreakDuration: parseInt(shortBreakDuration, 10),
        longBreakDuration: parseInt(longBreakDuration, 10),
        roundsUntilLongBreak: parseInt(roundsUntilLongBreak, 10),
        disableShortBreaks,
        disableLongBreaks,
        autoStartBreaks,
        autoStartWork,
        countdownDial,
        theme,
        timerStyle,
        notificationsEnabled,
      };

      await api.updateSettings(payload);
      if (refreshSettings) await refreshSettings();
      if (onSettingsSaved) onSettingsSaved(val);
      onClose();
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Preferences & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 gap-1 bg-gray-50/30 dark:bg-gray-800/30 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'timer', label: '⏱ Timer' },
            { id: 'appearance', label: '🎨 Appearance' },
            { id: 'notifications', label: '🔔 Audio' },
            { id: 'shortcuts', label: '⌨ Shortcuts' },
            { id: 'system', label: 'ℹ About' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 border-b-2 font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
              Loading settings...
            </div>
          ) : (
            <form id="settingsForm" onSubmit={handleSubmit} className="space-y-5">
              {/* ── TAB 1: TIMER ───────────────────────────────────────── */}
              {activeTab === 'timer' && (
                <div className="space-y-4">
                  {/* Daily Goal */}
                  <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="dailyGoalHours" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Daily Study Goal
                      </label>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                        {goalHours} hours ({Math.round(goalHours * 60)} min)
                      </span>
                    </div>
                    <input
                      type="range"
                      id="dailyGoalHours"
                      min="0.5"
                      max="16"
                      step="0.5"
                      value={goalHours}
                      onChange={(e) => setGoalHours(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>30m</span>
                      <span>8h</span>
                      <span>16h</span>
                    </div>
                  </div>

                  {/* Pomodoro Focus & Break Times */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Pomodoro / Focus Durations
                    </h3>

                    {/* Focus Session */}
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <span>Focus Session Duration</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{focusDuration} min</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="90"
                        step="1"
                        value={focusDuration}
                        onChange={(e) => setFocusDuration(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Short Break */}
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <span>Short Break Duration</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{shortBreakDuration} min</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="1"
                        value={shortBreakDuration}
                        onChange={(e) => setShortBreakDuration(parseInt(e.target.value, 10))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Long Break */}
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <span>Long Break Duration</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{longBreakDuration} min</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="1"
                        value={longBreakDuration}
                        onChange={(e) => setLongBreakDuration(parseInt(e.target.value, 10))}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                    </div>

                    {/* Rounds Until Long Break */}
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <span>Rounds Until Long Break</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{roundsUntilLongBreak} rounds</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={roundsUntilLongBreak}
                        onChange={(e) => setRoundsUntilLongBreak(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Auto-start and Break Toggles */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div>
                        <span>Disable Short Breaks</span>
                        <p className="text-[10px] text-gray-400">Skip short breaks and continue straight to the next focus round</p>
                      </div>
                      <input
                        type="checkbox"
                        id="disableShortBreaksCheckbox"
                        checked={disableShortBreaks}
                        onChange={(e) => setDisableShortBreaks(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div>
                        <span>Disable Long Breaks</span>
                        <p className="text-[10px] text-gray-400">Prevent taking extended long breaks after completing rounds</p>
                      </div>
                      <input
                        type="checkbox"
                        id="disableLongBreaksCheckbox"
                        checked={disableLongBreaks}
                        onChange={(e) => setDisableLongBreaks(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div>
                        <span>Auto-start Breaks</span>
                        <p className="text-[10px] text-gray-400">Start break countdown automatically when focus ends</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoStartBreaks}
                        onChange={(e) => setAutoStartBreaks(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div>
                        <span>Auto-start Focus Sessions</span>
                        <p className="text-[10px] text-gray-400">Start next focus session automatically when break ends</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoStartWork}
                        onChange={(e) => setAutoStartWork(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div>
                        <span>Show Countdown Dial</span>
                        <p className="text-[10px] text-gray-400">Display circular progress ring around focus timer</p>
                      </div>
                      <input
                        type="checkbox"
                        id="countdownDialCheckbox"
                        checked={countdownDial}
                        onChange={(e) => setCountdownDial(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* ── TAB 2: APPEARANCE ───────────────────────────────────── */}
              {activeTab === 'appearance' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Color Theme
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                          theme === 'dark'
                            ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="text-xl">🌙</span>
                        <div>
                          <div className="text-xs font-bold">Dark Charcoal</div>
                          <div className="text-[10px] opacity-75">Easy on eyes at night</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                          theme === 'light'
                            ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="text-xl">☀️</span>
                        <div>
                          <div className="text-xs font-bold">Clean Light</div>
                          <div className="text-[10px] opacity-75">Bright daylight mode</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Focus Dial Style
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTimerStyle('circular')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                          timerStyle === 'circular'
                            ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="text-xl">⭕</span>
                        <div>
                          <div className="text-xs font-bold">Circular Dial</div>
                          <div className="text-[10px] opacity-75">Animated progress ring</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTimerStyle('minimal')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                          timerStyle === 'minimal'
                            ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="text-xl">🔢</span>
                        <div>
                          <div className="text-xs font-bold">Minimalist Digits</div>
                          <div className="text-[10px] opacity-75">Compact digital clock</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: NOTIFICATIONS ─────────────────────────────────── */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Phase Completion Chime
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Play a gentle two-tone chime when focus or break session finishes
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">Desktop Notifications:</span>
                      <p className="text-[11px] text-gray-400">
                        {typeof window !== 'undefined' && 'Notification' in window
                          ? Notification.permission === 'granted'
                            ? '✅ Browser notifications enabled'
                            : Notification.permission === 'denied'
                              ? '❌ Blocked in browser settings'
                              : 'System alerts when sessions finish'
                          : 'Not supported in this browser'}
                      </p>
                    </div>
                    {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await Notification.requestPermission();
                          setIsSaving(prev => !prev);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 4: SHORTCUTS ─────────────────────────────────────── */}
              {activeTab === 'shortcuts' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Keyboard shortcuts are active anywhere on the dashboard (except while typing in text inputs):
                  </p>

                  <div className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Start / Pause / Resume Timer</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono text-[11px] text-gray-700 dark:text-gray-200">
                        Space
                      </kbd>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Reset Active Timer</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono text-[11px] text-gray-700 dark:text-gray-200">
                        R
                      </kbd>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Skip Break (Focus Mode)</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono text-[11px] text-gray-700 dark:text-gray-200">
                        S
                      </kbd>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Close Open Modals / Dialogs</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono text-[11px] text-gray-700 dark:text-gray-200">
                        Esc
                      </kbd>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 5: SYSTEM / ABOUT ────────────────────────────────── */}
              {activeTab === 'system' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl space-y-2.5 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Application:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Study Time Tracker</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Version:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">v{appVersion}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Runtime:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {hasElectron ? 'Electron Desktop + Express' : 'Web Browser + Express'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Database:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Local Database (Active)</span>
                    </div>
                  </div>

                  {/* Auto-Update Section */}
                  <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Software Updates</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Automatic release updates via GitHub Releases
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCheckForUpdates}
                        disabled={updateCheckStatus === 'checking'}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition shadow-sm"
                      >
                        {updateCheckStatus === 'checking' ? 'Checking...' : 'Check for Updates'}
                      </button>
                    </div>

                    {updateStatusMessage && (
                      <div className={`p-2.5 rounded-lg text-[11px] flex items-center gap-2 ${
                        updateCheckStatus === 'error'
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                          : updateCheckStatus === 'available' || updateCheckStatus === 'downloaded'
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                      }`}>
                        <span>
                          {updateCheckStatus === 'checking' && '⏳'}
                          {updateCheckStatus === 'available' && '🚀'}
                          {updateCheckStatus === 'downloaded' && '🎉'}
                          {updateCheckStatus === 'not-available' && '✅'}
                          {updateCheckStatus === 'error' && '⚠️'}
                        </span>
                        <span>{updateStatusMessage}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    Single source of truth timer synchronization with wall-clock drift prevention.
                  </p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="settingsForm"
            disabled={isSaving || isLoading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
