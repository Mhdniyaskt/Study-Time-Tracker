/**
 * Centralized API Service for Study Time Tracker
 * All client-side fetch calls go through this module.
 */

const API_BASE = '/api';

/**
 * Generic JSON request helper with error handling
 */
async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || (data.errors ? data.errors.join(' ') : `Request failed with status ${response.status}`);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // ── Dashboard ────────────────────────────────────────────────────────────
  getDashboard() {
    return request(`${API_BASE}/dashboard`);
  },

  // ── Study Sessions CRUD ──────────────────────────────────────────────────
  createSession({ subject, hours, minutes }) {
    return request(`${API_BASE}/study`, {
      method: 'POST',
      body: JSON.stringify({ subject, hours, minutes }),
    });
  },

  getSession(id) {
    return request(`${API_BASE}/study/${id}`);
  },

  updateSession(id, { subject, hours, minutes }) {
    return request(`${API_BASE}/study/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ subject, hours, minutes }),
    });
  },

  deleteSession(id) {
    return request(`${API_BASE}/study/${id}`, {
      method: 'DELETE',
    });
  },

  // ── Statistics & History ─────────────────────────────────────────────────
  getStatistics({ period = 'all-time', startDate = '', endDate = '' } = {}) {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request(`${API_BASE}/statistics?${params.toString()}`);
  },

  getHistory({ period = 'all-time', startDate = '', endDate = '', page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (page != null) params.append('page', page);
    if (limit != null) params.append('limit', limit);
    return request(`${API_BASE}/history?${params.toString()}`);
  },

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings() {
    return request(`${API_BASE}/settings`);
  },

  updateSettings(settingsPayload) {
    return request(`${API_BASE}/settings`, {
      method: 'POST',
      body: JSON.stringify(settingsPayload),
    });
  },

  // ── Study Timer Save ─────────────────────────────────────────────────────
  saveTimerSession({ subject, elapsedSeconds, durationSeconds, sessionId }) {
    // /timer/save endpoint exists directly on the backend
    return request('/timer/save', {
      method: 'POST',
      body: JSON.stringify({
        subject,
        elapsedSeconds,
        durationSeconds: durationSeconds ?? elapsedSeconds,
        sessionId,
      }),
    });
  },
};

export default api;
