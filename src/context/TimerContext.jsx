import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const TimerContext = createContext();
const TIMER_STORAGE_KEY = 'studyTimerState';

export function TimerProvider({ children, onSessionSaved }) {
  const [timerState, setTimerState] = useState('ready'); // 'ready' | 'running' | 'paused'
  const [timerSubject, setTimerSubject] = useState('');
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showInPageWidget, setShowInPageWidget] = useState(false);

  const hasElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
  const isSubmittingRef = useRef(false);

  // Refs for current values inside intervals and callbacks
  const stateRef = useRef({
    timerState,
    timerSubject,
    timerStartTime,
    timerElapsedSeconds,
  });

  useEffect(() => {
    stateRef.current = {
      timerState,
      timerSubject,
      timerStartTime,
      timerElapsedSeconds,
    };
  }, [timerState, timerSubject, timerStartTime, timerElapsedSeconds]);

  // Persist state helper
  const persistState = useCallback((state) => {
    const finalElapsed = state.durationSeconds ?? state.timerElapsedSeconds ?? 0;
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        timerState: state.timerState,
        timerSubject: state.timerSubject,
        timerStartTime: state.timerStartTime,
        timerElapsedSeconds: finalElapsed,
        durationSeconds: finalElapsed,
      }));
    } catch (err) {
      console.error('Failed to save timer state to localStorage:', err);
    }

    if (hasElectron) {
      window.electronAPI.sendTimerAction('update-state', {
        state: state.timerState,
        subject: state.timerSubject,
        startTime: state.timerStartTime,
        elapsedSeconds: finalElapsed,
        durationSeconds: finalElapsed,
      });
    }
  }, [hasElectron]);

  // Format helpers
  const formatTime = useCallback((totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(v => String(v).padStart(2, '0'))
      .join(':');
  }, []);

  const formatTimeHuman = useCallback((totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  }, []);

  // Compute live elapsed seconds
  const getLiveElapsedSeconds = useCallback(() => {
    const { timerState, timerStartTime, timerElapsedSeconds } = stateRef.current;
    let t = timerElapsedSeconds;
    if (timerState === 'running' && timerStartTime) {
      t += Math.floor((Date.now() - timerStartTime) / 1000);
    }
    return t;
  }, []);

  // Reset internal state helper
  const resetTimerStateDirect = useCallback(() => {
    setTimerState('ready');
    setTimerSubject('');
    setTimerStartTime(null);
    setTimerElapsedSeconds(0);
    setDisplaySeconds(0);
    setWarningMessage('');
    localStorage.removeItem(TIMER_STORAGE_KEY);

    if (hasElectron) {
      window.electronAPI.sendTimerAction('reset');
    }
  }, [hasElectron]);

  // Restore on initial mount
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let restoredState = parsed.timerState || 'ready';
        let restoredSubject = parsed.timerSubject || '';
        let restoredStartTime = parsed.timerStartTime || null;
        let restoredElapsed = parsed.durationSeconds ?? parsed.timerElapsedSeconds ?? 0;

        if (restoredState === 'running' && restoredStartTime) {
          const now = Date.now();
          restoredElapsed += Math.floor((now - restoredStartTime) / 1000);
          restoredStartTime = now;
        }

        setTimerState(restoredState);
        setTimerSubject(restoredSubject);
        setTimerStartTime(restoredStartTime);
        setTimerElapsedSeconds(restoredElapsed);
        setDisplaySeconds(restoredElapsed);

        persistState({
          timerState: restoredState,
          timerSubject: restoredSubject,
          timerStartTime: restoredStartTime,
          timerElapsedSeconds: restoredElapsed,
          durationSeconds: restoredElapsed,
        });
      } catch (e) {
        console.error('Failed to parse timer state:', e);
      }
    }

    // Electron IPC Setup
    if (hasElectron) {
      // Listen for timer state updates from main or floating widget
      window.electronAPI.onTimerState((s) => {
        const nextState = s.state || 'ready';
        const nextSubject = s.subject || '';
        const nextStartTime = s.startTime || null;
        const nextElapsed = s.durationSeconds ?? s.elapsedSeconds ?? 0;

        setTimerState(nextState);
        setTimerSubject(nextSubject);
        setTimerStartTime(nextStartTime);
        setTimerElapsedSeconds(nextElapsed);

        let current = nextElapsed;
        if (nextState === 'running' && nextStartTime) {
          current += Math.floor((Date.now() - nextStartTime) / 1000);
        }
        setDisplaySeconds(current);

        try {
          localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
            timerState: nextState,
            timerSubject: nextSubject,
            timerStartTime: nextStartTime,
            timerElapsedSeconds: nextElapsed,
            durationSeconds: nextElapsed,
          }));
        } catch (_) {}
      });

      // Listen for save-timer-session requested by floating widget
      window.electronAPI.onSaveTimerSession(async ({ subject, elapsedSeconds, durationSeconds }) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
          const finalSecs = durationSeconds ?? elapsedSeconds;
          await api.saveTimerSession({ subject, elapsedSeconds: finalSecs, durationSeconds: finalSecs });
          resetTimerStateDirect();
          if (onSessionSaved) onSessionSaved();
        } catch (err) {
          console.error('Failed to save timer session from widget:', err);
          alert('Failed to save study session: ' + err.message);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      });

      // Request initial state from Electron
      window.electronAPI.requestTimerState();
    }
  }, [hasElectron, persistState, resetTimerStateDirect, onSessionSaved]);

  // Interval ticker (100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      const live = getLiveElapsedSeconds();
      setDisplaySeconds(live);
    }, 100);

    return () => clearInterval(interval);
  }, [getLiveElapsedSeconds]);

  // Timer Control: START
  const startTimer = useCallback((subjectToUse) => {
    const subject = (subjectToUse !== undefined ? subjectToUse : timerSubject).trim();
    if (!subject) {
      throw new Error('Subject is required.');
    }
    if (subject.length < 2) {
      throw new Error('Subject must be at least 2 characters.');
    }
    if (subject.length > 50) {
      throw new Error('Subject must be 50 characters or fewer.');
    }

    const now = Date.now();
    const newState = {
      timerState: 'running',
      timerSubject: subject,
      timerStartTime: now,
      timerElapsedSeconds: 0,
      durationSeconds: 0,
    };

    setTimerState('running');
    setTimerSubject(subject);
    setTimerStartTime(now);
    setTimerElapsedSeconds(0);
    setDisplaySeconds(0);
    setWarningMessage('');

    persistState(newState);

    if (hasElectron) {
      window.electronAPI.sendTimerAction('start', { subject });
    }
  }, [timerSubject, hasElectron, persistState]);

  // Timer Control: PAUSE
  const pauseTimer = useCallback(() => {
    const { timerState, timerStartTime, timerElapsedSeconds, timerSubject } = stateRef.current;
    if (timerState !== 'running') return;
    const now = Date.now();
    const additional = timerStartTime ? Math.floor((now - timerStartTime) / 1000) : 0;
    const finalElapsed = timerElapsedSeconds + additional;

    const next = {
      timerState: 'paused',
      timerSubject,
      timerStartTime: null,
      timerElapsedSeconds: finalElapsed,
      durationSeconds: finalElapsed,
    };

    setTimerState('paused');
    setTimerStartTime(null);
    setTimerElapsedSeconds(finalElapsed);
    setDisplaySeconds(finalElapsed);

    persistState(next);

    if (hasElectron) {
      window.electronAPI.sendTimerAction('pause');
    }
  }, [hasElectron, persistState]);

  // Timer Control: RESUME
  const resumeTimer = useCallback(() => {
    const { timerState, timerElapsedSeconds, timerSubject } = stateRef.current;
    if (timerState !== 'paused') return;
    const now = Date.now();

    const next = {
      timerState: 'running',
      timerSubject,
      timerStartTime: now,
      timerElapsedSeconds,
      durationSeconds: timerElapsedSeconds,
    };

    setTimerState('running');
    setTimerStartTime(now);

    persistState(next);

    if (hasElectron) {
      window.electronAPI.sendTimerAction('resume');
    }
  }, [hasElectron, persistState]);

  // Timer Control: STOP (toggles pause if running, resume if paused)
  const stopTimer = useCallback(() => {
    if (stateRef.current.timerState === 'running') {
      pauseTimer();
    } else if (stateRef.current.timerState === 'paused') {
      resumeTimer();
    }
  }, [pauseTimer, resumeTimer]);

  // Timer Control: RESET
  const resetTimer = useCallback(() => {
    const { timerState, timerElapsedSeconds } = stateRef.current;
    if (timerState === 'running' || (timerState === 'paused' && timerElapsedSeconds > 0)) {
      if (!window.confirm('Reset timer to 00:00:00? Unsaved study time will be cleared.')) {
        return;
      }
    }
    resetTimerStateDirect();
  }, [resetTimerStateDirect]);

  // Timer Control: SUBMIT
  const submitTimer = useCallback(async (customSubject, callbackOnSuccess) => {
    const { timerState, timerElapsedSeconds, timerSubject } = stateRef.current;

    if (timerState !== 'paused') {
      setWarningMessage('Please pause the timer before submitting.');
      return;
    }

    const subject = (customSubject !== undefined ? customSubject : timerSubject).trim();
    if (!subject) {
      throw new Error('Subject is required.');
    }
    if (subject.length < 2) {
      throw new Error('Subject must be at least 2 characters.');
    }
    if (subject.length > 50) {
      throw new Error('Subject must be 50 characters or fewer.');
    }

    if (timerElapsedSeconds < 1) {
      setWarningMessage('Timer must record at least 1 second before submitting.');
      return;
    }

    // Synchronous guard against double-clicks
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setWarningMessage('');

    try {
      const result = await api.saveTimerSession({
        subject,
        elapsedSeconds: timerElapsedSeconds,
        durationSeconds: timerElapsedSeconds,
      });

      if (result.success) {
        resetTimerStateDirect();
        if (callbackOnSuccess) callbackOnSuccess(result);
        if (onSessionSaved) onSessionSaved();
      } else {
        setWarningMessage(result.error || 'Failed to save session.');
      }
    } catch (err) {
      console.error('Submit timer error:', err);
      setWarningMessage(err.message || 'Failed to save study session.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [resetTimerStateDirect, onSessionSaved]);

  // Pop-out Floating Widget handler
  const openTimerWidget = useCallback(() => {
    if (hasElectron) {
      window.electronAPI.sendTimerAction('update-state', {
        state: stateRef.current.timerState,
        subject: stateRef.current.timerSubject,
        startTime: stateRef.current.timerStartTime,
        elapsedSeconds: stateRef.current.timerElapsedSeconds,
        durationSeconds: stateRef.current.timerElapsedSeconds,
      });
      window.electronAPI.openFloatingWidget();
    } else {
      setShowInPageWidget(true);
    }
  }, [hasElectron]);

  const closeInPageWidget = useCallback(() => {
    setShowInPageWidget(false);
  }, []);

  return (
    <TimerContext.Provider
      value={{
        timerState,
        timerSubject,
        setTimerSubject,
        timerElapsedSeconds,
        durationSeconds: timerElapsedSeconds,
        displaySeconds,
        isSubmitting,
        warningMessage,
        setWarningMessage,
        hasElectron,
        showInPageWidget,
        formatTime,
        formatTimeHuman,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        submitTimer,
        openTimerWidget,
        closeInPageWidget,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

export default TimerContext;
