import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import {
  ensureDir,
  log,
  COLORS,
  spawnStream,
  spawnBackground,
  waitForHttp,
  parseMetrics,
  isPortInUse,
  killPortProcess,
  getTimestamp,
  getPythonExec,
  ensureDockerRunning,
  saveDockerLogs,
  moveFailureScreenshots,
} from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RootDir = resolve(__dirname, '..');
const LogDir = join(RootDir, 'logs');

let BackendServerProcess = null;

async function startBackendRunserver() {
  const backendDir = join(RootDir, 'backend');

  if (await isPortInUse(8000)) {
    log(
      '⚠️ Port 8000 is already listening. Terminating existing process(es) to ensure fresh coverage collection.',
      COLORS.yellow,
    );
    await killPortProcess(8000);
    await new Promise((r) => setTimeout(r, 2000));
  }

  log(
    '[Backend] Starting run_dev.mjs (with Coverage collection) in background process...',
    COLORS.green,
  );
  BackendServerProcess = spawnBackground(
    'node',
    [join(backendDir, 'scripts/run_dev.mjs'), '--coverage', '--skip-migrations'],
    {
      cwd: backendDir,
      logFile: join(LogDir, 'backend_server_bg.log'),
      env: { ...process.env, ENABLE_EMAIL_NOTIFICATIONS: 'False' }
    },
  );

  return BackendServerProcess;
}

async function stopBackendRunserver() {
  if (BackendServerProcess) {
    log(`[Backend] Stopping backend runserver process...`, COLORS.yellow);
    try {
      // First try to kill the wrapper process
      BackendServerProcess.kill('SIGTERM');
      
      // Also explicitly kill whatever is on port 8000 (the actual Django server)
      // our updated killPortProcess uses SIGTERM first!
      await killPortProcess(8000);

      await new Promise((r) => setTimeout(r, 2000));
      if (!BackendServerProcess.killed) BackendServerProcess.kill('SIGKILL');
    } catch (e) {}
    BackendServerProcess = null;
  }
}

async function ensureBackendServerReady(maxAttempts = 3, waitSeconds = 240) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    const ready = await waitForHttp(
      'http://localhost:8000/api/',
      30000,
      'backend-check',
    );
    if (ready) {
      log('✅ Backend server is healthy.', COLORS.green);
      return true;
    }

    log(
      `⚠️ Backend server is not healthy; restarting backend (attempt ${attempt + 1}/${maxAttempts})...`,
      COLORS.yellow,
    );
    await stopBackendRunserver();
    await startBackendRunserver();

    // Use a longer wait if we just started it
    const waitOk = await waitForHttp(
      'http://localhost:8000/api/',
      waitSeconds * 1000,
      'backend-startup',
    );
    if (waitOk) return true;

    attempt++;
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const skipE2E = args.includes('-SkipE2E') || args.includes('--skip-e2e');
  const skipMobile =
    args.includes('-SkipMobile') || args.includes('--skip-mobile');
  const maxSuiteRetries = 1;

  await ensureDir(LogDir);
  const timestamp = getTimestamp();
  const rootLog = join(LogDir, `run_all_test_${timestamp}.log`);

  log('========================================', COLORS.cyan);
  log('🏆 HARIKERJA MASTER NODE TEST RUNNER', COLORS.cyan);
  log('========================================', COLORS.cyan);

  let allPassed = true;

  try {
    // 1. Infrastructure Preparation
    log('🔧 Preparing Global environment...', COLORS.yellow);
    if (!(await ensureDockerRunning())) {
      log('❌ Docker is required for tests.', COLORS.red);
      process.exit(1);
    }
    log('🔧 Resetting Docker environment...', COLORS.yellow);
    const dockerResult = await spawnStream(
      'node',
      [join(RootDir, 'backend', 'scripts', 'run_unit_tests.mjs'), '--docker-only', '--reset-docker'],
      { cwd: join(RootDir, 'backend') }
    );
    if (dockerResult !== 0) {
      log('❌ Docker setup failed.', COLORS.red);
      process.exit(1);
    }

    log("🧪 Initializing Database with 8 worker tenants...", COLORS.yellow);
    await spawnStream(getPythonExec(join(RootDir, 'backend')), [
      join(RootDir, 'backend', 'scripts', 'seed_test_db.py'),
      '--workers', '8',
      '--preset', 'full'
    ], { cwd: join(RootDir, 'backend') });

    const onlyBackendSetup = args.includes('--only-backend-setup');
    
    // 2. Start Backend Server (for E2E)
    if (!skipE2E) {
      log(
        '🚀 Preparing backend infrastructure (migrations/deps)...',
        COLORS.yellow,
      );
      const initCode = await spawnStream(
        'node',
        [join(RootDir, 'backend/scripts/run_dev.mjs'), '--no-server'],
        { 
          cwd: join(RootDir, 'backend'),
          env: { ...process.env, NO_RESEED: '1' }
        },
      );
      if (initCode !== 0) {
        log('⚠️ Backend initialization failed. E2E might fail.', COLORS.red);
        allPassed = false;
        if (onlyBackendSetup) process.exit(1);
      }

      await startBackendRunserver();
      const serverReady = await ensureBackendServerReady(1, 300); // Initial long wait

      if (!serverReady) {
        log(
          '\n⚠️ Backend server did not become ready in 300s. Attempting deeper recovery...',
          COLORS.yellow,
        );
        const secondTry = await ensureBackendServerReady(2, 240);
        if (!secondTry) {
          log(
            '\n❌ ERROR: Backend server failed to start in time after retries.',
            COLORS.red,
          );
          if (onlyBackendSetup) process.exit(1);
          log(
            'Backend E2E may still run but could fail; we continue to run all suites.',
            COLORS.yellow,
          );
          allPassed = false;
        }
      }
      
      if (onlyBackendSetup) {
        log('✅ Backend setup completed successfully.', COLORS.green);
        process.exit(0);
      }
    }

    const onlyStack = args.find(a => a.startsWith('--stack='))?.split('=')[1] || 
                     args[args.indexOf('--stack') + 1];

    const suites = [
      { name: 'Backend Stack', path: 'backend/scripts/run_tests.mjs', args: ['--no-start'] },
      { name: 'Frontend Stack', path: 'frontend/scripts/run_tests.mjs' },
      { name: 'Mobile Stack', path: 'mobile/scripts/run_tests.mjs' },
    ].filter(s => !onlyStack || s.name.toLowerCase().includes(onlyStack.toLowerCase()));

    if (suites.length === 0) {
      log(`❌ ERROR: No stack found matching '${onlyStack}'`, COLORS.red);
      process.exit(1);
    }

    const results = [];
    for (const s of suites) {
      if (s.name.includes('Mobile') && skipMobile) {
        log(`\n⏭ SKIPPED: ${s.name}`, COLORS.yellow);
        results.push({
          name: s.name,
          status: '⏭ SKIPPED',
          p: '-',
          f: '-',
          e: '-',
          w: '-',
          exit: 0,
          log: '-',
        });
        continue;
      }

      // Pre-check backend health
      if (!(await isPortInUse(8000))) {
        log(
          `\n⚠️ Backend server not detected. Starting/Restarting for ${s.name}...`,
          COLORS.yellow,
        );
        await ensureBackendServerReady(2, 240);
      } else {
        // If port is in use, verify it's healthy
        const healthy = await waitForHttp('http://localhost:8000/api/', 5000, 'backend-ping');
        if (!healthy) {
          log(`\n⚠️ Backend server unhealthy. Restarting for ${s.name}...`, COLORS.yellow);
          await ensureBackendServerReady(2, 240);
        } else {
          log(`✅ Backend server healthy and reused for ${s.name}.`, COLORS.green);
        }
      }

      // EXPLICIT RE-SEED before Frontend and Mobile stacks to ensure deterministic state
      if (s.name !== 'Backend Stack') {
        log(`🧪 Re-seeding database for ${s.name}...`, COLORS.yellow);
        
        // Stop server to avoid DB locks or inconsistent states during seeding
        await stopBackendRunserver();
        
        process.env.TEST_WORKER_COUNT = "8";
        const seedEnv = { 
          ...process.env, 
          DB_HOST: '127.0.0.1', 
          DB_PORT: '5433',
          DATABASE_URL: 'postgres://hrms_user:hrms_password@127.0.0.1:5433/hrms'
        };

        await spawnStream(getPythonExec(join(RootDir, 'backend')), [
          join(RootDir, 'backend', 'scripts', 'seed_test_db.py'),
          '--workers',
          '8',
          '--preset',
          'full',
        ], {
          env: seedEnv,
          cwd: join(RootDir, 'backend')
        });

        // Restart and ensure ready
        await startBackendRunserver();
        await ensureBackendServerReady(2, 120);
      }

      log(`\n🚀 RUNNING: ${s.name}`, COLORS.yellow);
      log('----------------------------------------', COLORS.gray);

      const suiteTimestamp = getTimestamp();
      const suiteLog = join(
        LogDir,
        `${s.name.replace(/[^a-z0-9]/gi, '_')}_${suiteTimestamp}.log`,
      );

      let exitCode = 1;
      let attempt = 0;
      while (attempt <= maxSuiteRetries) {
        if (attempt > 0) {
          log(`Retry attempt ${attempt} for suite ${s.name} ...`, COLORS.yellow);
          // Re-seed on retry too!
          log(`🧪 Re-seeding database for retry...`, COLORS.yellow);
          
          // If it's a backend or integration stack, we MUST stop the server
          const needsServer = !skipE2E && (s.name === 'Backend Stack' || s.name === 'Frontend Stack' || s.name === 'Mobile Stack');
          if (needsServer) {
            await stopBackendRunserver();
          }

          await spawnStream(getPythonExec(join(RootDir, 'backend')), [
            join(RootDir, 'backend', 'scripts', 'seed_test_db.py'),
            '--workers', '8',
            '--preset', 'full'
          ], { cwd: join(RootDir, 'backend') });

          if (needsServer) {
            await startBackendRunserver();
            await ensureBackendServerReady(2, 120);
          }

          // Mark the log file for parseMetrics to identify the new attempt
          const { appendFileSync } = await import('node:fs');
          appendFileSync(suiteLog, `\n\n--- SUITE RETRY ATTEMPT ${attempt} ---\n\n`);
        }

        exitCode = await spawnStream(
          'node',
          [join(RootDir, s.path), ...(s.args || []), ...(skipE2E ? ['--skip-e2e'] : [])],
          {
            cwd: dirname(join(RootDir, s.path)),
            logFile: suiteLog,
            env: { ...process.env, NO_RESEED: 'true' },
          },
        );

        if (exitCode === 0) break;
        attempt++;
      }

      // Post-suite processing
      if (exitCode !== 0) {
        await saveDockerLogs(s.name, LogDir, RootDir);
        allPassed = false;
      }

      const stackRoot = dirname(dirname(join(RootDir, s.path)));
      await moveFailureScreenshots(stackRoot);

      const suiteMetrics = parseMetrics(readFileSync(suiteLog, 'utf8'), s.name);
      let status = exitCode === 0 ? '✅ PASSED' : '❌ FAILED';
      if (attempt > 0 && exitCode === 0) status += ` (retried ${attempt})`;

      results.push({
        name: s.name,
        status: status,
        ...suiteMetrics,
        exit: exitCode,
        log: suiteLog,
      });
    }

    // Final Report
    log('\n========================================', COLORS.cyan);
    log('📊 FINAL MASTER REPORT', COLORS.cyan);
    log('========================================', COLORS.cyan);
    console.table(
      results.map((r) => ({
        Suite: r.name,
        Status: r.status,
        Passed: r.p,
        'Unit Passed': r.up || '-',
        'E2E Passed': r.ep || '-',
        Failed: r.f,
        Errors: r.e,
        Warn: r.w,
        Log: r.log,
      })),
    );
  } catch (err) {
    log(`❌ Master Orchestration error: ${err.message}`, COLORS.red);
    allPassed = false;
  } finally {
    log('\n🧼 Cleaning up...', COLORS.yellow);
    await stopBackendRunserver();

    // Final check for port 8000
    if (await isPortInUse(8000)) {
      await killPortProcess(8000);
    }

    // Post-Processing Coverage (triggering the existing PS script)
    const coverageScript = join(
      RootDir,
      'backend/scripts/report_e2e_coverage.mjs',
    );
    if (existsSync(coverageScript)) {
      log('\n📊 Post-Processing Coverage Data...', COLORS.cyan);
      await spawnStream('node', ['./report_e2e_coverage.mjs'], {
        cwd: join(RootDir, 'backend/scripts'),
        env: { ...process.env, NO_RESEED: 'true' },
      });
    }

    if (!allPassed) {
      await saveDockerLogs('master_failure', LogDir, RootDir);
    }

    process.exit(allPassed ? 0 : 1);
  }
}

main().catch(console.error);
