import React, { useState } from 'react';
import { useTimer } from '../../hooks/useTimer';

export default function StudyTimer({ onSessionSaved }) {
  const {
    timerState,
    timerSubject,
    setTimerSubject,
    displaySeconds,
    timerElapsedSeconds,
    isSubmitting,
    warningMessage,
    setWarningMessage,
    hasElectron,
    formatTime,
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

  // Compute status line styling
  let statusText = 'Ready to start';
  let statusClass = 'text-xs text-gray-400 dark:text-gray-500 font-medium';
  if (timerState === 'running') {
    statusText = '● Studying';
    statusClass = 'text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-pulse';
  } else if (timerState === 'paused') {
    statusText = '⏸ Paused';
    statusClass = 'text-xs text-amber-600 dark:text-amber-400 font-medium';
  }

  // Submit button text
  const submitText = timerState === 'paused' && timerElapsedSeconds > 0
    ? `Submit (Save ${formatTimeHuman(timerElapsedSeconds)})`
    : 'Submit';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Study Timer</h2>

        {/* Pop-out widget button */}
        <button
          id="openWidgetBtn"
          onClick={openTimerWidget}
          title={hasElectron ? "Open floating timer widget (always on top)" : "Open in-page compact timer widget"}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-lg transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3" />
          </svg>
          <span>{hasElectron ? 'Desktop Widget' : 'Widget'}</span>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: hasElectron ? '#4ade80' : '#9ca3af' }}
            title={hasElectron ? "Runtime: Electron desktop widget" : "Runtime: Browser-only widget"}
          />
        </button>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-5">
        <div id="timerDisplay" className="text-5xl font-bold text-gray-800 dark:text-gray-100 font-mono tracking-tight mb-2">
          {formatTime(displaySeconds)}
        </div>
        <p id="timerStatus" className={statusClass}>
          {statusText}
        </p>
      </div>

      {/* Subject Input */}
      <div className="mb-4">
        <label htmlFor="timerSubject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Subject
        </label>
        <input
          type="text"
          id="timerSubject"
          placeholder="e.g. Mathematics, History, JavaScript..."
          value={timerSubject}
          disabled={timerState === 'running'}
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

      {/* Timer Control Buttons (Start / Pause / Resume, and Reset) */}
      <div className="grid grid-cols-2 gap-3 mb-3">
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

      {/* Helper info */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
        Pause the timer when taking a break. Click Submit when done to save your study session.
      </p>

      {/* Success Notification */}
      {successMessage && (
        <div id="timerSuccess" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-800 p-2.5 text-center">
          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Timer Warning Message */}
      {warningMessage && (
        <div id="timerWarning" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-2.5 text-center">
          <p className="text-xs text-amber-800 dark:text-amber-300">{warningMessage}</p>
        </div>
      )}
    </div>
  );
}
