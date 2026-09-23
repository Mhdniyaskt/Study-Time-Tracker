const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

const PORT = 3000;
const PRELOAD_PATH = path.join(__dirname, '..', 'preload.js');
const WIDGET_PATH = path.join(__dirname, '..', 'floating-timer.html');

let sharedTimerState = {
  state: 'ready',
  subject: '',
  startTime: null,
  elapsedSeconds: 0,
  durationSeconds: 0,
  isPaused: false,
};

let mainWindow = null;
let widgetWindow = null;

function broadcast() {
  const snapshot = { ...sharedTimerState };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('timer-state-update', snapshot);
  }
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send('timer-state-update', snapshot);
  }
}

ipcMain.on('timer-action', (_e, { action, data }) => {
  const now = Date.now();
  switch (action) {
    case 'start': {
      const subject = (data && data.subject) ? data.subject.trim() : sharedTimerState.subject.trim();
      if (!subject) break;
      sharedTimerState.state = 'running';
      sharedTimerState.subject = subject;
      sharedTimerState.startTime = now;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.durationSeconds = 0;
      sharedTimerState.isPaused = false;
      break;
    }
    case 'pause':
    case 'stop': {
      if (sharedTimerState.state !== 'running') break;
      if (sharedTimerState.startTime) {
        sharedTimerState.elapsedSeconds += Math.floor((now - sharedTimerState.startTime) / 1000);
      }
      sharedTimerState.durationSeconds = sharedTimerState.elapsedSeconds;
      sharedTimerState.isPaused = true;
      sharedTimerState.startTime = null;
      sharedTimerState.state = 'paused';
      break;
    }
    case 'resume': {
      if (sharedTimerState.state !== 'paused') break;
      sharedTimerState.isPaused = false;
      sharedTimerState.startTime = now;
      sharedTimerState.state = 'running';
      break;
    }
    case 'reset': {
      sharedTimerState.state = 'ready';
      sharedTimerState.subject = '';
      sharedTimerState.startTime = null;
      sharedTimerState.elapsedSeconds = 0;
      sharedTimerState.durationSeconds = 0;
      sharedTimerState.isPaused = false;
      break;
    }
    case 'update-state': {
      if (data) {
        if (data.state !== undefined) sharedTimerState.state = data.state;
        if (data.subject !== undefined) sharedTimerState.subject = data.subject;
        if (data.startTime !== undefined) sharedTimerState.startTime = data.startTime;
        if (data.elapsedSeconds !== undefined) {
          sharedTimerState.elapsedSeconds = data.elapsedSeconds;
          sharedTimerState.durationSeconds = data.elapsedSeconds;
        }
        sharedTimerState.isPaused = (sharedTimerState.state === 'paused');
      }
      break;
    }
  }
  broadcast();
});

ipcMain.on('request-timer-state', (event) => {
  event.reply('timer-state-update', { ...sharedTimerState });
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('============================================================');
  console.log('TESTING ELECTRON MAIN & WIDGET SYNCHRONIZATION');
  console.log('============================================================');

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

  // Create widget window
  widgetWindow = new BrowserWindow({
    width: 260,
    height: 195,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await widgetWindow.loadFile(WIDGET_PATH);
  console.log('Widget loaded successfully');

  // Test N: No subject -> Cannot start
  const widgetInitialState = await widgetWindow.webContents.executeJavaScript(`({
    clock: document.getElementById('timerClock').textContent,
    subject: document.getElementById('subjectLbl').textContent,
    status: document.getElementById('statusBadge').textContent,
    startHidden: document.getElementById('startBtn').classList.contains('hidden'),
    pauseHidden: document.getElementById('pauseBtn').classList.contains('hidden'),
    resumeHidden: document.getElementById('resumeBtn').classList.contains('hidden'),
    resetDisabled: document.getElementById('resetBtn').disabled
  })`);

  assert(widgetInitialState.clock === '00:00:00', '1. Widget initial clock is 00:00:00');
  assert(widgetInitialState.status === 'Ready', '2. Widget initial status is Ready');
  assert(widgetInitialState.subject.includes('No subject'), '3. Widget shows "No subject" initially');
  assert(!widgetInitialState.startHidden && widgetInitialState.pauseHidden && widgetInitialState.resumeHidden, '4. Only Start button is visible initially');

  // Simulate main window starting a session:
  console.log('\n--- Simulating Main Timer Start ("Data Structures") ---');
  ipcMain.emit('timer-action', null, { action: 'start', data: { subject: 'Data Structures' } });
  await sleep(300);

  const widgetRunningState = await widgetWindow.webContents.executeJavaScript(`({
    subject: document.getElementById('subjectLbl').textContent,
    status: document.getElementById('statusBadge').textContent,
    startHidden: document.getElementById('startBtn').classList.contains('hidden'),
    pauseHidden: document.getElementById('pauseBtn').classList.contains('hidden'),
    resumeHidden: document.getElementById('resumeBtn').classList.contains('hidden'),
    resetDisabled: document.getElementById('resetBtn').disabled
  })`);

  assert(widgetRunningState.subject.includes('Data Structures'), 'G1. Main timer Start synchronizes subject to widget');
  assert(widgetRunningState.status === 'Studying', 'G2. Widget status shows "Studying"');
  assert(widgetRunningState.startHidden && !widgetRunningState.pauseHidden && widgetRunningState.resumeHidden, 'G3. Widget button changes to [⏸ Pause] and [↻ Reset]');

  // Let it count 1.2 seconds
  await sleep(1200);

  // Test G: Main timer Pause -> widget pauses
  console.log('\n--- Testing G: Main Timer Pause -> Widget Pauses ---');
  ipcMain.emit('timer-action', null, { action: 'pause' });
  await sleep(300);

  const widgetPausedState = await widgetWindow.webContents.executeJavaScript(`({
    clock: document.getElementById('timerClock').textContent,
    status: document.getElementById('statusBadge').textContent,
    startHidden: document.getElementById('startBtn').classList.contains('hidden'),
    pauseHidden: document.getElementById('pauseBtn').classList.contains('hidden'),
    resumeHidden: document.getElementById('resumeBtn').classList.contains('hidden'),
  })`);

  assert(widgetPausedState.status === 'Paused', 'G4. Main timer Pause synchronizes widget status to "Paused"');
  assert(widgetPausedState.startHidden && widgetPausedState.pauseHidden && !widgetPausedState.resumeHidden, 'G5. Widget shows [▶ Resume] and [↻ Reset]');
  const pausedClock = widgetPausedState.clock;
  console.log(`Observed paused time: ${pausedClock}`);

  // Test H: Widget clicks Resume -> timer resumes
  console.log('\n--- Testing H: Widget Resume -> Timer Resumes ---');
  await widgetWindow.webContents.executeJavaScript(`handleResume()`);
  await sleep(300);
  assert(sharedTimerState.state === 'running', 'H1. Widget handleResume() changes sharedTimerState to running');

  // Let it run 1.2 seconds
  await sleep(1200);
  const liveSecsAfterResume = sharedTimerState.elapsedSeconds + Math.floor((Date.now() - sharedTimerState.startTime) / 1000);
  assert(liveSecsAfterResume >= 2, `H2. Timer continued counting after widget Resume (duration: ${liveSecsAfterResume}s)`);

  // Test J: Widget Reset -> Resets sharedTimerState and returns to 00:00:00
  console.log('\n--- Testing J: Widget Reset ---');
  ipcMain.emit('timer-action', null, { action: 'reset' });
  await sleep(300);

  const widgetAfterReset = await widgetWindow.webContents.executeJavaScript(`({
    clock: document.getElementById('timerClock').textContent,
    status: document.getElementById('statusBadge').textContent,
    subject: document.getElementById('subjectLbl').textContent,
    startHidden: document.getElementById('startBtn').classList.contains('hidden'),
    pauseHidden: document.getElementById('pauseBtn').classList.contains('hidden'),
    resumeHidden: document.getElementById('resumeBtn').classList.contains('hidden'),
  })`);

  assert(sharedTimerState.state === 'ready', 'J1. Reset returns sharedTimerState to ready');
  assert(widgetAfterReset.clock === '00:00:00', 'J2. Widget clock returns to 00:00:00');
  assert(widgetAfterReset.status === 'Ready', 'J3. Widget status returns to Ready');
  assert(widgetAfterReset.subject.includes('No subject'), 'J4. Widget subject resets to "No subject"');

  console.log('\n============================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================================');

  app.quit();
  process.exit(failed > 0 ? 1 : 0);
}

app.whenReady().then(run);
