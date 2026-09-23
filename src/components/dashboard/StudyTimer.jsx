import React, { useState } from 'react';
import { useTimer } from '../../hooks/useTimer';

export default function StudyTimer({ onSessionSaved }) {
  const {
    timerMode,
    switchTimerMode,
    timerState,
    timerSubject,
    setTimerSubject,
    displaySeconds,
    timerElapsedSeconds,
    // Focus Mode
    focusPhase,
    focusRound,
    focusState,
    focusRemainingSeconds,
    focusTotalPhaseSeconds,
    focusProgress,
    pomodoroSettings,
    skipBreak,
    // Shared
    isSubmitting,
    warningMessage,
    setWarningMessage,
    hasElectron,
    formatTime,
    formatTimeHHMMSS,
    formatTimeHuman,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    submitTimer,
    openTimerWidget,
  } = useTimer();

  const [subjectError, setSubjectError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  const isFocus = timerMode === 'focus';
  const activeState = isFocus ? focusState : timerState;
  const isRunning = activeState === 'running';
  const isPaused = activeState === 'paused';
  const isBreak = isFocus && (focusPhase === 'shortBreak' || focusPhase === 'longBreak');
  const totalRounds = pomodoroSettings?.roundsUntilLongBreak || 4;
  const useMinimalDial = pomodoroSettings?.timerStyle === 'minimal' || pomodoroSettings?.countdownDial === false;

  // Handle Mode Switch Click
  const handleModeClick = (targetMode) => {
    if (targetMode === timerMode) return;
    const isBusy = (timerMode === 'free' && timerState !== 'ready') ||
                   (timerMode === 'focus' && focusState !== 'ready');

    if (isBusy) {
      setPendingMode(targetMode);
      setShowSwitchModal(true);
    } else {
      switchTimerMode(targetMode, true);
    }
  };

  const confirmModeSwitch = () => {
    if (pendingMode) {
      // Pause or reset active timer and switch
      if (isRunning) pauseTimer();
      switchTimerMode(pendingMode, true);
    }
    setShowSwitchModal(false);
    setPendingMode(null);
  };

  // Free Timer Start
  const handleStart = () => {
    setSubjectError('');
    setSuccessMessage('');
    if (!timerSubject || !timerSubject.trim()) {
      setSubjectError('Subject is required to start the timer.');
      return;
    }
    try {
      startTimer(timerSubject);
    } catch (err) {
      setSubjectError(err.message);
    }
  };

  // Free Timer Submit
  const handleSubmit = async () => {
    setSubjectError('');
    setSuccessMessage('');
    try {
      await submitTimer(timerSubject, (result) => {
        setSuccessMessage(`Session saved: ${formatTimeHuman(result.durationSeconds || timerElapsedSeconds)} logged!`);
        setTimeout(() => setSuccessMessage(''), 4000);
        if (onSessionSaved) onSessionSaved();
      });
    } catch (err) {
      setSubjectError(err.message);
    }
  };

  // Free timer submit text
  const submitText = timerState === 'paused' && timerElapsedSeconds > 0
    ? `Submit (Save ${formatTimeHuman(timerElapsedSeconds)})`
    : 'Submit';

  // Circular Dial Math (radius = 78)
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  // In Focus mode, countdown ring shrinks as remaining decreases
  const strokeOffset = circumference - (focusProgress / 100) * circumference;

  const phaseColor = focusPhase === 'shortBreak'
    ? '#f59e0b' // amber
    : focusPhase === 'longBreak'
      ? '#a855f7' // purple
      : '#10b981'; // emerald focus

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* Header with Title and Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Study Timer</h2>
            {/* Runtime Indicator */}
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: hasElectron ? '#10b981' : '#9ca3af' }}
              title={hasElectron ? "Electron desktop runtime" : "Browser runtime"}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Dual Mode Switcher Tabs */}
            <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600/60 text-xs font-semibold">
              <button
                type="button"
                id="modeFreeBtn"
                onClick={() => handleModeClick('free')}
                className={`px-3 py-1.5 rounded-md transition-all duration-150 ${
                  !isFocus
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Free Timer
              </button>
              <button
                type="button"
                id="modeFocusBtn"
                onClick={() => handleModeClick('focus')}
                className={`px-3 py-1.5 rounded-md transition-all duration-150 ${
                  isFocus
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Focus Mode
              </button>
            </div>

            {/* Pop-out widget button */}
            <button
              id="openWidgetBtn"
              type="button"
              onClick={openTimerWidget}
              title={hasElectron ? "Open floating desktop widget (always on top)" : "Open in-page compact widget"}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-gray-600 rounded-lg transition shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── FOCUS MODE DISPLAY ────────────────────────────────────────────── */}
        {isFocus ? (
          useMinimalDial ? (
            /* Minimalist Digital Display */
            <div className="flex flex-col items-center mb-5 py-4">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{
                  color: phaseColor,
                  backgroundColor: `${phaseColor}20`,
                }}
              >
                {focusPhase === 'shortBreak'
                  ? 'Short Break'
                  : focusPhase === 'longBreak'
                    ? 'Long Break'
                    : 'Focus Session'}
              </span>

              <div
                id="focusTimerDisplay"
                className="text-5xl font-extrabold text-gray-800 dark:text-gray-100 font-mono tracking-tight my-2"
              >
                {formatTime(focusRemainingSeconds)}
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Round {focusRound} / {totalRounds}
                </span>
                <div className="flex gap-1 ml-1">
                  {Array.from({ length: totalRounds }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2 h-2 rounded-full transition-colors ${
                        idx + 1 < focusRound
                          ? 'bg-emerald-500'
                          : idx + 1 === focusRound
                            ? isBreak ? 'bg-amber-400' : 'bg-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-700'
                            : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {isRunning
                  ? (isBreak ? '☕ Rest & recharge' : '⚡ Deep focus in progress')
                  : isPaused
                    ? '⏸ Timer paused'
                    : (isBreak ? 'Ready for your break' : 'Ready to start focusing')}
              </p>
            </div>
          ) : (
            /* Circular Progress Ring Display */
            <div className="flex flex-col items-center mb-5">
              <div className="relative w-48 h-48 flex items-center justify-center my-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-100 dark:text-gray-700/50"
                    fill="transparent"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    stroke={phaseColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{
                      color: phaseColor,
                      backgroundColor: `${phaseColor}20`,
                    }}
                  >
                    {focusPhase === 'shortBreak'
                      ? 'Short Break'
                      : focusPhase === 'longBreak'
                        ? 'Long Break'
                        : 'Focus Session'}
                  </span>

                  <div
                    id="focusTimerDisplay"
                    className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 font-mono tracking-tight"
                  >
                    {formatTime(focusRemainingSeconds)}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Round {focusRound} / {totalRounds}
                    </span>
                    <div className="flex gap-1 ml-1">
                      {Array.from({ length: totalRounds }).map((_, idx) => (
                        <span
                          key={idx}
                          className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                            idx + 1 < focusRound
                              ? 'bg-emerald-500'
                              : idx + 1 === focusRound
                                ? isBreak ? 'bg-amber-400' : 'bg-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-700'
                                : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {isRunning
                  ? (isBreak ? '☕ Rest & recharge' : '⚡ Deep focus in progress')
                  : isPaused
                    ? '⏸ Timer paused'
                    : (isBreak ? 'Ready for your break' : 'Ready to start focusing')}
              </p>
            </div>
          )
        ) : (
          /* ── FREE TIMER DISPLAY ─────────────────────────────────────────── */
          <div className="text-center mb-5 py-4">
            <div id="timerDisplay" className="text-5xl font-bold text-gray-800 dark:text-gray-100 font-mono tracking-tight mb-2">
              {formatTimeHHMMSS ? formatTimeHHMMSS(displaySeconds) : formatTime(displaySeconds)}
            </div>
            <p id="timerStatus" className={`text-xs font-medium ${
              timerState === 'running'
                ? 'text-emerald-600 dark:text-emerald-400 animate-pulse'
                : timerState === 'paused'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-400 dark:text-gray-500'
            }`}>
              {timerState === 'running'
                ? '● Studying'
                : timerState === 'paused'
                  ? '⏸ Paused'
                  : 'Ready to start'}
            </p>
          </div>
        )}

        {/* Subject Input */}
        <div className="mb-4">
          <label htmlFor="timerSubject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Subject {isFocus && <span className="text-xs font-normal text-gray-400">(Required for Focus)</span>}
          </label>
          <input
            type="text"
            id="timerSubject"
            placeholder="e.g. Mathematics, History, JavaScript..."
            value={timerSubject}
            disabled={isRunning}
            onChange={(e) => {
              setTimerSubject(e.target.value);
              if (subjectError) setSubjectError('');
              if (warningMessage) setWarningMessage('');
            }}
            className={`w-full border rounded-lg px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 transition ${
              subjectError
                ? 'border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-400 focus:border-transparent'
            }`}
          />
          {subjectError && (
            <p id="timerSubjectError" className="mt-1 text-xs text-red-500 font-medium">
              {subjectError}
            </p>
          )}
        </div>

        {/* ── CONTROLS: FOCUS MODE ────────────────────────────────────────── */}
        {isFocus ? (
          <div className="space-y-3 mb-2">
            <div className="grid grid-cols-2 gap-3">
              {activeState === 'ready' && (
                <button
                  id="focusStartBtn"
                  type="button"
                  onClick={handleStart}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
                >
                  <span>▶</span>
                  <span>{isBreak ? 'Start Break' : 'Start Focus'}</span>
                </button>
              )}

              {activeState === 'running' && (
                <button
                  id="focusPauseBtn"
                  type="button"
                  onClick={pauseTimer}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
                >
                  <span>⏸</span>
                  <span>Pause</span>
                </button>
              )}

              {activeState === 'paused' && (
                <button
                  id="focusResumeBtn"
                  type="button"
                  onClick={resumeTimer}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
                >
                  <span>▶</span>
                  <span>Resume</span>
                </button>
              )}

              <button
                id="focusResetBtn"
                type="button"
                onClick={resetTimer}
                disabled={activeState === 'ready' && focusPhase === 'focus' && !timerSubject}
                className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
              >
                <span>↻</span>
                <span>Reset</span>
              </button>
            </div>

            {/* Skip Break Button if currently on break */}
            {isBreak && (
              <button
                id="skipBreakBtn"
                type="button"
                onClick={skipBreak}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>⏭</span>
                <span>Skip Break & Start Focus</span>
              </button>
            )}

            <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
              Focus time is automatically logged when the round finishes. Breaks are never saved as study time.
            </p>
          </div>
        ) : (
          /* ── CONTROLS: FREE TIMER ────────────────────────────────────────── */
          <div className="space-y-3 mb-2">
            <div className="grid grid-cols-2 gap-3">
              {timerState === 'ready' && (
                <button
                  id="timerStartBtn"
                  type="button"
                  onClick={handleStart}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
                >
                  <span>▶</span>
                  <span>Start</span>
                </button>
              )}

              {timerState === 'running' && (
                <button
                  id="timerPauseBtn"
                  type="button"
                  onClick={pauseTimer}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
                >
                  <span>⏸</span>
                  <span>Pause</span>
                </button>
              )}

              {timerState === 'paused' && (
                <button
                  id="timerResumeBtn"
                  type="button"
                  onClick={resumeTimer}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
                >
                  <span>▶</span>
                  <span>Resume</span>
                </button>
              )}

              <button
                id="timerResetBtn"
                type="button"
                onClick={resetTimer}
                disabled={timerState === 'ready' && timerElapsedSeconds === 0 && !timerSubject}
                className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
              >
                <span>↻</span>
                <span>Reset</span>
              </button>
            </div>

            {/* Submit Button (Full Width) */}
            <button
              id="timerSubmitBtn"
              type="button"
              onClick={handleSubmit}
              disabled={timerState !== 'paused' || isSubmitting || timerElapsedSeconds < 1}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-700/60 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>✓</span>
              <span id="submitBtnText">{isSubmitting ? 'Saving session...' : submitText}</span>
            </button>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
              Pause the timer when taking a break. Click Submit when done to save your study session.
            </p>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      <div>
        {successMessage && (
          <div id="timerSuccess" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-800 p-2.5 text-center">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">{successMessage}</p>
          </div>
        )}

        {warningMessage && (
          <div id="timerWarning" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-2.5 text-center">
            <p className="text-xs text-amber-800 dark:text-amber-300">{warningMessage}</p>
          </div>
        )}
      </div>

      {/* Mode Switch Confirmation Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-5 border border-gray-200 dark:border-gray-700 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Switch Timer Mode?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              Your active timer is currently in progress. Switching to{' '}
              <strong className="text-gray-700 dark:text-gray-200 uppercase">{pendingMode} mode</strong>{' '}
              will pause the running timer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchModal(false);
                  setPendingMode(null);
                }}
                className="flex-1 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModeSwitch}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
              >
                Switch Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
