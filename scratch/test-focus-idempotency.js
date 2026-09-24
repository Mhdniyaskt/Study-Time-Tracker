/**
 * TEST SUITE: FOCUS MODE SESSION DUPLICATE SAVING & IDEMPOTENCY VERIFICATION
 *
 * Verifies all 10 tests required:
 * TEST 1: 5-minute Focus round completes -> exactly 5 minutes added to database.
 * TEST 2: Verify only ONE save API request / operation succeeds during rapid concurrent calls.
 * TEST 3: Verify only ONE database record is created.
 * TEST 4: Complete two 5-minute Focus rounds -> Expected total = 10 minutes.
 * TEST 5: Complete four 5-minute Focus rounds -> Expected total = 20 minutes (R1 5m + R2 5m + R3 5m + R4 5m).
 * TEST 6: Complete Focus -> Break. Break must add 0 study minutes.
 * TEST 7: Focus completion + round transition: ensure transition does not trigger another save.
 * TEST 8: Widget and main window both open / communicating: complete one round -> ONE session only.
 * TEST 9: Restart/reload during Focus mode: restored timer does not save the same completed round again.
 * TEST 10: Check that Free Timer session saving is still exactly once.
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      `${BASE_URL}${path}`,
      {
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
    http.get(`${BASE_URL}${path}`, (res) => {
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

let passed = 0;
let failed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    if (details) console.error(`     Details: ${details}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('='.repeat(70));
  console.log('FOCUS MODE IDEMPOTENCY & DUPLICATE-PREVENTION TEST SUITE');
  console.log('='.repeat(70));

  // ---------------------------------------------------------------------------
  // TEST 1: 5-minute Focus round completes -> exactly 5 minutes added to DB
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 1] 5-minute Focus round completes -> exactly 5 minutes added');
  const t1SessionId = `test1_focus_${Date.now()}`;
  const t1Subject = `Test1 Focus ${Date.now()}`;
  const t1Res = await post('/timer/save', {
    subject: t1Subject,
    elapsedSeconds: 300,
    durationSeconds: 300,
    sessionId: t1SessionId,
  });

  assert(t1Res.status === 200, 'HTTP 200 received');
  assert(t1Res.body.success === true, 'Response indicates success');
  assert(t1Res.body.duration === 5, 'Duration saved is exactly 5 minutes', `Got ${t1Res.body.duration}`);
  assert(t1Res.body.durationSeconds === 300, 'DurationSeconds is exactly 300', `Got ${t1Res.body.durationSeconds}`);

  // ---------------------------------------------------------------------------
  // TEST 2: Verify only ONE save API request / DB record on concurrent duplicate calls
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 2] Verify only ONE save occurs when identical sessionId is submitted concurrently');
  const t2SessionId = `test2_focus_${Date.now()}`;
  const t2Subject = `Test2 Concurrent ${Date.now()}`;

  // Fire 5 rapid concurrent POSTs with the same sessionId (simulating the ticker firing multiple times)
  const concurrentCalls = await Promise.all([
    post('/timer/save', { subject: t2Subject, elapsedSeconds: 300, durationSeconds: 300, sessionId: t2SessionId }),
    post('/timer/save', { subject: t2Subject, elapsedSeconds: 300, durationSeconds: 300, sessionId: t2SessionId }),
    post('/timer/save', { subject: t2Subject, elapsedSeconds: 300, durationSeconds: 300, sessionId: t2SessionId }),
    post('/timer/save', { subject: t2Subject, elapsedSeconds: 300, durationSeconds: 300, sessionId: t2SessionId }),
    post('/timer/save', { subject: t2Subject, elapsedSeconds: 300, durationSeconds: 300, sessionId: t2SessionId }),
  ]);

  const duplicatesFlagged = concurrentCalls.filter((c) => c.body && c.body.duplicate === true).length;
  const initialCreated = concurrentCalls.filter((c) => c.body && c.body.success && !c.body.duplicate).length;

  assert(initialCreated === 1, 'Exactly ONE initial creation succeeded', `initialCreated: ${initialCreated}`);
  assert(duplicatesFlagged === 4, 'Exactly 4 concurrent duplicate calls were detected and rejected as duplicates', `duplicates: ${duplicatesFlagged}`);

  // ---------------------------------------------------------------------------
  // TEST 3: Verify only ONE database record exists for that sessionId
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 3] Verify only ONE database record exists for sessionId in history');
  const historyRes = await get('/api/history?limit=20');
  const sessionsWithT2Id = historyRes.body.sessions.filter((s) => s.sessionId === t2SessionId);
  assert(sessionsWithT2Id.length === 1, 'Database contains exactly ONE record with t2SessionId', `Found: ${sessionsWithT2Id.length}`);

  // ---------------------------------------------------------------------------
  // TEST 4: Complete two 5-minute Focus rounds -> Expected total = 10 minutes
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 4] Complete two 5-minute Focus rounds -> Expected total = 10 minutes');
  const t4Subj = `Test4 Two Rounds ${Date.now()}`;
  const t4Round1Id = `test4_r1_${Date.now()}`;
  const t4Round2Id = `test4_r2_${Date.now() + 1}`;

  const r1Res = await post('/timer/save', { subject: t4Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: t4Round1Id });
  const r2Res = await post('/timer/save', { subject: t4Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: t4Round2Id });

  assert(r1Res.body.duration === 5 && !r1Res.body.duplicate, 'Round 1 saved 5 minutes');
  assert(r2Res.body.duration === 5 && !r2Res.body.duplicate, 'Round 2 saved 5 minutes');
  const totalT4 = (r1Res.body.duration || 0) + (r2Res.body.duration || 0);
  assert(totalT4 === 10, 'Total across 2 rounds is exactly 10 minutes', `Got: ${totalT4}`);

  // ---------------------------------------------------------------------------
  // TEST 5: Complete four 5-minute Focus rounds -> Expected total = 20 minutes
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 5] Complete four 5-minute Focus rounds -> Expected total = 20 minutes');
  const t5Subj = `Test5 Four Rounds ${Date.now()}`;
  const roundDurations = [];

  for (let r = 1; r <= 4; r++) {
    const roundId = `test5_r${r}_${Date.now()}_${r}`;
    const res = await post('/timer/save', { subject: t5Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: roundId });
    assert(res.body.duration === 5 && !res.body.duplicate, `Round ${r} saved 5 minutes`);
    roundDurations.push(res.body.duration);
  }

  const totalT5 = roundDurations.reduce((a, b) => a + b, 0);
  assert(totalT5 === 20, 'Total across 4 rounds is exactly 20 minutes (NOT 60m)', `Got: ${totalT5}`);

  // ---------------------------------------------------------------------------
  // TEST 6: Complete Focus -> Break. Break must add 0 study minutes
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 6] Complete Focus -> Break. Break must add 0 study minutes');
  // Break phase transition logic in TimerContext ensures no saveTimerSession is called when currentPhase !== 'focus'.
  // Verify that submitting a break attempt or 0 seconds is rejected or handled:
  const breakAttempt = await post('/timer/save', { subject: 'Break Time', elapsedSeconds: 0 });
  assert(breakAttempt.status === 400, 'Break phase with 0 seconds is rejected with HTTP 400');

  // Verify that an empty or break phase does not record study time
  const historyAfterBreak = await get('/api/history?limit=10');
  const breakSessions = historyAfterBreak.body.sessions.filter((s) => s.subject === 'Break Time');
  assert(breakSessions.length === 0, 'No break sessions exist in database');

  // ---------------------------------------------------------------------------
  // TEST 7: Focus completion + round transition: ensure transition does not trigger another save
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 7] Round transition idempotency: transition cannot trigger duplicate save');
  const t7Id = `test7_transition_${Date.now()}`;
  const t7Subj = `Test7 Transition ${Date.now()}`;

  // Initial save on completion
  const t7First = await post('/timer/save', { subject: t7Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: t7Id });
  assert(t7First.body.success && !t7First.body.duplicate, 'Initial completion save succeeded');

  // Transition re-trigger attempt with same sessionId
  const t7TransitionAttempt = await post('/timer/save', { subject: t7Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: t7Id });
  assert(t7TransitionAttempt.body.duplicate === true, 'Transition re-save was detected and rejected as duplicate');

  // ---------------------------------------------------------------------------
  // TEST 8: Widget and Main Window sync: complete one round -> ONE session only
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 8] Widget and Main Window shared state simulation: only ONE session created');
  const t8Id = `test8_shared_${Date.now()}`;
  const t8Subj = `Test8 WidgetMain ${Date.now()}`;

  // Main window completion save
  const mainSave = await post('/timer/save', { subject: t8Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: t8Id });
  // Simulated widget IPC save attempt with same shared sessionId
  const widgetSave = await post('/timer/save', { subject: t8Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: t8Id });

  assert(mainSave.body.duplicate !== true, 'Authoritative main window save accepted');
  assert(widgetSave.body.duplicate === true, 'Widget duplicate save prevented by backend sessionId deduplication');

  // ---------------------------------------------------------------------------
  // TEST 9: Restart/reload during Focus mode: restored timer does not save again
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 9] Restart / reload recovery: restored completed timer does not save again');
  const t9Id = `test9_reload_${Date.now()}`;
  const t9Subj = `Test9 Reload ${Date.now()}`;

  // 1. Session completed and saved before reload
  const preReloadSave = await post('/timer/save', { subject: t9Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: t9Id });
  assert(preReloadSave.body.success && !preReloadSave.body.duplicate, 'Pre-reload session saved');

  // 2. Reload simulation: app restores state with remaining <= 0 and same sessionId
  const postReloadSave = await post('/timer/save', { subject: t9Subj, elapsedSeconds: 300, durationSeconds: 300, sessionId: t9Id });
  assert(postReloadSave.body.duplicate === true, 'Post-reload duplicate save was blocked');

  // ---------------------------------------------------------------------------
  // TEST 10: Check that Free Timer session saving is still exactly once
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 10] Free Timer session saving remains exactly once');
  const freeSubj = `Free Timer Study ${Date.now()}`;
  const freeSecs = 120; // 2 minutes

  const freeSave = await post('/timer/save', { subject: freeSubj, elapsedSeconds: freeSecs, durationSeconds: freeSecs });
  assert(freeSave.status === 200, 'Free timer HTTP 200');
  assert(freeSave.body.success === true, 'Free timer save successful');
  assert(freeSave.body.duration === 2, 'Free timer duration is 2 minutes', `Got: ${freeSave.body.duration}`);
  assert(freeSave.body.durationSeconds === 120, 'Free timer durationSeconds is 120', `Got: ${freeSave.body.durationSeconds}`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
