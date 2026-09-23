import React, { useState } from 'react';
import api from '../../services/api';

export default function AddSessionForm({ onSessionAdded }) {
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [errors, setErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      await api.createSession({
        subject: subject.trim(),
        hours: hours === '' ? 0 : parseInt(hours, 10),
        minutes: minutes === '' ? 0 : parseInt(minutes, 10),
      });

      setSubject('');
      setHours('');
      setMinutes('');
      setErrors([]);
      setFieldErrors({});

      if (onSessionAdded) onSessionAdded();
    } catch (err) {
      console.error('Failed to add study session:', err);
      if (err.data && err.data.errors) {
        setErrors(err.data.errors);
      } else {
        setErrors([err.message || 'Failed to save session.']);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Add Study Session</h2>

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
          <label htmlFor="subject" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            placeholder="e.g. Mathematics, History..."
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
            <label htmlFor="hours" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Hours
            </label>
            <input
              type="number"
              id="hours"
              name="hours"
              min="0"
              max="23"
              placeholder="0"
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
            <label htmlFor="minutes" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Minutes
            </label>
            <input
              type="number"
              id="minutes"
              name="minutes"
              min="0"
              max="59"
              placeholder="0"
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

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg text-sm transition"
        >
          {isSubmitting ? 'Adding...' : 'Add Study Session'}
        </button>
      </form>
    </div>
  );
}
