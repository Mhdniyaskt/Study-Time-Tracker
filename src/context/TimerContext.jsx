import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const TimerContext = createContext();
const TIMER_STORAGE_KEY = 'studyTimerState';
const FOCUS_STORAGE_KEY = 'studyFocusTimerState';
const TIMER_MODE_KEY = 'studyTimerMode';

/**
 * Modern gentle chime using Web Audio API
 */
export function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.22, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.9);
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
}

export function TimerProvider({ children, onSessionSaved }) {
  // Mode: 'free' | 'focus'
  const [timerMode, setTimerModeState] = useState(() => {
    try {
      return localStorage.getItem(TIMER_MODE_KEY) || 'free';
    } catch (_) {
      return 'free';
    }
  });

  // Settings for Focus Mode
  const [settings, setSettings] = useState({
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    roundsUntilLongBreak: 4,
    disableShortBreaks: false,
    disableLongBreaks: false,
    autoStartWork: false,
    autoStartBreaks: false,
    notificationsEnabled: true,
    countdownDial: true,
  });

  // Shared Subject across modes
  const [timerSubject, setTimerSubject] = useState('');

  // ── FREE TIMER STATE ────────────────────────────────────────────────────────
  const [timerState, setTimerState] = useState('ready'); // 'ready' | 'running' | 'paused'
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);

  // ── FOCUS / POMODORO TIMER STATE ───────────────────────────────────────────
  // focusPhase: 'focus' | 'shortBreak' | 'longBreak'
  const [focusPhase, setFocusPhase] = useState('focus');
  const [focusRound, setFocusRound] = useState(1);
  const [focusState, setFocusState] = useState('ready'); // 'ready' | 'running' | 'paused'
  const [focusStartTime, setFocusStartTime] = useState(null);
  const [focusElapsedSeconds, setFocusElapsedSeconds] = useState(0);
  const [focusRemainingSeconds, setFocusRemainingSeconds] = useState(25 * 60);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showInPageWidget, setShowInPageWidget] = useState(false);

  const hasElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
  const isSubmittingRef = useRef(false);

  // Load backend settings
  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      if (data && data.success) {
        setSettings({
          focusDuration: data.focusDuration ?? 25,
          shortBreakDuration: data.shortBreakDuration ?? 5,
          longBreakDuration: data.longBreakDuration ?? 15,
          roundsUntilLongBreak: data.roundsUntilLongBreak ?? 4,
          disableShortBreaks: Boolean(data.disableShortBreaks),
          disableLongBreaks: Boolean(data.disableLongBreaks),
          autoStartWork: Boolean(data.autoStartWork),
          autoStartBreaks: Boolean(data.autoStartBreaks),
          notificationsEnabled: data.notificationsEnabled !== false,
          countdownDial: data.countdownDial !== false,
        });
      }
    } catch (e) {
      console.warn('Failed to load settings in TimerProvider:', e);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Compute duration in seconds for current focus phase
  const getPhaseDurationSeconds = useCallback((phase, currentSettings = settings) => {
    if (phase === 'shortBreak') return Math.max(1, (currentSettings.shortBreakDuration || 5) * 60);
    if (phase === 'longBreak') return Math.max(1, (currentSettings.longBreakDuration || 15) * 60);
    return Math.max(1, (currentSettings.focusDuration || 25) * 60);
  }, [settings]);

  // Keep refs for interval tickers and callbacks
  const stateRef = useRef({
    timerMode,
    timerState,
    timerSubject,
    timerStartTime,
    timerElapsedSeconds,
    focusPhase,
    focusRound,
    focusState,
    focusStartTime,
    focusElapsedSeconds,
    settings,
  });

  useEffect(() => {
    stateRef.current = {
      timerMode,
      timerState,
      timerSubject,
      timerStartTime,
      timerElapsedSeconds,
      focusPhase,
      focusRound,
      focusState,
      focusStartTime,
      focusElapsedSeconds,
      settings,
    };
  }, [
    timerMode,
    timerState,
    timerSubject,
    timerStartTime,
    timerElapsedSeconds,
    focusPhase,
    focusRound,
    focusState,
    focusStartTime,
    focusElapsedSeconds,
    settings,
  ]);

  // Format helpers
  const formatTime = useCallback((totalSeconds) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (hours > 0) {
      return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
    }
    return [minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
  }, []);

  const formatTimeHHMMSS = useCallback((totalSeconds) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
  }, []);

  const formatTimeHuman = useCallback((totalSeconds) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  }, []);

  // Persist State helper & Electron broadcast
  const persistState = useCallback((overrides = {}) => {
    const current = { ...stateRef.current, ...overrides };
    const phaseTotalSecs = getPhaseDurationSeconds(current.focusPhase, current.settings);

    // Compute live seconds for storage
    let liveFree = current.timerElapsedSeconds;
    if (current.timerState === 'running' && current.timerStartTime) {
      liveFree += Math.floor((Date.now() - current.timerStartTime) / 1000);
    }

    let liveFocusElapsed = current.focusElapsedSeconds;
    if (current.focusState === 'running' && current.focusStartTime) {
      liveFocusElapsed += Math.floor((Date.now() - current.focusStartTime) / 1000);
    }
    const liveFocusRemaining = Math.max(0, phaseTotalSecs - liveFocusElapsed);

    try {
      localStorage.setItem(TIMER_MODE_KEY, current.timerMode);
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        timerState: current.timerState,
        timerSubject: current.timerSubject,
        timerStartTime: current.timerStartTime,
        timerElapsedSeconds: current.timerElapsedSeconds,
        durationSeconds: current.timerElapsedSeconds,
      }));
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify({
        focusPhase: current.focusPhase,
        focusRound: current.focusRound,
        focusState: current.focusState,
        focusStartTime: current.focusStartTime,
        focusElapsedSeconds: current.focusElapsedSeconds,
      }));
    } catch (err) {
      console.error('Failed to save timer state to localStorage:', err);
    }

    if (hasElectron) {
      const activeState = current.timerMode === 'focus' ? current.focusState : current.timerState;
      window.electronAPI.sendTimerAction('update-state', {
        mode: current.timerMode,
        state: activeState,
        timerState: current.timerState,
        focusState: current.focusState,
        subject: current.timerSubject,
        startTime: current.timerMode === 'focus' ? current.focusStartTime : current.timerStartTime,
        elapsedSeconds: current.timerMode === 'focus' ? liveFocusElapsed : liveFree,
        durationSeconds: current.timerMode === 'focus' ? liveFocusElapsed : liveFree,
        phase: current.focusPhase,
        round: current.focusRound,
        totalRounds: current.settings.roundsUntilLongBreak || 4,
        remainingSeconds: current.timerMode === 'focus' ? liveFocusRemaining : liveFree,
        totalPhaseSeconds: phaseTotalSecs,
      });
    }
  }, [hasElectron, getPhaseDurationSeconds]);

  // ── MODE SWITCHING ──────────────────────────────────────────────────────────
  const switchTimerMode = useCallback((newMode, force = false) => {
    if (newMode === stateRef.current.timerMode) return true;
    const isFreeRunning = stateRef.current.timerState === 'running';
    const isFocusRunning = stateRef.current.focusState === 'running';

    if ((isFreeRunning || isFocusRunning) && !force) {
      return false; // Requires confirmation from UI
    }

    setTimerModeState(newMode);
    persistState({ timerMode: newMode });
    return true;
  }, [persistState]);

  // ── RESET STATE DIRECT HELPERS ─────────────────────────────────────────────
  const resetFreeTimerDirect = useCallback(() => {
    setTimerState('ready');
    setTimerStartTime(null);
    setTimerElapsedSeconds(0);
    setDisplaySeconds(0);
    setWarningMessage('');
    localStorage.removeItem(TIMER_STORAGE_KEY);

    if (hasElectron) {
      window.electronAPI.sendTimerAction('reset');
    }
  }, [hasElectron]);

  const resetFocusTimerDirect = useCallback(() => {
    const totalSecs = getPhaseDurationSeconds('focus');
    setFocusState('ready');
    setFocusPhase('focus');
    setFocusStartTime(null);
    setFocusElapsedSeconds(0);
    setFocusRemainingSeconds(totalSecs);
    setWarningMessage('');
    localStorage.removeItem(FOCUS_STORAGE_KEY);

    if (hasElectron) {
      window.electronAPI.sendTimerAction('reset');
    }
  }, [hasElectron, getPhaseDurationSeconds]);

  // ── RESTORE STATE ON INITIAL MOUNT ─────────────────────────────────────────
  useEffect(() => {
    // 1. Restore Free Timer
    const savedFree = localStorage.getItem(TIMER_STORAGE_KEY);
    if (savedFree) {
      try {
        const parsed = JSON.parse(savedFree);
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
        if (restoredSubject) setTimerSubject(restoredSubject);
        setTimerStartTime(restoredStartTime);
        setTimerElapsedSeconds(restoredElapsed);
        setDisplaySeconds(restoredElapsed);
      } catch (e) {
        console.error('Failed to parse free timer state:', e);
      }
    }

    // 2. Restore Focus Timer
    const savedFocus = localStorage.getItem(FOCUS_STORAGE_KEY);
    if (savedFocus) {
      try {
        const parsed = JSON.parse(savedFocus);
        let restoredPhase = parsed.focusPhase || 'focus';
        let restoredRound = parsed.focusRound || 1;
        let restoredState = parsed.focusState || 'ready';
        let restoredStartTime = parsed.focusStartTime || null;
        let restoredElapsed = parsed.focusElapsedSeconds || 0;

        if (restoredState === 'running' && restoredStartTime) {
          const now = Date.now();
          restoredElapsed += Math.floor((now - restoredStartTime) / 1000);
          restoredStartTime = now;
        }

        setFocusPhase(restoredPhase);
        setFocusRound(restoredRound);
        setFocusState(restoredState);
        setFocusStartTime(restoredStartTime);
        setFocusElapsedSeconds(restoredElapsed);

        const phaseSecs = getPhaseDurationSeconds(restoredPhase);
        setFocusRemainingSeconds(Math.max(0, phaseSecs - restoredElapsed));
      } catch (e) {
        console.error('Failed to parse focus timer state:', e);
      }
    }

    // 3. Electron IPC Setup
    if (hasElectron) {
      window.electronAPI.onTimerState((s) => {
        if (!s) return;
        if (s.mode && (s.mode === 'free' || s.mode === 'focus')) {
          setTimerModeState(s.mode);
        }
        if (s.subject !== undefined) {
          setTimerSubject(s.subject || '');
        }

        if (s.mode === 'focus') {
          if (s.phase) setFocusPhase(s.phase);
          if (s.round) setFocusRound(s.round);
          if (s.state) setFocusState(s.state);
          if (s.startTime !== undefined) setFocusStartTime(s.startTime);
          if (s.elapsedSeconds !== undefined) setFocusElapsedSeconds(s.elapsedSeconds);
          if (s.remainingSeconds !== undefined) setFocusRemainingSeconds(s.remainingSeconds);
        } else {
          if (s.state) setTimerState(s.state);
          if (s.startTime !== undefined) setTimerStartTime(s.startTime);
          const elapsed = s.durationSeconds ?? s.elapsedSeconds ?? 0;
          setTimerElapsedSeconds(elapsed);
          setDisplaySeconds(elapsed);
        }
      });

      window.electronAPI.onSaveTimerSession(async ({ subject, elapsedSeconds, durationSeconds }) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
          const finalSecs = durationSeconds ?? elapsedSeconds;
          await api.saveTimerSession({ subject, elapsedSeconds: finalSecs, durationSeconds: finalSecs });
          resetFreeTimerDirect();
          if (onSessionSaved) onSessionSaved();
        } catch (err) {
          console.error('Failed to save timer session from widget:', err);
          alert('Failed to save study session: ' + err.message);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      });

      window.electronAPI.requestTimerState();
    }
  }, [hasElectron, getPhaseDurationSeconds, resetFreeTimerDirect, onSessionSaved]);

  // ── FREE TIMER TICKER (100ms) ───────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const { timerMode, timerState, timerStartTime, timerElapsedSeconds } = stateRef.current;
      if (timerMode === 'free') {
        let t = timerElapsedSeconds;
        if (timerState === 'running' && timerStartTime) {
          t += Math.floor((Date.now() - timerStartTime) / 1000);
        }
        setDisplaySeconds(t);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // ── POMODORO AUTO-TRANSITION HANDLER ───────────────────────────────────────
  const handleFocusPhaseComplete = useCallback(async () => {
    const {
      focusPhase: currentPhase,
      focusRound: currentRound,
      timerSubject: currentSubj,
      settings: currentSettings,
    } = stateRef.current;

    // 1. Play Completion Chime & System Notification
    if (currentSettings.notificationsEnabled) {
      playChime();
      const title = currentPhase === 'focus' ? 'Focus Session Complete! 🎉' : (currentPhase === 'longBreak' ? 'Long Break Finished! 🌟' : 'Break Finished! ⚡');
      const body = currentPhase === 'focus' ? 'Great job! Time for a rest.' : 'Ready to start your next focus session?';

      if (hasElectron && window.electronAPI && typeof window.electronAPI.showNotification === 'function') {
        window.electronAPI.showNotification({ title, body });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch (_) {}
      }
    }

    // 2. If completing FOCUS phase: auto-save completed study session!
    if (currentPhase === 'focus') {
      const focusSecs = Math.max(1, (currentSettings.focusDuration || 25) * 60);
      const subjectToSave = (currentSubj || '').trim() || 'Focus Session';

      try {
        await api.saveTimerSession({
          subject: subjectToSave,
          elapsedSeconds: focusSecs,
          durationSeconds: focusSecs,
        });
        if (onSessionSaved) onSessionSaved();
      } catch (err) {
        console.error('Auto-save focus session failed:', err);
      }

      // Determine next phase considering disableShortBreaks and disableLongBreaks
      const roundsMax = currentSettings.roundsUntilLongBreak || 4;
      const isLongBreakTime = currentRound >= roundsMax;

      let nextPhase;
      let nextRound = currentRound;

      if (isLongBreakTime) {
        if (!currentSettings.disableLongBreaks) {
          nextPhase = 'longBreak';
          nextRound = 1;
        } else if (!currentSettings.disableShortBreaks) {
          nextPhase = 'shortBreak';
          nextRound = 1;
        } else {
          nextPhase = 'focus';
          nextRound = 1;
        }
      } else {
        if (!currentSettings.disableShortBreaks) {
          nextPhase = 'shortBreak';
          nextRound = currentRound + 1;
        } else {
          nextPhase = 'focus';
          nextRound = currentRound + 1;
        }
      }

      const nextPhaseSecs = getPhaseDurationSeconds(nextPhase, currentSettings);
      const isGoingToBreak = (nextPhase === 'shortBreak' || nextPhase === 'longBreak');
      const autoStart = isGoingToBreak
        ? Boolean(currentSettings.autoStartBreaks)
        : Boolean(currentSettings.autoStartWork);
      const now = Date.now();

      setFocusPhase(nextPhase);
      setFocusRound(nextRound);
      setFocusState(autoStart ? 'running' : 'ready');
      setFocusStartTime(autoStart ? now : null);
      setFocusElapsedSeconds(0);
      setFocusRemainingSeconds(nextPhaseSecs);

      persistState({
        focusPhase: nextPhase,
        focusRound: nextRound,
        focusState: autoStart ? 'running' : 'ready',
        focusStartTime: autoStart ? now : null,
        focusElapsedSeconds: 0,
      });
    } else {
      // Completing a BREAK phase (short or long break):
      // Time spent in break is NEVER saved as study session!
      const nextPhase = 'focus';
      const nextPhaseSecs = getPhaseDurationSeconds('focus', currentSettings);
      const autoStart = Boolean(currentSettings.autoStartWork);
      const now = Date.now();

      setFocusPhase(nextPhase);
      setFocusState(autoStart ? 'running' : 'ready');
      setFocusStartTime(autoStart ? now : null);
      setFocusElapsedSeconds(0);
      setFocusRemainingSeconds(nextPhaseSecs);

      persistState({
        focusPhase: nextPhase,
        focusState: autoStart ? 'running' : 'ready',
        focusStartTime: autoStart ? now : null,
        focusElapsedSeconds: 0,
      });
    }
  }, [getPhaseDurationSeconds, persistState, onSessionSaved]);

  // ── FOCUS TIMER TICKER (100ms) ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const {
        timerMode,
        focusState,
        focusStartTime,
        focusElapsedSeconds,
        focusPhase,
        settings,
      } = stateRef.current;

      if (timerMode === 'focus') {
        const phaseSecs = getPhaseDurationSeconds(focusPhase, settings);
        let liveElapsed = focusElapsedSeconds;
        if (focusState === 'running' && focusStartTime) {
          liveElapsed += Math.floor((Date.now() - focusStartTime) / 1000);
        }

        const remaining = Math.max(0, phaseSecs - liveElapsed);
        setFocusRemainingSeconds(remaining);

        // Check if countdown completed
        if (focusState === 'running' && remaining <= 0) {
          handleFocusPhaseComplete();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [getPhaseDurationSeconds, handleFocusPhaseComplete]);

  // ── CONTROLS: FREE TIMER ────────────────────────────────────────────────────
  const startFreeTimer = useCallback((subjectToUse) => {
    const subject = (subjectToUse !== undefined ? subjectToUse : timerSubject).trim();
    if (!subject) throw new Error('Subject is required.');
    if (subject.length < 2) throw new Error('Subject must be at least 2 characters.');
    if (subject.length > 50) throw new Error('Subject must be 50 characters or fewer.');

    const now = Date.now();
    setTimerState('running');
    setTimerSubject(subject);
    setTimerStartTime(now);
    setTimerElapsedSeconds(0);
    setDisplaySeconds(0);
    setWarningMessage('');

    persistState({
      timerState: 'running',
      timerSubject: subject,
      timerStartTime: now,
      timerElapsedSeconds: 0,
    });

    if (hasElectron) {
      window.electronAPI.sendTimerAction('start', { subject });
    }
  }, [timerSubject, hasElectron, persistState]);

  const pauseFreeTimer = useCallback(() => {
    const { timerState, timerStartTime, timerElapsedSeconds, timerSubject } = stateRef.current;
    if (timerState !== 'running') return;
    const now = Date.now();
    const additional = timerStartTime ? Math.floor((now - timerStartTime) / 1000) : 0;
    const finalElapsed = timerElapsedSeconds + additional;

    setTimerState('paused');
    setTimerStartTime(null);
    setTimerElapsedSeconds(finalElapsed);
    setDisplaySeconds(finalElapsed);

    persistState({
      timerState: 'paused',
      timerSubject,
      timerStartTime: null,
      timerElapsedSeconds: finalElapsed,
    });

    if (hasElectron) {
      window.electronAPI.sendTimerAction('pause');
    }
  }, [hasElectron, persistState]);

  const resumeFreeTimer = useCallback(() => {
    const { timerState, timerElapsedSeconds, timerSubject } = stateRef.current;
    if (timerState !== 'paused') return;
    const now = Date.now();

    setTimerState('running');
    setTimerStartTime(now);

    persistState({
      timerState: 'running',
      timerSubject,
      timerStartTime: now,
      timerElapsedSeconds,
    });

    if (hasElectron) {
      window.electronAPI.sendTimerAction('resume');
    }
  }, [hasElectron, persistState]);

  const resetFreeTimer = useCallback(() => {
    const { timerState, timerElapsedSeconds } = stateRef.current;
    if (timerState === 'running' || (timerState === 'paused' && timerElapsedSeconds > 0)) {
      if (!window.confirm('Reset timer to 00:00:00? Unsaved study time will be cleared.')) {
        return;
      }
    }
    resetFreeTimerDirect();
  }, [resetFreeTimerDirect]);

  const submitFreeTimer = useCallback(async (customSubject, callbackOnSuccess) => {
    const { timerState, timerElapsedSeconds, timerSubject } = stateRef.current;

    if (timerState !== 'paused') {
      setWarningMessage('Please pause the timer before submitting.');
      return;
    }

    const subject = (customSubject !== undefined ? customSubject : timerSubject).trim();
    if (!subject) throw new Error('Subject is required.');
    if (subject.length < 2) throw new Error('Subject must be at least 2 characters.');
    if (subject.length > 50) throw new Error('Subject must be 50 characters or fewer.');

    if (timerElapsedSeconds < 1) {
      setWarningMessage('Timer must record at least 1 second before submitting.');
      return;
    }

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
        resetFreeTimerDirect();
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
  }, [resetFreeTimerDirect, onSessionSaved]);

  // ── CONTROLS: FOCUS / POMODORO ──────────────────────────────────────────────
  const startFocusTimer = useCallback((subjectToUse) => {
    const { focusPhase, timerSubject } = stateRef.current;
    const subject = (subjectToUse !== undefined ? subjectToUse : timerSubject).trim();

    // Subject is required if starting a Focus session
    if (focusPhase === 'focus') {
      if (!subject) throw new Error('Subject is required for Focus Mode.');
      if (subject.length < 2) throw new Error('Subject must be at least 2 characters.');
      if (subject.length > 50) throw new Error('Subject must be 50 characters or fewer.');
    }

    const now = Date.now();
    setFocusState('running');
    if (subject) setTimerSubject(subject);
    setFocusStartTime(now);
    setWarningMessage('');

    persistState({
      focusState: 'running',
      timerSubject: subject || timerSubject,
      focusStartTime: now,
    });

    if (hasElectron) {
      window.electronAPI.sendTimerAction('start', { subject: subject || timerSubject });
    }
  }, [hasElectron, persistState]);

  const pauseFocusTimer = useCallback(() => {
    const { focusState, focusStartTime, focusElapsedSeconds } = stateRef.current;
    if (focusState !== 'running') return;
    const now = Date.now();
    const additional = focusStartTime ? Math.floor((now - focusStartTime) / 1000) : 0;
    const finalElapsed = focusElapsedSeconds + additional;

    setFocusState('paused');
    setFocusStartTime(null);
    setFocusElapsedSeconds(finalElapsed);

    persistState({
      focusState: 'paused',
      focusStartTime: null,
      focusElapsedSeconds: finalElapsed,
    });

    if (hasElectron) {
      window.electronAPI.sendTimerAction('pause');
    }
  }, [hasElectron, persistState]);

  const resumeFocusTimer = useCallback(() => {
    const { focusState, focusElapsedSeconds } = stateRef.current;
    if (focusState !== 'paused') return;
    const now = Date.now();

    setFocusState('running');
    setFocusStartTime(now);

    persistState({
      focusState: 'running',
      focusStartTime: now,
      focusElapsedSeconds,
    });

    if (hasElectron) {
      window.electronAPI.sendTimerAction('resume');
    }
  }, [hasElectron, persistState]);

  const skipBreak = useCallback(() => {
    const { focusPhase, settings: currentSettings } = stateRef.current;
    if (focusPhase === 'focus') return; // Cannot skip focus, only break

    const nextPhase = 'focus';
    const nextPhaseSecs = getPhaseDurationSeconds('focus', currentSettings);

    setFocusPhase(nextPhase);
    setFocusState('ready');
    setFocusStartTime(null);
    setFocusElapsedSeconds(0);
    setFocusRemainingSeconds(nextPhaseSecs);
    setWarningMessage('');

    persistState({
      focusPhase: nextPhase,
      focusState: 'ready',
      focusStartTime: null,
      focusElapsedSeconds: 0,
    });

    if (hasElectron) {
      window.electronAPI.sendTimerAction('skip-break');
    }
  }, [getPhaseDurationSeconds, hasElectron, persistState]);

  const resetFocusTimer = useCallback(() => {
    const { focusState, focusElapsedSeconds } = stateRef.current;
    if (focusState === 'running' || (focusState === 'paused' && focusElapsedSeconds > 0)) {
      if (!window.confirm('Reset Focus Mode timer? Current round progress will be lost.')) {
        return;
      }
    }
    resetFocusTimerDirect();
  }, [resetFocusTimerDirect]);

  // ── UNIFIED WRAPPERS FOR ACTIVE MODE ─────────────────────────────────────────
  const startTimer = useCallback((subj) => {
    if (stateRef.current.timerMode === 'focus') {
      startFocusTimer(subj);
    } else {
      startFreeTimer(subj);
    }
  }, [startFocusTimer, startFreeTimer]);

  const pauseTimer = useCallback(() => {
    if (stateRef.current.timerMode === 'focus') {
      pauseFocusTimer();
    } else {
      pauseFreeTimer();
    }
  }, [pauseFocusTimer, pauseFreeTimer]);

  const resumeTimer = useCallback(() => {
    if (stateRef.current.timerMode === 'focus') {
      resumeFocusTimer();
    } else {
      resumeFreeTimer();
    }
  }, [resumeFocusTimer, resumeFreeTimer]);

  const stopTimer = useCallback(() => {
    const mode = stateRef.current.timerMode;
    const currentState = mode === 'focus' ? stateRef.current.focusState : stateRef.current.timerState;
    if (currentState === 'running') {
      pauseTimer();
    } else if (currentState === 'paused') {
      resumeTimer();
    }
  }, [pauseTimer, resumeTimer]);

  const resetTimer = useCallback(() => {
    if (stateRef.current.timerMode === 'focus') {
      resetFocusTimer();
    } else {
      resetFreeTimer();
    }
  }, [resetFocusTimer, resetFreeTimer]);

  const submitTimer = useCallback(async (customSubject, callbackOnSuccess) => {
    if (stateRef.current.timerMode === 'free') {
      return submitFreeTimer(customSubject, callbackOnSuccess);
    }
    // In focus mode, sessions auto-save on completion. If user manually submits partial focus time:
    const { focusPhase, focusElapsedSeconds, timerSubject } = stateRef.current;
    if (focusPhase !== 'focus') {
      setWarningMessage('Breaks cannot be saved as study time.');
      return;
    }
    if (focusElapsedSeconds < 60) {
      setWarningMessage('At least 1 minute of focus time is required to save manually.');
      return;
    }
    const subject = (customSubject !== undefined ? customSubject : timerSubject).trim();
    if (!subject) throw new Error('Subject is required.');

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setWarningMessage('');

    try {
      const result = await api.saveTimerSession({
        subject,
        elapsedSeconds: focusElapsedSeconds,
        durationSeconds: focusElapsedSeconds,
      });
      if (result.success) {
        resetFocusTimerDirect();
        if (callbackOnSuccess) callbackOnSuccess(result);
        if (onSessionSaved) onSessionSaved();
      } else {
        setWarningMessage(result.error || 'Failed to save session.');
      }
    } catch (err) {
      console.error('Submit focus session error:', err);
      setWarningMessage(err.message || 'Failed to save study session.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [submitFreeTimer, resetFocusTimerDirect, onSessionSaved]);

  // ── KEYBOARD SHORTCUTS ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        return; // Don't trigger shortcuts while typing
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const mode = stateRef.current.timerMode;
        const activeState = mode === 'focus' ? stateRef.current.focusState : stateRef.current.timerState;
        if (activeState === 'ready') {
          try {
            startTimer();
          } catch (_) {}
        } else if (activeState === 'running') {
          pauseTimer();
        } else if (activeState === 'paused') {
          resumeTimer();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        resetTimer();
      } else if (e.key === 's' || e.key === 'S') {
        if (stateRef.current.timerMode === 'focus' && stateRef.current.focusPhase !== 'focus') {
          skipBreak();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startTimer, pauseTimer, resumeTimer, resetTimer, skipBreak]);

  // ── WIDGET CONTROLS ────────────────────────────────────────────────────────
  const openTimerWidget = useCallback(() => {
    if (hasElectron) {
      persistState();
      window.electronAPI.openFloatingWidget();
    } else {
      setShowInPageWidget(true);
    }
  }, [hasElectron, persistState]);

  const closeInPageWidget = useCallback(() => {
    setShowInPageWidget(false);
  }, []);

  // Compute Focus Progress (0 to 100)
  const currentTotalPhaseSecs = getPhaseDurationSeconds(focusPhase, settings);
  const focusProgress = Math.min(100, Math.max(0, Math.round(((currentTotalPhaseSecs - focusRemainingSeconds) / currentTotalPhaseSecs) * 100)));

  return (
    <TimerContext.Provider
      value={{
        // Mode
        timerMode,
        switchTimerMode,
        // Free Timer
        timerState,
        timerSubject,
        setTimerSubject,
        timerElapsedSeconds,
        durationSeconds: timerElapsedSeconds,
        displaySeconds,
        // Focus Timer
        focusPhase,
        focusRound,
        focusState,
        focusRemainingSeconds,
        focusTotalPhaseSeconds: currentTotalPhaseSecs,
        focusProgress,
        pomodoroSettings: settings,
        refreshSettings,
        skipBreak,
        // Shared controls
        isSubmitting,
        warningMessage,
        setWarningMessage,
        hasElectron,
        showInPageWidget,
        formatTime,
        formatTimeHHMMSS,
        formatTimeHuman,
        playChime,
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
