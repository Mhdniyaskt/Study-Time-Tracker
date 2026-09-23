const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

const PORT = 3000;
const PRELOAD_PATH = 'c:\\Users\\conne\\Study-Time-Tracker\\preload.js';

function apiRequest(method, reqPath, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: reqPath,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let mainWindow = null;

async function run() {
  console.log('============================================================');
  console.log('STARTING REAL ELECTRON UI STREAK VERIFICATION');
  console.log('============================================================\n');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Ensure daily goal is 2 hours (120 mins)
  await apiRequest('POST', '/api/settings', { dailyGoalHours: 2 });

  // Clean any old test artifacts
  const initial = await apiRequest('GET', '/api/dashboard');
  if (initial.data?.sessions) {
    for (const s of initial.data.sessions) {
      if (s.subject && s.subject.startsWith('STREAK-TEST-')) {
        await apiRequest('DELETE', `/api/study/${s._id}`);
      }
    }
  }

  // Step 1: Verify current state (User's session: 1h 20m today, 2h goal, no yesterday session)
  console.log('--- Step 1: Testing initial state (1h 20m today, no yesterday) ---');
  await mainWindow.loadURL('http://localhost:3000/');
  await sleep(1500);

  const state1 = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const streakEl = document.getElementById('streakCount');
      const secEl = document.getElementById('streakSecondary');
      return {
        streakText: streakEl ? streakEl.innerText.trim() : null,
        secondaryText: secEl ? secEl.innerText.trim() : null,
      };
    })()
  `);
  console.log('State 1 (Today 1h 20m / 2h, no yesterday):', state1);

  if (state1.streakText === '0 days' && state1.secondaryText === '1h 20m / 2h goal') {
    console.log('✅ PASS: Displays "0 days" and "1h 20m / 2h goal" correctly!');
  } else {
    console.error('❌ FAIL on State 1:', state1);
    throw new Error('State 1 failed');
  }

  // Step 2: Add yesterday completed session (2h 10m = 130 mins)
  console.log('\n--- Step 2: Adding yesterday session (2h 10m) to test in-progress streak preservation ---');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(14, 0, 0, 0);

  const createdIds = [];
  const resYesterday = await apiRequest('POST', '/api/study', {
    subject: 'STREAK-TEST-YESTERDAY',
    hours: 2,
    minutes: 10,
    date: yesterday.toISOString(),
  });
  if (resYesterday.data?.session?._id) createdIds.push(resYesterday.data.session._id);

  await mainWindow.reload();
  await sleep(1500);

  const state2 = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const streakEl = document.getElementById('streakCount');
      const secEl = document.getElementById('streakSecondary');
      return {
        streakText: streakEl ? streakEl.innerText.trim() : null,
        secondaryText: secEl ? secEl.innerText.trim() : null,
      };
    })()
  `);
  console.log('State 2 (Yesterday 2h 10m ✅, Today 1h 20m / 2h ⏳):', state2);

  if (state2.streakText === '1 day' && state2.secondaryText === '1h 20m / 2h goal') {
    console.log('✅ PASS: Preserves yesterday streak (1 day) while today is in progress (1h 20m / 2h goal)!');
  } else {
    console.error('❌ FAIL on State 2:', state2);
    throw new Error('State 2 failed');
  }

  // Step 3: Add 40 minutes today so today reaches 2h 0m
  console.log('\n--- Step 3: Adding 40 minutes today so today reaches 2h 0m goal ---');
  const resTodayMore = await apiRequest('POST', '/api/study', {
    subject: 'STREAK-TEST-TODAY-COMPLETE',
    hours: 0,
    minutes: 40,
  });
  if (resTodayMore.data?.session?._id) createdIds.push(resTodayMore.data.session._id);

  await mainWindow.reload();
  await sleep(1500);

  const state3 = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const streakEl = document.getElementById('streakCount');
      const secEl = document.getElementById('streakSecondary');
      return {
        streakText: streakEl ? streakEl.innerText.trim() : null,
        secondaryText: secEl ? secEl.innerText.trim() : null,
      };
    })()
  `);
  console.log('State 3 (Today reached goal):', state3);

  if (state3.streakText === '2 days' && state3.secondaryText === 'Goal completed today') {
    console.log('✅ PASS: Streak increments to 2 days and secondary shows "Goal completed today"!');
  } else {
    console.error('❌ FAIL on State 3:', state3);
    throw new Error('State 3 failed');
  }

  // Step 4: Test changing daily goal in settings to 3 hours (180 mins)
  console.log('\n--- Step 4: Changing daily goal in settings to 3h ---');
  await apiRequest('POST', '/api/settings', { dailyGoalHours: 3 });

  await mainWindow.reload();
  await sleep(1500);

  const state4 = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const streakEl = document.getElementById('streakCount');
      const secEl = document.getElementById('streakSecondary');
      return {
        streakText: streakEl ? streakEl.innerText.trim() : null,
        secondaryText: secEl ? secEl.innerText.trim() : null,
      };
    })()
  `);
  console.log('State 4 (Daily goal = 3h, today has 2h, yesterday had 2h 10m):', state4);

  if (state4.streakText === '0 days' && state4.secondaryText === '2h / 3h goal') {
    console.log('✅ PASS: Dynamic goal respected ("2h / 3h goal", streak = 0 days under 3h goal)!');
  } else {
    console.error('❌ FAIL on State 4:', state4);
    throw new Error('State 4 failed');
  }

  // Restore daily goal back to 2 hours
  await apiRequest('POST', '/api/settings', { dailyGoalHours: 2 });

  // Clean up seeded test sessions
  for (const id of createdIds) {
    await apiRequest('DELETE', `/api/study/${id}`);
  }
  console.log('\nCleaned up all test sessions.');

  // Confirm returning to initial state
  await mainWindow.reload();
  await sleep(1500);

  const finalState = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const streakEl = document.getElementById('streakCount');
      const secEl = document.getElementById('streakSecondary');
      return {
        streakText: streakEl ? streakEl.innerText.trim() : null,
        secondaryText: secEl ? secEl.innerText.trim() : null,
      };
    })()
  `);
  console.log('Final State (Restored to user session):', finalState);

  if (finalState.streakText === '0 days' && finalState.secondaryText === '1h 20m / 2h goal') {
    console.log('✅ PASS: Cleanly restored to initial user session state!');
  } else {
    console.error('❌ FAIL on Final State:', finalState);
    throw new Error('Final state failed');
  }

  console.log('\n============================================================');
  console.log('ALL ELECTRON UI STREAK TESTS PASSED SUCCESSFULLY');
  console.log('============================================================\n');

  mainWindow.destroy();
  app.quit();
}

app.whenReady().then(run).catch(err => {
  console.error('Fatal test error:', err);
  app.quit();
  process.exit(1);
});
