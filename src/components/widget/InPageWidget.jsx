import React, { useState, useEffect, useRef } from 'react';
import { useTimer } from '../../hooks/useTimer';

export default function InPageWidget() {
  const {
    showInPageWidget,
    closeInPageWidget,
    timerMode,
    switchTimerMode,
    timerState,
    focusState,
    focusPhase,
    focusRound,
    focusRemainingSeconds,
    pomodoroSettings,
    skipBreak,
    timerSubject,
    displaySeconds,
    formatTime,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  } = useTimer();

  const [pos, setPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('compactWidgetPos') || 'null');
      if (saved && saved.top != null && saved.left != null) {
        return { top: saved.top, left: saved.left };
      }
    } catch (_) {}
    return { top: 20, left: window.innerWidth - 260 };
  });

  const [subjectWarning, setSubjectWarning] = useState('');

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const newLeft = Math.max(8, Math.min(e.clientX - dragOffsetRef.current.x, window.innerWidth - 250));
      const newTop = Math.max(8, Math.min(e.clientY - dragOffsetRef.current.y, window.innerHeight - 180));
      setPos({ top: newTop, left: newLeft });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        try {
          localStorage.setItem('compactWidgetPos', JSON.stringify(pos));
        } catch (_) {}
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pos]);

  if (!showInPageWidget) return null;

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - pos.left,
      y: e.clientY - pos.top,
    };
  };

  const isFocus = timerMode === 'focus';
  const activeState = isFocus ? focusState : timerState;
  const isRunning = activeState === 'running';
  const isPaused = activeState === 'paused';
  const isBreak = isFocus && (focusPhase === 'shortBreak' || focusPhase === 'longBreak');
  const trimmedSubject = (timerSubject || '').trim();
  const timeToDisplay = isFocus ? focusRemainingSeconds : displaySeconds;

  const totalRounds = pomodoroSettings?.roundsUntilLongBreak || 4;

  const dotColor = isRunning ? (isBreak ? '#a855f7' : '#10b981') : isPaused ? '#f59e0b' : '#64748b';

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9000,
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: '250px',
        minWidth: '220px',
        background: '#121316',
        borderRadius: '12px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#f1f5f9',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Title bar / drag handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          height: '34px',
          background: '#18191e',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          cursor: 'grab',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#94a3b8',
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {trimmedSubject ? `📚 ${trimmedSubject}` : '📚 No subject'}
        </span>

        {/* Status dot */}
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            boxShadow: isRunning ? `0 0 8px ${dotColor}` : 'none',
          }}
        />

        {/* Mode Toggle Button */}
        <button
          onClick={() => switchTimerMode(isFocus ? 'free' : 'focus', true)}
          title="Switch Timer Mode"
          style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 5px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: isFocus ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            color: isFocus ? '#818cf8' : '#94a3b8',
            cursor: 'pointer',
          }}
        >
          {isFocus ? 'FOCUS' : 'FREE'}
        </button>

        {/* Restore full timer */}
        <button
          onClick={closeInPageWidget}
          title="Return to main window"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px 3px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3" />
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={closeInPageWidget}
          title="Close widget"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px 3px',
            fontSize: '14px',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* Clock Display */}
      <div style={{ textAlign: 'center', padding: '8px 14px 2px' }}>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            color: '#f1f5f9',
          }}
        >
          {formatTime(timeToDisplay)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: isBreak ? '#a855f7' : isRunning ? '#10b981' : isPaused ? '#f59e0b' : '#64748b',
              background: isBreak ? 'rgba(168, 85, 247, 0.15)' : isRunning ? 'rgba(16, 185, 129, 0.12)' : isPaused ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              padding: '2px 7px',
              borderRadius: '9999px',
            }}
          >
            {isFocus
              ? (isBreak ? (focusPhase === 'longBreak' ? 'Long Break' : 'Break') : (isRunning ? 'Focusing' : isPaused ? 'Paused' : 'Ready'))
              : (isRunning ? 'Studying' : isPaused ? 'Paused' : 'Ready')}
          </span>

          {isFocus && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '2px 5px',
                borderRadius: '4px',
              }}
            >
              R {focusRound}/{totalRounds}
            </span>
          )}
        </div>
      </div>

      {/* Subject Warning Banner */}
      {subjectWarning && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            borderTop: '1px solid rgba(245, 158, 11, 0.3)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 500,
            color: '#fbbf24',
            textAlign: 'center',
          }}
        >
          ⚠️ {subjectWarning}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '8px 12px 10px' }}>
        {activeState === 'ready' && (
          <button
            onClick={() => {
              if (!trimmedSubject && (!isFocus || focusPhase === 'focus')) {
                setSubjectWarning('Enter subject on main page');
                const inp = document.getElementById('timerSubject');
                if (inp) inp.focus();
                setTimeout(() => setSubjectWarning(''), 3500);
                return;
              }
              setSubjectWarning('');
              startTimer(trimmedSubject);
            }}
            title="Start"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '30px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: '#10b981',
              color: '#ffffff',
            }}
          >
            ▶ Start
          </button>
        )}

        {isRunning && (
          <button
            onClick={pauseTimer}
            title="Pause"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '30px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: '#f59e0b',
              color: '#ffffff',
            }}
          >
            ⏸ Pause
          </button>
        )}

        {isPaused && (
          <button
            onClick={resumeTimer}
            title="Resume"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '30px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: '#10b981',
              color: '#ffffff',
            }}
          >
            ▶ Resume
          </button>
        )}

        {isBreak && (
          <button
            onClick={skipBreak}
            title="Skip Break"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '30px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: '#a855f7',
              color: '#ffffff',
            }}
          >
            ⏭ Skip
          </button>
        )}

        <button
          onClick={resetTimer}
          title="Reset"
          disabled={activeState === 'ready' && !trimmedSubject && (!isFocus || focusPhase === 'focus')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            height: '30px',
            padding: '0 10px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '7px',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            background: '#22242a',
            color: '#94a3b8',
            opacity: (activeState === 'ready' && !trimmedSubject && (!isFocus || focusPhase === 'focus')) ? 0.35 : 1,
          }}
        >
          ↻ Reset
        </button>
      </div>
    </div>
  );
}
