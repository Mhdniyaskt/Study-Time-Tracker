import React, { useState, useEffect, useRef } from 'react';
import { useTimer } from '../../hooks/useTimer';

export default function InPageWidget() {
  const {
    showInPageWidget,
    closeInPageWidget,
    timerState,
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

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const newLeft = Math.max(8, Math.min(e.clientX - dragOffsetRef.current.x, window.innerWidth - 240));
      const newTop = Math.max(8, Math.min(e.clientY - dragOffsetRef.current.y, window.innerHeight - 170));
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

  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const trimmedSubject = (timerSubject || '').trim();

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9000,
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: '240px',
        minWidth: '200px',
        minHeight: '160px',
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
            backgroundColor: isRunning ? '#10b981' : isPaused ? '#f59e0b' : '#64748b',
            boxShadow: isRunning ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
          }}
        />

        {/* Restore full timer */}
        <button
          onClick={closeInPageWidget}
          title="Return to main timer"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px 4px',
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
            padding: '2px 4px',
            fontSize: '14px',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* Clock Display */}
      <div style={{ textAlign: 'center', padding: '10px 14px 2px' }}>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: '34px',
            fontWeight: 600,
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            color: '#f1f5f9',
          }}
        >
          {formatTime(displaySeconds)}
        </div>
        <div
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 500,
            color: isRunning ? '#10b981' : isPaused ? '#f59e0b' : '#64748b',
            background: isRunning ? 'rgba(16, 185, 129, 0.1)' : isPaused ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            padding: '2px 8px',
            borderRadius: '9999px',
            marginTop: '4px',
          }}
        >
          {isRunning ? 'Studying' : isPaused ? 'Paused' : 'Ready'}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '8px 14px 12px' }}>
        {timerState === 'ready' && (
          <button
            onClick={() => {
              if (!trimmedSubject) {
                closeInPageWidget();
                return;
              }
              startTimer(trimmedSubject);
            }}
            title="Start"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: '#10b981',
              color: '#ffffff',
              minWidth: '80px',
              height: '32px',
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: '#f59e0b',
              color: '#ffffff',
              minWidth: '80px',
              height: '32px',
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: '#10b981',
              color: '#ffffff',
              minWidth: '80px',
              height: '32px',
            }}
          >
            ▶ Resume
          </button>
        )}

        <button
          onClick={resetTimer}
          title="Reset"
          disabled={timerState === 'ready' && displaySeconds === 0 && !trimmedSubject}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            background: '#22242a',
            color: '#94a3b8',
            minWidth: '80px',
            height: '32px',
            opacity: (timerState === 'ready' && displaySeconds === 0 && !trimmedSubject) ? 0.35 : 1,
          }}
        >
          ↻ Reset
        </button>
      </div>
    </div>
  );
}
