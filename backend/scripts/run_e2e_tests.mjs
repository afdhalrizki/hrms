import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import {
  ensureDir,
  log,
  COLORS,
  spawnStream,
  waitForHttp,
  isPortInUse,
  waitForPort,
  getPythonExec,
  parseMetrics,
  formatDuration,
} from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname, '..');
const RootDir = resolve(BackendDir, '..');
const EnvFile = join(RootDir, 'deploy', 'environments', '.env.local');

function getFileHash(path) {
  if (!existsSync(path)) return '';
  const content = readFileSync(path);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function ensureBackendStarted(noStart) {
  if (await waitForHttp('http://localhost:8000/api/', 60000, 'backend')) {
    return true;
  }

  if (noStart) {
    log('NoStart flag set and backend is not ready.', COLORS.yellow);
    return false;
  }

  const upScript = join(RootDir, 'up.mjs');
  if (!existsSync(upScript)) {
    log(
      `up.mjs not found at ${upScript}. Cannot auto-start backend.`,
      COLORS.yellow,
    );
    return false;
  }

  log('⚠️ Starting backend via up.mjs dev...', COLORS.yellow);
  const startCode = await spawnStream('node', ['up.mjs', 'dev'], {
    cwd: RootDir,
  });
  if (startCode !== 0) {
    log(
      `❌ ERROR: Failed to start backend via up.mjs (Exit Code: ${startCode})`,
      COLORS.red,
    );
    return false;
  }

  log('Waiting for backend port 8000 (max 180s)...', COLORS.gray);
  if (!(await waitForPort(8000, '127.0.0.1', 180000))) {
    log('❌ ERROR: Timeout waiting for backend port 8000', COLORS.red);
    return false;
  }

  log('Performing backend API health check...', COLORS.gray);
  if (!(await waitForHttp('http://localhost:8000/api/', 120000, 'backend'))) {
    log('❌ ERROR: Backend health endpoint is still failing.', COLORS.red);
    return false;
  }

  // Small delay to let django fully settle
  await new Promise((r) => setTimeout(r, 5000));
  return true;
}

async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const noSeed = args.includes('--no-seed');
  const noStart = args.includes('--no-start');
  const noDeps = args.includes('--no-deps');
  const forceDeps = args.includes('--force-deps');
  const workersArg = args.find((a) => a.startsWith('--workers='));
  const workers = workersArg ? parseInt(workersArg.split('=')[1], 10) : Math.max(2, Math.min(4, os.cpus().length - 2));

  const logDir = join(BackendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
    .replace('T', '_');
  const logFile = join(logDir, `e2e_test_${timestamp}.log`);

  log('--- HRMS Backend E2E Test Suite (Node.js) ---', COLORS.cyan);

  // 1. Venv Check
  const venvDir = join(BackendDir, 'venv');
  const pythonPath = getPythonExec(BackendDir);
  const systemPython = process.platform === 'win32' ? 'python' : 'python3';

  log('Checking virtual environment...', COLORS.yellow);
  if (!existsSync(venvDir)) {
    log('Creating virtual environment...', COLORS.gray);
    await spawnStream(systemPython, ['-m', 'venv', venvDir], {
      cwd: BackendDir,
    });
  }

  // (Removed manual path resolution as getPythonExec handles it)

  // 2. Sync Dependencies
  log('Syncing dependencies...', COLORS.yellow);
  if (!noDeps) {
    const reqPath = join(BackendDir, 'requirements.txt');
    const hashPath = join(BackendDir, '.venv_requirements.hash');
    const currentHash = getFileHash(reqPath);
    const cachedHash = existsSync(hashPath)
      ? readFileSync(hashPath, 'utf8').trim()
      : '';

    if (forceDeps || currentHash !== cachedHash) {
      log('Installing requirements (changes detected)...', COLORS.gray);
      await spawnStream(
        pythonPath,
        ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'],
        { cwd: BackendDir },
      );
      await spawnStream(
        pythonPath,
        ['-m', 'pip', 'install', '-r', 'requirements.txt'],
        { cwd: BackendDir },
      );
      writeFileSync(hashPath, currentHash);
    } else {
      log('Requirements are unchanged; skip pip install.', COLORS.green);
    }
  }

  // 3. Env Check & DB Health Overrides
  if (existsSync(EnvFile)) {
    log('Loading environment variables from .env.local...', COLORS.gray);
    const envContent = readFileSync(EnvFile, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
  }

  // Overrides for local native run (ensure we talk to host ports, not container names)
  if (process.env.DB_HOST === 'db' || !process.env.DB_HOST) {
    process.env.DB_HOST = '127.0.0.1';
  }
  if (process.env.DB_PORT === '5432' || !process.env.DB_PORT) {
    process.env.DB_PORT = '5433';
  }
  if (process.env.REDIS_URL?.includes('://redis:')) {
    process.env.REDIS_URL = process.env.REDIS_URL.replace('://redis:', '://127.0.0.1:');
  }
  if (process.env.DATABASE_URL?.includes('@pgbouncer:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@pgbouncer:', '@localhost:');
  }
  if (process.env.DATABASE_URL?.includes('@db:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@db:', '@localhost:');
  }

  // 4. Check if backend server is running and healthy
  log(
    'Checking if backend server is running on localhost:8000...',
    COLORS.yellow,
  );

  const serverReady = await ensureBackendStarted(noStart);

  if (!serverReady) {
    log(
      '❌ ERROR: Backend server is not ready on localhost:8000 after retries.',
      COLORS.red,
    );
    log(
      "Please run 'node run_dev.mjs' in a separate terminal first.",
      COLORS.yellow,
    );
    process.exit(1);
  }

  log('✅ Backend server is reachable and healthy.', COLORS.green);

  // 3. Seeding
  if (!noSeed && !process.env.NO_RESEED) {
    log('Seeding test database...', COLORS.yellow);
    const seedResult = await spawnStream(
      pythonPath,
      [join('scripts', 'seed_test_db.py'), '--workers', workers.toString(), '--preset', 'full'],
      { cwd: BackendDir },
    );
    if (seedResult !== 0) {
      log('❌ ERROR: Database seeding failed.', COLORS.red);
      process.exit(1);
    }
    log(
      'Successfully seeded all test users and employee records.',
      COLORS.green,
    );
  } else {
    log('Skipping seed step due to --no-seed.', COLORS.yellow);
  }

  // 4. Run E2E Tests
  const pytestArgs = [
    '-m',
    'e2e',
    'tests_e2e/',
    '--color=yes',
    '--maxfail=1',
    '--durations=20',
    '--reuse-db',
  ];
  if (workers > 1) {
    pytestArgs.push('-n', workers.toString());
  }

  const exitCode = await spawnStream(
    pythonPath,
    ['-m', 'pytest', ...pytestArgs],
    {
      cwd: BackendDir,
      logFile,
    },
  );

  // 4. Summary
  const logContent = readFileSync(logFile, 'utf8');
  const metrics = parseMetrics(logContent, 'Backend');

  log('\n' + '='.repeat(60), COLORS.cyan);
  log('                E2E TEST RUN SUMMARY (BACKEND)', COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);

  const statusColor =
    metrics.f === 0 && metrics.e === 0 && exitCode === 0
      ? COLORS.green
      : COLORS.red;
  const statusText =
    metrics.f === 0 && metrics.e === 0 && exitCode === 0 ? 'SUCCESS' : 'FAILURE';

  log(`Status:         ${statusText}`, statusColor);
  log(`Exit Code:      ${exitCode}`, exitCode === 0 ? COLORS.white : COLORS.red);
  log('-'.repeat(60), COLORS.gray);
  log(`Tests Passed:       ${metrics.p}`, COLORS.green);
  log(`Tests Failed:       ${metrics.f}`, metrics.f > 0 ? COLORS.red : COLORS.white);
  log(`Tests Errored:      ${metrics.e}`, metrics.e > 0 ? COLORS.red : COLORS.white);
  log(`Warnings:           ${metrics.w}`, metrics.w > 0 ? COLORS.yellow : COLORS.white);
  log(`Test Time Duration: ${formatDuration(Date.now() - startTime)}`, COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);

  process.exit(exitCode);
}

main().catch(console.error);
