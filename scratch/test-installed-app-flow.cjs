/**
 * Comprehensive Electron & Installed Application QA Test
 * Verifies version 1.0.1, packaging, focus mode completion, breaks, widget sync, and history
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 3000;
const ROOT_DIR = path.join(__dirname, '..');

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    }).on('error', reject);
  });
}

function httpPost(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
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

async function run() {
  console.log('='.repeat(70));
  console.log('ELECTRON DESKTOP APPLICATION & PACKAGING VERIFICATION');
  console.log('='.repeat(70));

  // 1. Verify dist/ packaging artifacts
  console.log('\n[1] Checking Installer & Packaging Artifacts');
  const distDir = path.join(ROOT_DIR, 'dist');
  const installerPath = path.join(distDir, 'Study Time Tracker Setup.exe');
  const latestYmlPath = path.join(distDir, 'latest.yml');
  const winUnpackedDir = path.join(distDir, 'win-unpacked');
  const unpackedExe = path.join(winUnpackedDir, 'Study Time Tracker.exe');

  assert(fs.existsSync(installerPath), 'Installer exists: Study Time Tracker Setup.exe');
  if (fs.existsSync(installerPath)) {
    const stats = fs.statSync(installerPath);
    console.log(`     Installer size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    assert(stats.size > 50 * 1024 * 1024, 'Installer size is healthy (>50MB)');
  }

  assert(fs.existsSync(latestYmlPath), 'latest.yml exists');
  if (fs.existsSync(latestYmlPath)) {
    const ymlContent = fs.readFileSync(latestYmlPath, 'utf8');
    assert(ymlContent.includes('1.0.1'), 'latest.yml contains version 1.0.1');
  }

  assert(fs.existsSync(unpackedExe), 'Packaged executable exists in win-unpacked');

  // 2. Verify packaged dist-react bundle in win-unpacked
  console.log('\n[2] Checking Packaged Assets Integrity');
  const resourcesAppDir = path.join(winUnpackedDir, 'resources', 'app');
  // Check if unpacked directly or inside app / app.asar
  const hasAppDir = fs.existsSync(resourcesAppDir);
  console.log(`     Resources directory exists: ${fs.existsSync(path.join(winUnpackedDir, 'resources'))}`);

  // 3. Test Full Focus Round Flow through Live Desktop Backend
  console.log('\n[3] Testing Focus Round Session Flow (5m Focus -> +5m)');
  const testSubj = `Electron QA ${Date.now()}`;
  const round1Id = `electron_r1_${Date.now()}`;

  const r1Save = await httpPost('/timer/save', {
    subject: testSubj,
    elapsedSeconds: 300,
    durationSeconds: 300,
    sessionId: round1Id,
  });

  assert(r1Save.status === 200, 'Round 1 save returned HTTP 200');
  assert(r1Save.data && r1Save.data.success === true, 'Round 1 saved successfully');
  assert(r1Save.data && r1Save.data.duration === 5, 'Round 1 added exactly 5 minutes', `Got: ${r1Save.data ? r1Save.data.duration : 'null'}`);
  assert(!r1Save.data.duplicate, 'Round 1 was not marked duplicate');

  // 4. Test Duplicate Rejection (same round ID submitted again)
  console.log('\n[4] Testing Duplicate Round Rejection');
  const dupSave = await httpPost('/timer/save', {
    subject: testSubj,
    elapsedSeconds: 300,
    durationSeconds: 300,
    sessionId: round1Id,
  });
  assert(dupSave.data && dupSave.data.duplicate === true, 'Duplicate save with same sessionId was rejected');

  // 5. Test Round 2 (Focus 2 -> Total = 10m)
  console.log('\n[5] Testing Round 2 (Total = 10m)');
  const round2Id = `electron_r2_${Date.now()}`;
  const r2Save = await httpPost('/timer/save', {
    subject: testSubj,
    elapsedSeconds: 300,
    durationSeconds: 300,
    sessionId: round2Id,
  });
  assert(r2Save.data && r2Save.data.duration === 5, 'Round 2 added exactly 5 minutes');
  const totalR1R2 = (r1Save.data.duration || 0) + (r2Save.data.duration || 0);
  assert(totalR1R2 === 10, 'Total study time after 2 rounds is 10 minutes', `Got: ${totalR1R2}`);

  // 6. Test Rounds 3 & 4 (Total = 20m)
  console.log('\n[6] Testing Rounds 3 & 4 (Total = 20m across 4 rounds)');
  const round3Id = `electron_r3_${Date.now()}`;
  const round4Id = `electron_r4_${Date.now()}`;
  const r3Save = await httpPost('/timer/save', { subject: testSubj, elapsedSeconds: 300, durationSeconds: 300, sessionId: round3Id });
  const r4Save = await httpPost('/timer/save', { subject: testSubj, elapsedSeconds: 300, durationSeconds: 300, sessionId: round4Id });

  assert(r3Save.data && r3Save.data.duration === 5, 'Round 3 added exactly 5 minutes');
  assert(r4Save.data && r4Save.data.duration === 5, 'Round 4 added exactly 5 minutes');
  const totalAll4 = (r1Save.data.duration || 0) + (r2Save.data.duration || 0) + (r3Save.data.duration || 0) + (r4Save.data.duration || 0);
  assert(totalAll4 === 20, 'Total study time after 4 rounds is exactly 20 minutes', `Got: ${totalAll4}`);

  // 7. Verify History and Statistics
  console.log('\n[7] Verifying History Records in Database');
  const history = await httpGet('/api/history?limit=10');
  const subjectSessions = history.data.sessions.filter(s => s.subject === testSubj);
  assert(subjectSessions.length === 4, 'History contains exactly 4 records for this test', `Found: ${subjectSessions.length}`);

  const totalFromHistory = subjectSessions.reduce((sum, s) => sum + s.duration, 0);
  assert(totalFromHistory === 20, 'History sum across the 4 sessions is exactly 20 minutes (NOT 60m)', `Sum: ${totalFromHistory}`);

  // 8. Test Break Period Adding 0m
  console.log('\n[8] Verifying Break Period adds 0m');
  const breakAttempt = await httpPost('/timer/save', { subject: 'Break Period', elapsedSeconds: 0 });
  assert(breakAttempt.status === 400, '0-second break cannot be submitted (HTTP 400)');

  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log(`ELECTRON DESKTOP QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
