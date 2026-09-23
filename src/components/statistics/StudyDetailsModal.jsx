import React, { useEffect } from 'react';

export default function StudyDetailsModal({ isOpen, onClose, dateStr, totalTime, sessions = [] }) {
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

  const formattedDate = dateStr
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const formatHAndM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{formattedDate}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Study Time</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalTime}</p>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Study Sessions:</p>
            {sessions.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.subject}</span>
                <span className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">
                  {formatHAndM(s.duration)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">No study sessions on this day.</p>
        )}
      </div>
    </div>
  );
}
