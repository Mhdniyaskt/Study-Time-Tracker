/**
 * Preload script for Electron IPC communication
 * Exposes safe API to renderer process for timer synchronization
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Timer state synchronization
  onTimerState: (callback) => {
    ipcRenderer.on('timer-state-update', (_event, state) => callback(state));
  },
  
  sendTimerAction: (action, data) => {
    ipcRenderer.send('timer-action', { action, data });
  },
  
  requestTimerState: () => {
    ipcRenderer.send('request-timer-state');
  },
  
  // Listen for save requests from main process (triggered by floating widget)
  onSaveTimerSession: (callback) => {
    ipcRenderer.on('save-timer-session', (_event, data) => callback(data));
  },
  
  // Floating widget controls
  closeFloatingWidget: () => {
    ipcRenderer.send('close-floating-widget');
  },
  
  minimizeWindow: () => {
    ipcRenderer.send('minimize-window');
  }
});
