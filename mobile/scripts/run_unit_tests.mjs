import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  ensureDir,
  log,
  COLORS,
  spawnStream,
  spawnBackground,
  waitForHttp,
  waitForPort,
  isPortInUse,
  getPythonExec,
  ensureDockerRunning,
  getDockerComposeCommand,
  formatDuration
} from '../../scripts/lib.mjs';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname, '..');
const RootDir = resolve(MobileDir, '..');
const BackendDir = join(RootDir, 'backend');

async function testBackendHealth() {
  try {
    return await waitForHttp('http://127.0.0.1:8000/api/', 5000, 'Backend Health');
  } catch (e) {
    return false;
  }
}

async function ensureBackendStarted() {
  log('[1/3] Ensuring Backend is running and seeded...', COLORS.yellow);

  const inUse = await isPortInUse(8000);
  if (inUse) {
    const healthy = await testBackendHealth();
    if (healthy) {
      log('✅ Backend is already available and healthy.', COLORS.green);
      log('Re-seeding for consistency...', COLORS.gray);
      const pythonExec = getPythonExec(BackendDir);
      await spawnStream(pythonExec, [join(BackendDir, 'scripts/seed_test_db.py'), '--preset', 'mobile'], { cwd: BackendDir });
    } else {
      log('⚠️ Port 8000 is in use but backend is not healthy.', COLORS.red);
      return false;
    }
  } else {
    log('🚀 Backend not ready. Starting via run_dev.mjs...', COLORS.yellow);
    spawnBackground('node', [join(BackendDir, 'scripts/run_dev.mjs'), '--seed'], { cwd: BackendDir });

    log('Waiting for backend (max 180s)...', COLORS.gray);
    const ready = await waitForHttp('http://127.0.0.1:8000/api/', 180000, 'Backend');
    if (!ready) {
      log('❌ ERROR: Backend failed to start.', COLORS.red);
      return false;
    }
  }
  return true;
}

async function main() {
  const startTime = Date.now();
  log("\n🚀 Running Mobile Integrated Unit Tests...", COLORS.cyan);
  log('🔗 Using real backend and database.', COLORS.yellow);

  if (!(await ensureBackendStarted())) {
    process.exit(1);
  }

  const logDir = join(MobileDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  const testFiles = readdirSync(join(MobileDir, 'test'))
    .filter(f => f.endsWith('_test.dart') && f !== 'e2e_test.dart')
    .map(f => join('test', f));

  log(`\n[2/3] Launching Flutter Test Suite (Sequential Mode)...`, COLORS.cyan);
  log(`Logging output to: ${logFile}`, COLORS.gray);

  const allTestNames = [];
  for (const file of testFiles) {
    try {
      const content = readFileSync(join(MobileDir, file), 'utf8');
      const matches = content.matchAll(/(?:test|testWidgets)\s*\(\s*(['"])(.*?)\1/g);
      for (const match of matches) {
        if (match[2]) allTestNames.push(match[2]);
      }
    } catch (e) { }
  }

  let totalTests = allTestNames.length || 100;
  log(`Detected ${totalTests} individual test scenarios.`, COLORS.gray);

  const flutterArgs = [
    'test',
    '-j', '1',
    '--reporter=json',
    '--dart-define=INTEGRATED_TEST=true',
    ...testFiles
  ];

  let filePassed = 0;
  let fileFailed = 0;
  let fileErrors = 0;
  let hasWarning = false;
  let foundResults = false;
  let currentTestCount = 0;
  const testNames = new Map();
  const fileReasons = [];

  const { spawn } = await import('node:child_process');
  const child = spawn('flutter', flutterArgs, {
    cwd: MobileDir,
    shell: true,
  });

  const { createWriteStream } = await import('node:fs');
  const logStream = createWriteStream(logFile, { flags: 'a' });

  child.stdout.on('data', (data) => {
    const str = data.toString();
    logStream.write(data);

    const lines = str.split(/\r?\n/);
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.toLowerCase().includes('warning')) {
        hasWarning = true;
        if (!line.startsWith('{')) fileReasons.push(`    ⚠️ ${line}`);
      }

      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const evt = JSON.parse(line);


          if (evt.type === 'testStart' && evt.test.name) {
            testNames.set(evt.test.id, evt.test.name);
            const isInternal = evt.test.name.startsWith('loading ') ||
              evt.test.name.includes('setUpAll') ||
              evt.test.name.includes('tearDownAll');

            if (!isInternal) {
              currentTestCount++;
              log(`\n[${currentTestCount}/${Math.max(totalTests, currentTestCount)}] 🏃 Unit Testing: ${evt.test.name}`, COLORS.cyan);
            }
          }

          if (evt.type === 'print') {
            if (
              /(TEST:|DEBUG MOBILE:|HTTP REQUEST|LOGIN:)/i.test(evt.message)
            ) {
              log(`   ${evt.message}`, COLORS.gray);
            }
          }

          if (evt.type === 'error') {
            const name = testNames.get(evt.testID) || 'Unknown Test';
            log(`   ❌ ERROR: ${evt.error}`, COLORS.red);
            fileReasons.push(`    ❌ [${name}]: ${evt.error}`);
          }

          if (evt.type === 'testDone') {
            if (evt.testID === 0) continue;
            const name = testNames.get(evt.testID);
            const isInternal = name && (name.startsWith('loading ') || name.includes('setUpAll') || name.includes('tearDownAll'));
            if (isInternal) continue;

            foundResults = true;
            if (evt.result === 'success') {
              filePassed++;
              log(`   ✅ PASSED`, COLORS.green);
            } else if (evt.result === 'failure') {
              fileFailed++;
              log(`   ❌ FAILED`, COLORS.red);
            } else if (evt.result === 'error') {
              fileErrors++;
              log(`   ⚠️ ERROR`, COLORS.magenta);
            }
          }
        } catch (e) { }
      }
    }
  });

  child.stderr.on('data', (data) => {
    logStream.write(data);
    const str = data.toString().trim();
    if (str) log(`   ${str}`, COLORS.red);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', (code) => {
      logStream.end();
      resolve(code);
    });
  });

  log('\n========================================', COLORS.white);
  log('🏁 UNIT TEST SUMMARY (MOBILE INTEGRATED)', COLORS.cyan);
  log('========================================', COLORS.white);
  log(`✅ TOTAL PASSED:       ${filePassed}`, COLORS.green);
  log(`❌ TOTAL FAILED:       ${fileFailed}`, COLORS.red);
  log(`⚠️ TOTAL ERRORS:       ${fileErrors}`, COLORS.magenta);
  log(`🔍 TOTAL WARNINGS:     ${hasWarning ? 1 : 0}`, COLORS.yellow);
  log(`⏱️ TEST TIME DURATION: ${formatDuration(Date.now() - startTime)}`, COLORS.cyan);
  log('========================================', COLORS.white);

  if (fileFailed > 0 || fileErrors > 0) {
    fileReasons.forEach((r) => log(r, COLORS.gray));
  }

  if (fileFailed === 0 && fileErrors === 0 && foundResults) {
    log('🏆 UNIT TEST SUCCESS', COLORS.green);
    process.exit(0);
  } else {
    log('💀 UNIT TEST FAILED', COLORS.red);
    process.exit(1);
  }
}

main().catch(console.error);

