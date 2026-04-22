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
  getDockerComposeCommand
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
      await spawnStream(pythonExec, [join(BackendDir, 'scripts/seed_test_db.py')], { cwd: BackendDir });
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
  log("--- Mobile Integrated Unit Test Automation ---", COLORS.cyan);

  if (!(await ensureBackendStarted())) {
    process.exit(1);
  }

  const logDir = join(MobileDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  log(`\n[2/3] Launching Flutter Test Suite (Sequential Mode)...`, COLORS.cyan);
  log(`Logging output to: ${logFile}`, COLORS.gray);

  const testFiles = readdirSync(join(MobileDir, 'test'))
    .filter(f => f.endsWith('_test.dart') && f !== 'e2e_test.dart')
    .map(f => join('test', f));

  log(`Found ${testFiles.length} test files. Pre-scanning for test names...`, COLORS.gray);

  const allTestNames = [];
  for (const file of testFiles) {
    try {
      const content = readFileSync(join(MobileDir, file), 'utf8');
      // Match test('name' and testWidgets('name'
      // Handles both single and double quotes
      const matches = content.matchAll(/(?:test|testWidgets)\s*\(\s*['"](.*?)['"]/g);
      for (const match of matches) {
        if (match[1]) allTestNames.push(match[1]);
      }
    } catch (e) { }
  }

  const totalTests = allTestNames.length || 100;
  log(`Detected ${totalTests} individual test scenarios.`, COLORS.gray);

  const flutterArgs = [
    'test',
    '-j', '1',
    '--reporter=expanded',
    '--dart-define=INTEGRATED_TEST=true',
    ...testFiles
  ];

  log(`\nExecuting: flutter ${flutterArgs.join(' ')}\n`, COLORS.gray);

  let passCount = 0;
  let failCount = 0;
  let lastProcessedName = "";
  const completedNames = new Set();

  const exitCode = await new Promise((resolve) => {
    const child = spawn('flutter', flutterArgs, {
      cwd: MobileDir,
      shell: true,
    });

    child.stdout.on('data', (data) => {
      const line = data.toString();
      appendFileSync(logFile, data);

      // Match: +<num> -<num>: <name>
      const match = line.match(/\+(\d+)\s*(?:-(\d+))?:\s*(.*)/);
      if (match) {
        passCount = parseInt(match[1]);
        failCount = parseInt(match[2] || "0");
        const fullDesc = match[3].trim();

        // Skip "loading ..." lines
        if (fullDesc.startsWith('loading ')) return;

        // Extract the test title (after the .dart: part)
        let displayTitle = fullDesc;
        const dartMatch = fullDesc.match(/.*\.dart:\s*(.*)/);
        if (dartMatch) {
          displayTitle = dartMatch[1];
        }

        // Find accurate index from pre-scanned list
        let testIdx = allTestNames.findIndex(name => displayTitle.includes(name));
        if (testIdx === -1) {
          testIdx = passCount + failCount - 1;
        }

        const completed = Math.min(testIdx + 1, totalTests);
        const pct = Math.round((completed / totalTests) * 100);
        const color = failCount > 0 ? COLORS.red : COLORS.green;

        // Print each unique test result on a new line (no \r)
        if (!completedNames.has(displayTitle)) {
          completedNames.add(displayTitle);
          const progressLine = `${COLORS.cyan}[${completed}/${totalTests} - ${pct}%]${COLORS.white} ${color}PASS: ${passCount} FAIL: ${failCount}${COLORS.white} | ${COLORS.white}${displayTitle}${COLORS.white}\n`;
          process.stdout.write(progressLine);
        }
      } else if (line.includes('DEBUG') || line.includes('HTTP')) {
        // Show debug/http as warnings (Yellow)
        process.stdout.write(`${COLORS.white}${line}${COLORS.white}`);
      } else {
        // Errors or failures in red
        process.stdout.write(`${COLORS.red}${line}${COLORS.white}`);
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      appendFileSync(logFile, data);
    });

    child.on('close', resolve);
  });

  log("\n" + "=".repeat(50), COLORS.cyan);
  log("MOBILE UNIT TEST EXECUTION SUMMARY", COLORS.cyan);
  log("=".repeat(50), COLORS.cyan);
  log(`Total Scenarios: ${totalTests} (approx)`, COLORS.white);
  log(`Tests Passed:    ${passCount}`, COLORS.green);
  log(`Tests Failed:    ${failCount}`, failCount > 0 ? COLORS.red : COLORS.white);
  log("=".repeat(50), COLORS.cyan);

  if (exitCode === 0 && failCount === 0) {
    log("\n✅ All integrated unit tests passed.", COLORS.green);
    process.exit(0);
  } else {
    log(`\n❌ Test suite failed with ${failCount} failures.`, COLORS.red);
    process.exit(1);
  }
}

main().catch(console.error);
