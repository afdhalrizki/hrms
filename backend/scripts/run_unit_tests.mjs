import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import {
  ensureDir,
  log,
  COLORS,
  spawnStream,
  waitForPort,
  isPortInUse,
  getDockerComposeCommand,
  ensureDockerRunning,
  getPythonExec,
  parseMetrics,
} from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname, '..');
const RootDir = resolve(BackendDir, '..');
const EnvFile = join(RootDir, 'deploy', 'environments', '.env.local');

async function main() {
  const args = process.argv.slice(2);
  const dockerOnly = args.includes('--docker-only');
  const resetDocker = args.includes('--reset-docker');
  const skipDocker = args.includes('--skip-docker');
  let pytestArgs = args.filter(
    (a) => !['--docker-only', '--reset-docker', '--skip-docker', '--no-start'].includes(a),
  );

  log('--- HRMS Backend Test Environment Setup (Node.js) ---', COLORS.cyan);

  // 1. Env Check
  if (!existsSync(EnvFile)) {
    log(`⚠️ WARNING: Environment file not found at ${EnvFile}`, COLORS.yellow);
    if (!process.env.DB_PASSWORD) {
      log(
        '❌ ERROR: Required environment variables (e.g. DB_PASSWORD) are not set and .env.local is missing.',
        COLORS.red,
      );
      process.exit(1);
    }
    log('Continuing with existing environment variables...', COLORS.gray);
  } else {
    log('Loading environment variables from .env.local...', COLORS.gray);
    const envContent = readFileSync(EnvFile, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
  }

  // 2. Docker Setup
  if (skipDocker) {
    log('[1/3] Skipping Docker setup (--skip-docker detected).', COLORS.yellow);
  } else {
    log('[1/3] Ensuring Docker services are running...', COLORS.yellow);

    if (!(await ensureDockerRunning())) {
      process.exit(1);
    }

    const composeCmd = await getDockerComposeCommand();
    if (!composeCmd) {
      log(
        '❌ ERROR: Neither docker-compose nor docker compose found.',
        COLORS.red,
      );
      process.exit(1);
    }

    if (resetDocker) {
      log(
        '[Docker] Reset requested: packing down and re-creating containers...',
        COLORS.cyan,
      );
      await spawnStream(composeCmd, [
        '--env-file',
        EnvFile,
        'down',
        '--remove-orphans',
      ]);
    } else {
      // Proactive check for port 5433 conflict if we are trying to start Docker
      if (await isPortInUse(5433)) {
        // If 5433 is in use, check if 6432 is ALSO in use (then maybe it's our own docker)
        if (!(await isPortInUse(6432))) {
          log('⚠️ Port 5433 is in use. Attempting to proceed with pgbouncer setup...', COLORS.yellow);
        }
      }
    }

    await spawnStream(composeCmd, [
      '--env-file',
      EnvFile,
      'up',
      '-d',
      'db',
      'redis',
      'pgbouncer',
    ]);
  }

  // 3. Env Vars & DB Health
  log('[2/3] Checking DB health...', COLORS.yellow);
  // Overrides for local native run (ensure we talk to host ports, not container names)
  if (process.env.DB_HOST === 'db' || !process.env.DB_HOST) {
    process.env.DB_HOST = '127.0.0.1';
  }

  // PORT REDIRECTION: If we are running on host, but config says 5432, we MUST use 5433
  // as mapped in docker-compose.
  if (process.env.DB_PORT === '5432' || !process.env.DB_PORT) {
    log('⚠️ DB_PORT is 5432 (internal). Redirecting to 5433 for host access...', COLORS.gray);
    process.env.DB_PORT = '5433';
  }

  if (process.env.REDIS_URL?.includes('://redis:')) {
    process.env.REDIS_URL = process.env.REDIS_URL.replace(
      '://redis:',
      '://127.0.0.1:',
    );
  }
  if (!process.env.REDIS_URL)
    process.env.REDIS_URL = 'redis://127.0.0.1:6379/1';

  if (process.env.DATABASE_URL?.includes('@pgbouncer:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
      '@pgbouncer:',
      '@localhost:',
    );
  }
  if (process.env.DATABASE_URL?.includes('@db:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
      '@db:',
      '@localhost:',
    );
  }
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      'postgres://hrms_user:hrms_password@localhost:5433/hrms';
  }
  process.env.DB_NAME = 'hrms';

  const dbPort = parseInt(process.env.DB_PORT) || 5433;
  log(
    `Waiting for database to be ready on ${process.env.DB_HOST}:${dbPort}...`,
    COLORS.gray,
  );
  const dbReady = await waitForPort(dbPort);
  if (!dbReady) {
    log(`\n❌ ERROR: Database port ${dbPort} did not become ready in time.`, COLORS.red);
    process.exit(1);
  }
  if (resetDocker) {
    log('[Docker] Forcefully cleaning up stale test databases...', COLORS.gray);
    try {
      const { execSync } = await import('node:child_process');
      // Kill any lingering python/pytest processes
      try { execSync('pkill -f python || true'); } catch(e) {}
      
      const PGPASS = 'PGPASSWORD=hrms_password';
      const DB_CMD = `psql -h localhost -p ${dbPort} -U hrms_user -d postgres`;

      // Kill connections and drop all test databases (main and workers)
      try {
        const getDatabasesSql = "SELECT datname FROM pg_database WHERE datname LIKE 'test_hrms%'";
        const dbsOutput = execSync(`${PGPASS} ${DB_CMD} -t -c "${getDatabasesSql}"`).toString().trim();
        const dbs = dbsOutput.split(/\r?\n/).map(d => d.trim()).filter(d => d.length > 0);
        
        for (const db of dbs) {
          log(`   🧹 Dropping test database: ${db}`, COLORS.gray);
          try {
            execSync(`${PGPASS} ${DB_CMD} -c "REVOKE CONNECT ON DATABASE ${db} FROM public" || true`);
            execSync(`${PGPASS} ${DB_CMD} -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db}' AND pid <> pg_backend_pid()" || true`);
            execSync(`${PGPASS} dropdb -h localhost -p ${dbPort} -U hrms_user ${db} || true`);
          } catch (e) {
            log(`      ⚠️ Failed to drop ${db}: ${e.message}`, COLORS.gray);
          }
        }
      } catch (e) {
        log(`   ⚠️ Warning during DB cleanup: ${e.message}`, COLORS.gray);
      }
    } catch (e) {}
  }

  // Restore parallel execution for speed, now that DB infra is stable.
  const nWorkers = process.env.PYTEST_WORKERS || '4';
  if (!pytestArgs.some(a => a === '-n' || a.startsWith('-n'))) {
    log(`Parallel execution enabled with ${nWorkers} workers.`, COLORS.gray);
    pytestArgs.unshift('-n', nWorkers);
  }
 
  // Intelligently set --reuse-db
  // If we just reset docker, we want a fresh creation (no --reuse-db)
  // Otherwise, we MUST use --reuse-db to avoid "Database already exists" errors
  if (resetDocker) {
    pytestArgs = pytestArgs.filter(a => a !== '--reuse-db');
  } else {
    if (!pytestArgs.includes('--reuse-db')) {
      pytestArgs.push('--reuse-db');
    }
  }
  const finalArgs = pytestArgs;
  log('[3/3] Checking pytest and python path...', COLORS.yellow);
  const venvPath = getPythonExec(BackendDir);
  const systemPython = process.platform === 'win32' ? 'python' : 'python3';

  if (!existsSync(venvPath)) {
    log('Creating virtual environment...', COLORS.yellow);
    await spawnStream(systemPython, ['-m', 'venv', 'venv'], {
      cwd: BackendDir,
    });
    log('Installing dependencies...', COLORS.yellow);
    await spawnStream(
      venvPath,
      ['-m', 'pip', 'install', '-r', 'requirements.txt'],
      { cwd: BackendDir },
    );
  }

  const pythonPath = venvPath;

  log(`Using python from: ${pythonPath}`, COLORS.gray);

  if (pythonPath === systemPython) {
    // Verify it works
    try {
      await spawnStream(systemPython, ['--version'], { stdio: 'ignore' });
    } catch (e) {
      log(
        '❌ ERROR: python not found in venv and system python is missing.',
        COLORS.red,
      );
      process.exit(1);
    }
  }

  if (dockerOnly) {
    log(
      '--- Docker-only mode: environment ready, skipping pytest execution. ---',
      COLORS.green,
    );
    process.exit(0);
  }

  // 5. Run Pytest
  log('--- Running HRMS Backend Unit Tests ---', COLORS.green);
  const logDir = join(BackendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
    .replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);



  const exitCode = await spawnStream(
    pythonPath,
    [
      '-m',
      'pytest',
      '--color=yes',
      '--durations=20',
      ...finalArgs,
    ],
    {
      cwd: BackendDir,
      logFile,
    },
  );

  // 6. Summary
  const logContent = readFileSync(logFile, 'utf8');
  const metrics = parseMetrics(logContent, 'Backend');

  log('\n' + '='.repeat(60), COLORS.cyan);
  log('                UNIT TEST RUN SUMMARY (BACKEND)', COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);

  const statusColor = (metrics.f === 0 && metrics.e === 0 && exitCode === 0) ? COLORS.green : COLORS.red;
  const statusText = (metrics.f === 0 && metrics.e === 0 && exitCode === 0) ? "SUCCESS" : "FAILURE";

  log(`Status:         ${statusText}`, statusColor);
  log(`Exit Code:      ${exitCode}`, exitCode === 0 ? COLORS.white : COLORS.red);
  log("-".repeat(60), COLORS.gray);
  log(`Tests Passed:   ${metrics.p}`, COLORS.green);
  log(`Tests Failed:   ${metrics.f}`, metrics.f > 0 ? COLORS.red : COLORS.white);
  log(`Tests Errored:  ${metrics.e}`, metrics.e > 0 ? COLORS.red : COLORS.white);
  log(`Warnings:       ${metrics.w}`, metrics.w > 0 ? COLORS.yellow : COLORS.white);
  log('='.repeat(60), COLORS.cyan);

  process.exit(exitCode);
}

main().catch(console.error);
