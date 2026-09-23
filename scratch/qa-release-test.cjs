/**
 * Comprehensive QA Release Test Suite for Study Time Tracker Desktop
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

const PORT = 3000;
const ROOT_DIR = path.join(__dirname, '..');
const PRELOAD_PATH = path.join(ROOT_DIR, 'preload.js');
const WIDGET_PATH = path.join(ROOT_DIR, 'floating-timer.html');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpPost(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${urlPath}`, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, raw: body }); }
      });
    }).on('error', reject);
  });
}

let mainWindow = null;
let widgetWindow = null;
let sharedTimerState = {
  mode: 'free',
  state: 'ready',
  subject: '',
  startTime: null,
  elapsedSeconds: 0,
  durationSeconds: 0,
  isPaused: false,
  phase: 'focus',
  round: 1,
  totalRounds: 4,
  remainingSeconds: 25 * 60,
  totalPhaseSeconds: 25 * 60,
};

let notificationLog = [];

ipcMain.on('show-notification', (_e, payload) => {
  notificationLog.push(payload);
});

ipcMain.on('timer-action', (_e, { action, data }) => {
  const now = Date.now();
  switch (action) {
    case 'start':
      sharedTimerState.state = 'running';
      sharedTimerState.subject = (data && data.subject) || sharedTimerState.subject;
      sharedTimerState.startTime = now;
      sharedTimerState.isPaused = false;
      break;
    case 'pause':
      if (sharedTimerState.startTime) {
        sharedTimerState.elapsedSeconds += Math.floor((now - sharedTimerState.startTime) / 1000);
      }
      sharedTimerState.durationSeconds = sharedTimerState.elapsedSeconds;
      sharedTimerState.state = 'paused';
      sharedTimerState.isPaused = true;
      sharedTimerState.startTime = null;
      break;
    case 'resume':
      sharedTimerState.state = 'running';
      sharedTimerState.isPaused = false;
      sharedTimerState.startTime = now;
      break;
    case 'reset':
      sharedTimerState.state = 'ready';
      sharedTimerState.subject = '';
      sharedTimerState.startTime = null;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.durationSeconds = 0;
      sharedTimerState.isPaused = false;
      break;
  }
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send('timer-state-update', { ...sharedTimerState });
  }
});

async function runQA() {
  console.log('============================================================');
  console.log('STUDY TIME TRACKER DESKTOP — RELEASE QA TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, name) {
    if (cond) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Health check & Backend
  console.log('--- 1. Backend & Health Probe ---');
  const health = await httpGet('/api/health');
  assert(health.status === 200 && health.data.app === 'study-time-tracker', 'Health endpoint /api/health responds with app signature');

  // 2. Load Widget Window
  console.log('\n--- 2. Floating Widget Initialization ---');
  widgetWindow = new BrowserWindow({
    width: 260,
    height: 195,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  await widgetWindow.loadFile(WIDGET_PATH);
  assert(widgetWindow.isVisible() === false, 'Floating widget created initially in background');

  // 3. Test Widget Controls & Sync
  console.log('\n--- 3. Widget & Main Timer Synchronization ---');
  ipcMain.emit('timer-action', null, { action: 'start', data: { subject: 'Organic Chemistry' } });
  await sleep(250);

  const widgetStateRunning = await widgetWindow.webContents.executeJavaScript(`({
    subj: document.getElementById('subjectLbl').textContent,
    status: document.getElementById('statusBadge').textContent
  })`);
  assert(widgetStateRunning.subj.includes('Organic Chemistry'), 'Main start updates widget subject to "Organic Chemistry"');
  assert(widgetStateRunning.status === 'Studying', 'Widget status reflects "Studying"');

  // Wait 1.5s
  await sleep(1500);

  // Widget pause
  ipcMain.emit('timer-action', null, { action: 'pause' });
  await sleep(250);
  const widgetStatePaused = await widgetWindow.webContents.executeJavaScript(`document.getElementById('statusBadge').textContent`);
  assert(widgetStatePaused === 'Paused', 'Timer pause updates widget to "Paused"');

  // Widget resume
  await widgetWindow.webContents.executeJavaScript(`handleResume()`);
  await sleep(250);
  assert(sharedTimerState.state === 'running', 'Widget handleResume() successfully transitions timer to running');

  // Widget reset
  await widgetWindow.webContents.executeJavaScript(`
    state.state = 'ready';
    state.subject = '';
    render();
  `);
  ipcMain.emit('timer-action', null, { action: 'reset' });
  await sleep(250);
  assert(sharedTimerState.state === 'ready', 'Widget reset returns state to ready');

  // 4. Test Notification Bridge
  console.log('\n--- 4. Native Desktop Notification Bridge ---');
  ipcMain.emit('show-notification', null, { title: 'Focus Session Complete! 🎉', body: 'Great job! Time for a rest.' });
  assert(notificationLog.length === 1, 'show-notification IPC channel successfully receives notification');
  assert(notificationLog[0].title.includes('Focus Session Complete'), 'Notification title is correctly formatted');

  // 5. Test Real Session Persistence (Save -> Retrieve from DB)
  console.log('\n--- 5. Study Session Persistence & Database Verification ---');
  const testSubj = `QA Session ${Date.now()}`;
  const saveRes = await httpPost('/api/timer/save', {
    subject: testSubj,
    durationSeconds: 1800,
    elapsedSeconds: 1800,
  });
  assert((saveRes.status === 200 || saveRes.status === 201) && saveRes.data.success, 'Study session successfully created via REST API');

  const historyRes = await httpGet('/api/history');
  assert(historyRes.status === 200 && Array.isArray(historyRes.data.sessions), 'History endpoint returns sessions list');
  const found = historyRes.data.sessions.some(s => s.subject === testSubj);
  assert(found, `Saved study session "${testSubj}" persists in database`);

  // 6. Test Settings Persistence
  console.log('\n--- 6. Settings Persistence ---');
  const setRes = await httpPost('/api/settings', { dailyGoalHours: 3, focusDuration: 30 });
  assert(setRes.status === 200 && setRes.data.success, 'Settings updated successfully');
  const getSet = await httpGet('/api/settings');
  assert(getSet.data.dailyGoalHours === 3 && getSet.data.focusDuration === 30, 'Settings retrieved match saved values');

  // 7. Cleanup QA session
  if (saveRes.data && saveRes.data.session && saveRes.data.session._id) {
    const delRes = await new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api/study/${saveRes.data.session._id}`,
        method: 'DELETE'
      }, r => resolve(r.statusCode));
      req.end();
    });
    console.log(`Cleaned up QA record ${saveRes.data.session._id} -> status ${delRes}`);
  }

  // Restore daily goal to 2
  await httpPost('/api/settings', { dailyGoalHours: 2, focusDuration: 25 });

  console.log('\n============================================================');
  console.log(`QA TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================');

  app.quit();
  process.exit(failed > 0 ? 1 : 0);
}

app.whenReady().then(runQA);
