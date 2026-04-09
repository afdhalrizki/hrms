import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { 
  ensureDir, log, COLORS, spawnStream, waitForHttp, isPortInUse, waitForPort 
} from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname);
const RootDir = resolve(BackendDir, '..');
const EnvFile = join(RootDir, 'environments', '.env.local');

async function ensureBackendStarted(noStart) {
  if (await waitForHttp("http://localhost:8000/api/", 5000, 'backend')) {
    return true;
  }

  if (noStart) {
    log("NoStart flag set and backend is not ready.", COLORS.yellow);
    return false;
  }

  const upScript = join(RootDir, 'up.mjs');
  if (!existsSync(upScript)) {
    log(`up.mjs not found at ${upScript}. Cannot auto-start backend.`, COLORS.yellow);
    return false;
  }

  log("⚠️ Starting backend via up.mjs dev...", COLORS.yellow);
  const startCode = await spawnStream('node', ['up.mjs', 'dev'], { cwd: RootDir });
  if (startCode !== 0) {
    log(`❌ ERROR: Failed to start backend via up.mjs (Exit Code: ${startCode})`, COLORS.red);
    return false;
  }

  log("Waiting for backend port 8000 (max 180s)...", COLORS.gray);
  if (!(await waitForPort(8000, '127.0.0.1', 180000))) {
    log("❌ ERROR: Timeout waiting for backend port 8000", COLORS.red);
    return false;
  }

  log("Performing backend API health check...", COLORS.gray);
  if (!(await waitForHttp("http://localhost:8000/api/", 120000, 'backend'))) {
    log("❌ ERROR: Backend health endpoint is still failing.", COLORS.red);
    return false;
  }

  // Small delay to let django fully settle
  await new Promise(r => setTimeout(r, 5000));
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const noSeed = args.includes('--no-seed');
  const noStart = args.includes('--no-start');
  const workersArg = args.find(a => a.startsWith('--workers='));
  const workers = workersArg ? parseInt(workersArg.split('=')[1], 10) : 1;

  const logDir = join(BackendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `e2e_test_${timestamp}.log`);

  log("--- HRMS Backend E2E Test Suite (Node.js) ---", COLORS.cyan);

  // 1. Check if backend server is running and healthy
  log("Checking if backend server is running on localhost:8000...", COLORS.yellow);
  
  const serverReady = await ensureBackendStarted(noStart);
  
  if (!serverReady) {
    log("❌ ERROR: Backend server is not ready on localhost:8000 after retries.", COLORS.red);
    log("Please run 'node run_dev.mjs' in a separate terminal first.", COLORS.yellow);
    process.exit(1);
  }

  log("✅ Backend server is reachable and healthy.", COLORS.green);

  // 2. Seeding
  if (!noSeed) {
    log("Seeding test database...", COLORS.yellow);
    const isWin = process.platform === 'win32';
    const pythonPath = isWin ? join(BackendDir, 'venv', 'Scripts', 'python.exe') : join(BackendDir, 'venv', 'bin', 'python');
    
    const seedResult = await spawnStream(pythonPath, [join('scripts', 'seed_test_db.py')], { cwd: BackendDir });
    if (seedResult !== 0) {
      log("❌ ERROR: Database seeding failed.", COLORS.red);
      process.exit(1);
    }
    log("Successfully seeded all test users and employee records.", COLORS.green);
  } else {
    log("Skipping seed step due to --no-seed.", COLORS.yellow);
  }

  const isWin = process.platform === 'win32';
  const pythonPath = isWin ? join(BackendDir, 'venv', 'Scripts', 'python.exe') : join(BackendDir, 'venv', 'bin', 'python');

  const pytestArgs = ['-m', 'e2e', 'tests_e2e/', '--color=yes', '--maxfail=1', '--durations=20', '--reuse-db'];
  if (workers > 1) {
    pytestArgs.push('-n', workers.toString());
  }

  const exitCode = await spawnStream(pythonPath, ['-m', 'pytest', ...pytestArgs], { 
    cwd: BackendDir,
    logFile
  });

  // 4. Summary
  log("\n" + "=".repeat(60), COLORS.gray);
  log("                E2E TEST RUN SUMMARY", COLORS.cyan);
  log(" (Exit: " + exitCode + ")", COLORS.gray);
  log("=".repeat(60), COLORS.gray);

  const logContent = readFileSync(logFile, 'utf8');
  const finalLines = logContent.split(/\r?\n/).slice(-10).join('\n');
  const summaryMatch = finalLines.match(/==.* (passed|failed|error|skipped|warning|xfailed|xpassed) in .*/);

  if (summaryMatch) {
    const cleanSummary = summaryMatch[0].replace(/[= ]/g, ' ').trim();
    log(" DETAILS : " + cleanSummary, COLORS.white);
    
    if (cleanSummary.match(/failed|error/)) {
      log(" STATUS  : ❌ E2E TESTS FAILED", COLORS.red);
    } else if (cleanSummary.match(/warning/)) {
      log(" STATUS  : ⚠️ E2E PASSED WITH WARNINGS", COLORS.yellow);
    } else if (exitCode === 0) {
      log(" STATUS  : ✅ E2E TESTS PASSED", COLORS.green);
    } else {
      log(" STATUS  : ❌ UNKNOWN FAILURE (Exit Code: " + exitCode + ")", COLORS.red);
    }
  } else {
    if (exitCode === 0) {
      log(" STATUS  : ✅ E2E TESTS PASSED", COLORS.green);
    } else {
      log(" STATUS  : ❌ E2E EXECUTION FAILED", COLORS.red);
    }
  }
  log("=".repeat(60), COLORS.gray);

  process.exit(exitCode);
}

main().catch(console.error);
