import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function SettingsModal({ isOpen, onClose, currentGoalHours = 2, onSettingsSaved }) {
  const [goalHours, setGoalHours] = useState(currentGoalHours);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setGoalHours(currentGoalHours);
  }, [currentGoalHours]);

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
      await api.updateSettings({ dailyGoalHours: val });
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
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="dailyGoalHours" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Daily Study Goal (hours)
            </label>
            <input
              type="number"
              id="dailyGoalHours"
              name="dailyGoalHours"
              min="0.5"
              max="24"
              step="0.5"
              value={goalHours}
              onChange={(e) => setGoalHours(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Current goal: {currentGoalHours}h per day
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg text-sm transition"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
