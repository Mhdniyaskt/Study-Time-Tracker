import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function EditSessionModal({ isOpen, onClose, session, onSessionUpdated }) {
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [errors, setErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session) {
      setSubject(session.subject || '');
      const h = Math.floor((session.duration || 0) / 60);
      const m = (session.duration || 0) % 60;
      setHours(h);
      setMinutes(m);
      setErrors([]);
      setFieldErrors({});
    }
  }, [session]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const validate = () => {
    const errs = [];
    const fields = {};

    const trimmed = subject.trim();
    if (!trimmed) {
      errs.push('Subject is required.');
      fields.subject = 'Subject cannot be empty.';
    } else if (trimmed.length < 2) {
      errs.push('Subject must be at least 2 characters.');
      fields.subject = 'Subject must be at least 2 characters.';
    } else if (trimmed.length > 50) {
      errs.push('Subject must be 50 characters or fewer.');
      fields.subject = 'Subject must be 50 characters or fewer.';
    }

    const h = hours === '' ? 0 : parseInt(hours, 10);
    if (isNaN(h) || h < 0) {
      errs.push('Hours must be a non-negative whole number.');
      fields.hours = 'Hours cannot be negative.';
    } else if (h > 23) {
      errs.push('Hours cannot exceed 23.');
      fields.hours = 'Hours cannot exceed 23.';
    }

    const m = minutes === '' ? 0 : parseInt(minutes, 10);
    if (isNaN(m) || m < 0 || m > 59) {
      errs.push('Minutes must be between 0 and 59.');
      fields.minutes = 'Minutes must be between 0 and 59.';
    }

    if (errs.length === 0 && h === 0 && m === 0) {
      errs.push('Please enter a duration greater than 0 (hours and minutes cannot both be 0).');
      fields.duration = 'Study duration must be greater than 0.';
    }

    setErrors(errs);
    setFieldErrors(fields);
    return errs.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await api.updateSession(session._id, {
        subject: subject.trim(),
        hours: hours === '' ? 0 : parseInt(hours, 10),
        minutes: minutes === '' ? 0 : parseInt(minutes, 10),
      });

      if (onSessionUpdated) onSessionUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to update session:', err);
      if (err.data && err.data.errors) {
        setErrors(err.data.errors);
      } else {
        setErrors([err.message || 'Failed to update session.']);
      }
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
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Edit Study Session</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Validation error banner */}
        {errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Please fix the following:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map((e, idx) => (
                <li key={idx} className="text-xs text-red-600 dark:text-red-400">{e}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Subject */}
          <div>
            <label htmlFor="editSubject" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              id="editSubject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (fieldErrors.subject) setFieldErrors(prev => ({ ...prev, subject: null }));
              }}
              required
              className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                fieldErrors.subject
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-400'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-400'
              }`}
            />
            {fieldErrors.subject && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.subject}</p>
            )}
          </div>

          {/* Hours & Minutes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="editHours" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Hours
              </label>
              <input
                type="number"
                id="editHours"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => {
                  setHours(e.target.value);
                  if (fieldErrors.hours || fieldErrors.duration) {
                    setFieldErrors(prev => ({ ...prev, hours: null, duration: null }));
                  }
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  fieldErrors.hours || fieldErrors.duration
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-400'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-400'
                }`}
              />
              {fieldErrors.hours && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.hours}</p>
              )}
            </div>

            <div>
              <label htmlFor="editMinutes" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Minutes
              </label>
              <input
                type="number"
                id="editMinutes"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => {
                  setMinutes(e.target.value);
                  if (fieldErrors.minutes || fieldErrors.duration) {
                    setFieldErrors(prev => ({ ...prev, minutes: null, duration: null }));
                  }
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  fieldErrors.minutes || fieldErrors.duration
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-400'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-400'
                }`}
              />
              {fieldErrors.minutes && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.minutes}</p>
              )}
            </div>
          </div>

          {/* Duration Error */}
          {fieldErrors.duration && (
            <p className="text-xs text-red-500">{fieldErrors.duration}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-2 rounded-lg text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 rounded-lg text-sm transition"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
