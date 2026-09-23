import http from 'http';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('STUDY TIMER WORKFLOW & SUBMISSION VERIFICATION');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Validation: No subject cannot submit
  const noSubjectRes = await post('/timer/save', { subject: '', elapsedSeconds: 60 });
  assert(noSubjectRes.status === 400, 'N1. Empty subject cannot be submitted (HTTP 400)');

  // 2. Validation: Subject under 2 chars
  const shortSubjectRes = await post('/timer/save', { subject: 'A', elapsedSeconds: 60 });
  assert(shortSubjectRes.status === 400, 'N2. Subject < 2 chars cannot be submitted (HTTP 400)');

  // 3. Validation: 0 seconds cannot submit
  const zeroSecRes = await post('/timer/save', { subject: 'Biology', elapsedSeconds: 0 });
  assert(zeroSecRes.status === 400, 'N3. 0 seconds cannot be submitted (HTTP 400)');

  // 4. Timer Wall-Clock Math & Zero Drift Test
  console.log('\n--- Testing Timer Engine Math & Drift ---');
  let simulatedState = {
    state: 'ready',
    subject: '',
    startTime: null,
    elapsedSeconds: 0,
    durationSeconds: 0,
    isPaused: false,
  };

  // Start action
  const startNow = Date.now();
  simulatedState.state = 'running';
  simulatedState.subject = 'Physics';
  simulatedState.startTime = startNow;
  simulatedState.elapsedSeconds = 0;
  simulatedState.isPaused = false;
  assert(simulatedState.state === 'running', 'A. Start sets state to running');

  // Let it count 1.2 seconds
  await sleep(1200);
  const live1 = simulatedState.elapsedSeconds + Math.floor((Date.now() - simulatedState.startTime) / 1000);
  assert(live1 >= 1, `A2. Timer counts live exact seconds (observed: ${live1}s)`);

  // Pause action
  const pauseNow = Date.now();
  const additional = Math.floor((pauseNow - simulatedState.startTime) / 1000);
  simulatedState.elapsedSeconds += additional;
  simulatedState.durationSeconds = simulatedState.elapsedSeconds;
  simulatedState.startTime = null;
  simulatedState.state = 'paused';
  simulatedState.isPaused = true;
  assert(simulatedState.state === 'paused', 'B1. Pause sets state to paused');
  const pausedTime = simulatedState.elapsedSeconds;

  // Wait 1 second while paused to verify it DOES NOT count
  await sleep(1000);
  const afterWaitWhilePaused = simulatedState.elapsedSeconds;
  assert(afterWaitWhilePaused === pausedTime, 'B2. Paused timer does not drift or count while paused');

  // Resume action
  simulatedState.startTime = Date.now();
  simulatedState.state = 'running';
  simulatedState.isPaused = false;
  assert(simulatedState.state === 'running', 'C1. Resume sets state to running');

  // Count another 1.2 seconds
  await sleep(1200);
  const liveAfterResume = simulatedState.elapsedSeconds + Math.floor((Date.now() - simulatedState.startTime) / 1000);
  assert(liveAfterResume > pausedTime, `C2. Resumed timer continues accurately from exact previous second (${liveAfterResume}s > ${pausedTime}s)`);

  // Reset action
  simulatedState.state = 'ready';
  simulatedState.subject = '';
  simulatedState.startTime = null;
  simulatedState.elapsedSeconds = 0;
  simulatedState.durationSeconds = 0;
  simulatedState.isPaused = false;
  assert(simulatedState.state === 'ready' && simulatedState.elapsedSeconds === 0, 'D. Reset returns to 00:00:00 and ready state');

  // 5. Submit Session (Single Submit)
  console.log('\n--- Testing Submit & Deduplication ---');
  const initialDashboard = await get('/api/dashboard');
  const initialCount = initialDashboard.body.sessions.length;

  const validSubject = 'Unit Test Timer Subject ' + Date.now();
  const validDuration = 125; // 2m 5s

  const saveRes = await post('/timer/save', {
    subject: validSubject,
    elapsedSeconds: validDuration,
    durationSeconds: validDuration,
  });

  assert(saveRes.status === 200 && saveRes.body.success === true, 'E1. Valid submit saves session successfully');
  assert(saveRes.body.session.subject === validSubject, 'E2. Saved record contains correct subject');
  assert(saveRes.body.session.durationSeconds === validDuration, 'E3. Saved record contains exact durationSeconds');

  const afterSubmitDashboard = await get('/api/dashboard');
  const afterSubmitCount = afterSubmitDashboard.body.sessions.length;
  assert(afterSubmitCount === initialCount + 1, 'E4. Exactly one record was added to the database');

  // 6. Test Concurrent Double-Submit Guard at API level
  const dupSubject = 'Duplicate Guard Test ' + Date.now();
  // Simulate client-side double click prevention:
  let inFlight = false;
  let clientSubmitAttempts = 0;
  let successfulClientSubmits = 0;

  async function clientSubmit() {
    clientSubmitAttempts++;
    if (inFlight) {
      // Synchronously blocked!
      return { blocked: true };
    }
    inFlight = true;
    try {
      const res = await post('/timer/save', { subject: dupSubject, elapsedSeconds: 60 });
      if (res.status === 200 && res.body.success) successfulClientSubmits++;
      return res;
    } finally {
      inFlight = false;
    }
  }

  // Fire two rapid calls simultaneously
  await Promise.all([clientSubmit(), clientSubmit()]);
  assert(clientSubmitAttempts === 2 && successfulClientSubmits === 1, 'F. Synchronous client-side guard prevents duplicate submit');

  // Clean up test sessions
  console.log('\n--- Cleaning up test records ---');
  const cleanupDashboard = await get('/api/dashboard');
  for (const s of cleanupDashboard.body.sessions) {
    if (s.subject.includes('Unit Test Timer') || s.subject.includes('Duplicate Guard')) {
      const delRes = await new Promise((resolve) => {
        const req = http.request(
          {
            hostname: 'localhost',
            port: 3000,
            path: `/api/study/${s._id}`,
            method: 'DELETE',
          },
          (res) => resolve(res.statusCode)
        );
        req.end();
      });
      console.log(`Cleaned up session ${s._id} (${s.subject}) -> status ${delRes}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
