/**
 * Preload script — Electron IPC bridge (contextIsolation: true)
 *
 * Exposes a safe, narrow electronAPI surface to every renderer window.
 * Both the main dashboard (index.ejs) and the floating widget
 * (floating-timer.html) use the same preload, so every channel is declared
 * here — renderers simply ignore the calls they don't need.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // ── Timer state ──────────────────────────────────────────────────────────

  /** Subscribe to timer-state broadcasts from the main process. */
  onTimerState: (callback) => {
    ipcRenderer.on('timer-state-update', (_event, state) => callback(state));
  },

  /** Send a timer control action to the main process. */
  sendTimerAction: (action, data) => {
    ipcRenderer.send('timer-action', { action, data });
  },

  /** Ask the main process to reply with the current shared timer state. */
  requestTimerState: () => {
    ipcRenderer.send('request-timer-state');
  },

  /**
   * Main process calls this on the dashboard renderer when the floating
   * widget triggers a "stop-and-save" so the fetch() runs in the window
   * that already has an active HTTP session.
   */
  onSaveTimerSession: (callback) => {
    ipcRenderer.on('save-timer-session', (_event, data) => callback(data));
  },

  // ── Widget window management ──────────────────────────────────────────────

  /** Tell the main process to open (or show/focus) the floating widget. */
  openFloatingWidget: () => {
    ipcRenderer.send('open-floating-widget');
  },

  /** Hide the floating widget window without destroying it. */
  closeFloatingWidget: () => {
    ipcRenderer.send('close-floating-widget');
  },

  /** Bring the main Study Time Tracker window to the front. */
  focusMainWindow: () => {
    ipcRenderer.send('focus-main-window');
  },

  // ── Widget bounds persistence ─────────────────────────────────────────────

  /**
   * Persist the widget window bounds so they survive restarts.
   * @param {{ x: number, y: number, width: number, height: number }} bounds
   */
  saveWidgetBounds: (bounds) => {
    ipcRenderer.send('save-widget-bounds', bounds);
  },

  /**
   * Retrieve previously saved widget bounds.
   * Returns a Promise that resolves to the bounds object or null.
   */
  loadWidgetBounds: () => ipcRenderer.invoke('load-widget-bounds'),

  // ── Misc ──────────────────────────────────────────────────────────────────

  minimizeWindow: () => {
    ipcRenderer.send('minimize-window');
  },

  showNotification: (options) => {
    ipcRenderer.send('show-notification', options);
  },
});
