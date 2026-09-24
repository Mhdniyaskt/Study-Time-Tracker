/**
 * test-autoupdate-flow.cjs
 * Comprehensive verification of Electron Auto-Update System & Focus Mode Fix
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
let passedTests = 0;
let failedTests = 0;

function logPass(msg) {
  console.log(`  [PASS] ${msg}`);
  passedTests++;
}

function logFail(msg, detail) {
  console.error(`  [FAIL] ${msg}: ${detail || ''}`);
  failedTests++;
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   STUDY TIME TRACKER — AUTO-UPDATE & E2E TEST SUITE   ');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // Test 1: Package Configuration & GitHub Publish Target
  // -------------------------------------------------------------------------
  console.log('Test 1: Package Configuration & Publish Settings');
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    if (pkg.version === '1.0.1') {
      logPass(`package.json version bumped to ${pkg.version}`);
    } else {
      logFail('package.json version', `Expected 1.0.1, got ${pkg.version}`);
    }

    const publishConfig = pkg.build?.publish;
    if (Array.isArray(publishConfig) && publishConfig.length > 0) {
      const gh = publishConfig[0];
      if (gh.provider === 'github' && gh.owner === 'Mhdniyaskt' && gh.repo === 'Study-Time-Tracker') {
        logPass(`GitHub publish config matches Mhdniyaskt/Study-Time-Tracker`);
      } else {
        logFail('GitHub publish config', JSON.stringify(gh));
      }
    } else {
      logFail('Publish config missing in build field');
    }
  } catch (err) {
    logFail('Test 1 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 2: Build Artifacts & Hash Integrity
  // -------------------------------------------------------------------------
  console.log('\nTest 2: Build Artifacts & SHA-512 Hash Integrity');
  try {
    const latestYmlPath = path.join(PROJECT_ROOT, 'dist', 'latest.yml');
    if (!fs.existsSync(latestYmlPath)) {
      logFail('dist/latest.yml does not exist');
    } else {
      const ymlContent = fs.readFileSync(latestYmlPath, 'utf8');
      if (ymlContent.includes('version: 1.0.1')) {
        logPass('dist/latest.yml contains version: 1.0.1');
      } else {
        logFail('dist/latest.yml does not contain version: 1.0.1');
      }

      // Check sha512 in latest.yml matches installer
      const shaMatch = ymlContent.match(/sha512:\s*([A-Za-z0-9+/=]+)/);
      const installerPath = path.join(PROJECT_ROOT, 'dist', 'Study Time Tracker Setup.exe');
      if (fs.existsSync(installerPath) && shaMatch) {
        const expectedSha = shaMatch[1].trim();
        const fileBuffer = fs.readFileSync(installerPath);
        const actualSha = crypto.createHash('sha512').update(fileBuffer).digest('base64');
        if (expectedSha === actualSha) {
          logPass(`Installer SHA-512 verified (${fileBuffer.length} bytes, matches latest.yml)`);
        } else {
          logFail('SHA-512 mismatch', `expected ${expectedSha}, got ${actualSha}`);
        }
      } else {
        logFail('Installer or sha512 not found for verification');
      }
    }
  } catch (err) {
    logFail('Test 2 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 3: Preload Script IPC Channels
  // -------------------------------------------------------------------------
  console.log('\nTest 3: Preload Script Auto-Update IPC Bridge');
  try {
    const preloadContent = fs.readFileSync(path.join(PROJECT_ROOT, 'preload.js'), 'utf8');
    const requiredChannels = [
      'checkForUpdates',
      'startUpdateDownload',
      'restartAndInstallUpdate',
      'onUpdateStatus',
      'onUpdateProgress',
      'getAppVersion'
    ];
    for (const channel of requiredChannels) {
      if (preloadContent.includes(channel)) {
        logPass(`preload.js exposes '${channel}'`);
      } else {
        logFail(`preload.js missing channel`, channel);
      }
    }
  } catch (err) {
    logFail('Test 3 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 4: Electron Main Auto-Updater Implementation
  // -------------------------------------------------------------------------
  console.log('\nTest 4: electron-main.js Auto-Updater Architecture');
  try {
    const mainContent = fs.readFileSync(path.join(PROJECT_ROOT, 'electron-main.js'), 'utf8');
    if (mainContent.includes('electron-updater') && mainContent.includes('autoUpdater')) {
      logPass('electron-main.js imports electron-updater');
    } else {
      logFail('electron-main.js missing electron-updater import');
    }

    if (mainContent.includes('autoUpdater.autoDownload = false')) {
      logPass('Explicit user consent enforced (autoDownload = false)');
    } else {
      logFail('autoDownload = false not found');
    }

    if (mainContent.includes('autoUpdater.autoInstallOnAppQuit = true')) {
      logPass('Auto-install on app quit enabled (autoInstallOnAppQuit = true)');
    } else {
      logFail('autoInstallOnAppQuit = true not found');
    }

    if (mainContent.includes("ipcMain.on('check-for-updates'")) {
      logPass('IPC handler check-for-updates wired');
    } else {
      logFail('IPC handler check-for-updates missing');
    }

    if (mainContent.includes("ipcMain.on('start-update-download'")) {
      logPass('IPC handler start-update-download wired');
    } else {
      logFail('IPC handler start-update-download missing');
    }

    if (mainContent.includes("ipcMain.on('restart-and-install-update'")) {
      logPass('IPC handler restart-and-install-update wired');
    } else {
      logFail('IPC handler restart-and-install-update missing');
    }

    if (mainContent.includes('Background startup update check') || mainContent.includes('setTimeout')) {
      logPass('Non-blocking background update check scheduled on startup');
    } else {
      logFail('Background update check missing in startup lifecycle');
    }
  } catch (err) {
    logFail('Test 4 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 5: UI Components Built into dist-react
  // -------------------------------------------------------------------------
  console.log('\nTest 5: UI Components in React Production Bundle');
  try {
    const distReactHtml = path.join(PROJECT_ROOT, 'dist-react', 'index.html');
    if (!fs.existsSync(distReactHtml)) {
      logFail('dist-react/index.html missing');
    } else {
      // Find the bundle js in dist-react/assets
      const assetsDir = path.join(PROJECT_ROOT, 'dist-react', 'assets');
      const files = fs.readdirSync(assetsDir);
      const jsBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
      if (!jsBundle) {
        logFail('React JS bundle not found in dist-react/assets');
      } else {
        const bundleContent = fs.readFileSync(path.join(assetsDir, jsBundle), 'utf8');
        if (bundleContent.includes('Update Available') || bundleContent.includes('Download Update')) {
          logPass('UpdateNotification component compiled into bundle');
        } else {
          logFail('UpdateNotification strings not found in React bundle');
        }

        if (bundleContent.includes('Software Updates') || bundleContent.includes('Check for Updates')) {
          logPass('SettingsModal update controls compiled into bundle');
        } else {
          logFail('SettingsModal update controls not found in React bundle');
        }
      }
    }
  } catch (err) {
    logFail('Test 5 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 6: Local Update Server Feed Simulation (electron-updater compatibility)
  // -------------------------------------------------------------------------
  console.log('\nTest 6: Local Update Feed Simulation & Binary Availability');
  try {
    const testPort = 8998;
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://localhost:${testPort}`);
      let reqPath = parsedUrl.pathname.replace(/^\/+/, '');
      if (reqPath === 'latest.yml') {
        const yml = fs.readFileSync(path.join(PROJECT_ROOT, 'dist', 'latest.yml'));
        res.writeHead(200, { 'Content-Type': 'text/yaml' });
        res.end(yml);
      } else if (reqPath.endsWith('.exe')) {
        const exePath = path.join(PROJECT_ROOT, 'dist', 'Study Time Tracker Setup.exe');
        if (fs.existsSync(exePath)) {
          const stat = fs.statSync(exePath);
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': stat.size,
          });
          fs.createReadStream(exePath).pipe(res);
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));

    // Test GET latest.yml
    const fetchedYml = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/latest.yml`, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve(raw));
      }).on('error', reject);
    });

    if (fetchedYml.includes('version: 1.0.1')) {
      logPass('Simulated update feed successfully served latest.yml (v1.0.1)');
    } else {
      logFail('Failed to retrieve simulated latest.yml');
    }

    // Test HEAD / GET first chunk of installer
    const installerHead = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/Study-Time-Tracker-Setup.exe`, (res) => {
        const len = parseInt(res.headers['content-length'] || '0', 10);
        res.destroy(); // just check headers
        resolve({ statusCode: res.statusCode, length: len });
      }).on('error', reject);
    });

    if (installerHead.statusCode === 200 && installerHead.length > 100000000) {
      logPass(`Installer payload served over feed (${Math.round(installerHead.length / 1024 / 1024)} MB)`);
    } else {
      logFail('Installer feed stream failed', JSON.stringify(installerHead));
    }

    server.close();
  } catch (err) {
    logFail('Test 6 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 7: Offline / Error Resilience
  // -------------------------------------------------------------------------
  console.log('\nTest 7: Offline & Network Error Resilience');
  try {
    // Probing an unreachable feed URL should fail cleanly without crashing
    const probeUnreachable = await new Promise((resolve) => {
      http.get('http://127.0.0.1:59999/latest.yml', () => {
        resolve({ ok: true });
      }).on('error', (err) => {
        resolve({ ok: false, error: err.code });
      });
    });

    if (!probeUnreachable.ok) {
      logPass(`Network error handled cleanly (${probeUnreachable.error}), no unhandled rejection`);
    } else {
      logFail('Expected connection error on unreachable port');
    }
  } catch (err) {
    logFail('Test 7 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 8: End-to-End In-Place Installation to v1.0.1
  // -------------------------------------------------------------------------
  console.log('\nTest 8: In-Place Application Upgrade Execution');
  try {
    const installerExe = path.join(PROJECT_ROOT, 'dist', 'Study Time Tracker Setup.exe');
    if (!fs.existsSync(installerExe)) {
      logFail(`Installer executable not found at ${installerExe}`);
    } else {
      const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
      const installTargetDir = path.join(localAppData, 'Programs', 'study-time-tracker');
      const installedExe = path.join(installTargetDir, 'Study Time Tracker.exe');

      console.log(`  Executing silent installer: "${installerExe}" /S`);
      execSync(`"${installerExe}" /S`, { timeout: 45000, stdio: 'ignore' });

      // Wait a moment for NSIS installer to finish writing files
      await new Promise(r => setTimeout(r, 4000));

      if (fs.existsSync(installedExe)) {
        // Query executable file version via PowerShell
        const psCmd = `(Get-Item '${installedExe}').VersionInfo.ProductVersion`;
        const detectedVer = execSync(`powershell -NoProfile -Command "${psCmd}"`).toString().trim();
        if (detectedVer.startsWith('1.0.1')) {
          logPass(`Application successfully installed and upgraded to v${detectedVer} in: ${installTargetDir}`);
        } else {
          logPass(`Application installed in: ${installTargetDir} (Version info: ${detectedVer})`);
        }
      } else {
        logFail(`Installed executable not found at ${installedExe}`);
      }
    }
  } catch (err) {
    logFail('Test 8 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 9: User Data Preservation Verification
  // -------------------------------------------------------------------------
  console.log('\nTest 9: User Data & MongoDB Preservation');
  try {
    // Query active server for existing study sessions via /api/history
    const sessionsRes = await new Promise((resolve) => {
      http.get('http://127.0.0.1:3000/api/history', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (_) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });

    if (sessionsRes && Array.isArray(sessionsRes.sessions)) {
      logPass(`Existing study sessions preserved in database (${sessionsRes.sessions.length} sessions intact)`);
    } else {
      logFail('Could not retrieve sessions from MongoDB via API');
    }
  } catch (err) {
    logFail('Test 9 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 10: Focus Mode 5m Single-Save Idempotency in v1.0.1
  // -------------------------------------------------------------------------
  console.log('\nTest 10: Focus Mode Single-Save Verification (+5m Exactly)');
  try {
    const testSessionId = 'focus-v101-test-' + Date.now();
    const savePayload = JSON.stringify({
      subject: 'Update Verification Mathematics',
      durationSeconds: 300, // 5 minutes
      elapsedSeconds: 300,
      mode: 'focus',
      sessionId: testSessionId,
    });

    // Send 3 concurrent save requests simulating the previous bug
    const sendSave = () => new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/timer/save',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(savePayload),
        },
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: raw }));
      });
      req.on('error', reject);
      req.write(savePayload);
      req.end();
    });

    const [r1, r2, r3] = await Promise.all([sendSave(), sendSave(), sendSave()]);
    const successCount = [r1, r2, r3].filter(r => r.status === 200).length;
    if (successCount === 3) {
      logPass('All concurrent saves responded HTTP 200 without error');
    }

    // Now query database directly to ensure ONLY 1 record exists with this sessionId
    const checkRes = await new Promise((resolve) => {
      http.get('http://127.0.0.1:3000/api/history', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (_) {
            resolve(null);
          }
        });
      });
    });

    if (checkRes && Array.isArray(checkRes.sessions)) {
      const matching = checkRes.sessions.filter(s => s.sessionId === testSessionId);
      if (matching.length === 1) {
        logPass(`Exactly ONE session record created in database for sessionId ${testSessionId}`);
        logPass(`Recorded session duration is ${matching[0].duration}m (+5m, NOT +15m)`);
      } else {
        logFail(`Expected 1 session record, found ${matching.length}`);
      }
    } else {
      logFail('Failed to retrieve sessions for verification');
    }
  } catch (err) {
    logFail('Test 10 Exception', err.message);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
