import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureDir,
  log,
  COLORS,
  spawnStream,
  waitForPort,
  waitForHttp,
  spawnBackground,
  isPortInUse,
  getPythonExec,
  ensureDockerRunning,
  getDockerComposeCommand,
} from '../../scripts/lib.mjs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname, '..');
const RootDir = resolve(MobileDir, '..');

async function testBackendHealth() {
  try {
    // Attempt a simple health check
    return await waitForHttp(
      'http://127.0.0.1:8000/api/',
      5000,
      'Backend Health',
    );
  } catch (e) {
    return false;
  }
}

async function ensureBackendStarted(isIntegrated) {
  log(
    '[Pre-check] Ensuring backend is reachable on http://127.0.0.1:8000 ...',
    COLORS.yellow,
  );

  const inUse = await isPortInUse(8000);
  if (inUse) {
    const healthy = await testBackendHealth();
    if (healthy) {
      log('✅ Backend is already available and healthy.', COLORS.green);
    } else {
      log(
        '⚠️ Port 8000 is in use but backend is not healthy. Please check manual server or close port.',
        COLORS.red,
      );
      return false;
    }
  } else {
    log('🚀 Backend not ready. Starting via run_dev.mjs...', COLORS.yellow);
    const backendDir = join(RootDir, 'backend');

    // Start backend in background. Using node to run the script.
    spawnBackground('node', ['./scripts/run_dev.mjs', '--no-deps'], {
      cwd: backendDir,
    });

    log('Waiting for backend port 8000 (max 180s)...', COLORS.gray);
    const portReady = await waitForPort(8000, '127.0.0.1', 180000);
    if (!portReady) {
      log('❌ ERROR: Timeout waiting for backend port 8000', COLORS.red);
      return false;
    }

    const healthy = await testBackendHealth();
    if (!healthy) {
      log('❌ ERROR: Backend started but health check failed.', COLORS.red);
      return false;
    }
  }

  if (isIntegrated) {
    const backendDir = join(RootDir, 'backend');
    const pythonExec = getPythonExec(backendDir);
    const envFile = join(RootDir, 'deploy', 'environments', '.env.local');

    const integratedEnv = {
      ...process.env,
      DB_HOST: '127.0.0.1',
      DB_PORT: '6432',
      DB_USER: 'hrms_user',
      DB_PASSWORD: 'hrms_password',
      DB_NAME: 'hrms',
      REDIS_URL: 'redis://localhost:6379/1',
      DATABASE_URL: 'postgres://hrms_user:hrms_password@127.0.0.1:6432/hrms',
    };

    async function verifyDbConnection() {
      try {
        await execAsync(
          `${pythonExec} -c "import psycopg2; psycopg2.connect('dbname=hrms user=hrms_user password=hrms_password host=127.0.0.1 port=6432 connect_timeout=5')"`,
          { env: integratedEnv },
        );
        return true;
      } catch (e) {
        return false;
      }
    }

    log('[Pre-check] Ensuring database services are reachable (Integrated Mode)...', COLORS.yellow);
    const dbInUse = await isPortInUse(6432);
    if (!dbInUse) {
      log('🚀 Database port 6432 not ready. Starting via docker compose...', COLORS.yellow);
      if (!(await ensureDockerRunning())) {
        return false;
      }
      const composeCmd = await getDockerComposeCommand();
      await spawnStream(
        composeCmd,
        ['--env-file', envFile, 'up', '-d', 'db', 'redis', 'pgbouncer'],
        { cwd: RootDir },
      );
    }

    log('⏳ Waiting for verified database connection through proxy...', COLORS.gray);
    let dbVerified = false;
    let retries = 30;
    while (retries > 0 && !dbVerified) {
      dbVerified = await verifyDbConnection();
      if (!dbVerified) {
        process.stdout.write(COLORS.gray + '.');
        await new Promise((r) => setTimeout(r, 2000));
        retries--;
      }
    }

    if (!dbVerified) {
      log('\n❌ ERROR: Database proxy (pgbouncer) is up, but backend database is unreachable.', COLORS.red);
      log('   Check pgbouncer logs: docker compose logs pgbouncer', COLORS.yellow);
      return false;
    }
    log('\n✅ Database connection verified.', COLORS.green);

    // Pre-flight setup: Migrations, Bootstrapping and Seeding
    try {
      log('🔗 Running shared migrations...', COLORS.gray);
      await execAsync(`${pythonExec} manage.py migrate_schemas --shared`, {
        cwd: backendDir,
        env: integratedEnv,
      });

      log('🔗 Running bootstrap_tenants...', COLORS.gray);
      await execAsync(`${pythonExec} manage.py bootstrap_tenants`, {
        cwd: backendDir,
        env: integratedEnv,
      });

      log('🔗 Running seed_test_db.py...', COLORS.gray);
      await execAsync(`${pythonExec} scripts/seed_test_db.py --preset mobile`, {
        cwd: backendDir,
        env: integratedEnv,
      });

      // Smoke test: Login check
      log('💨 Running pre-flight smoke test (Login check)...', COLORS.yellow);
      const smokeTestCmd = `curl -s -X POST -H "X-Tenant-Domain: company1.localhost" -H "Host: company1.localhost:8000" -H "Content-Type: application/json" -d '{"email": "admin@company1.com", "password": "password123"}' http://127.0.0.1:8000/api/auth/login/`;
      
      const { stdout, stderr } = await execAsync(smokeTestCmd);
      if (stdout.includes("access")) {
        log('✅ Smoke test passed: Backend is reachable and login works.', COLORS.green);
      } else {
        log('⚠️ Smoke test failed. Backend response did not contain access token.', COLORS.red);
        log(`Debug info: ${stdout}`, COLORS.gray);
      }
    } catch (err) {
      log(`❌ Integrated setup failed: ${err.message}`, COLORS.red);
      return false;
    }
  }

  return true;
}

async function runE2ETests() {
  const isIntegrated = true; // Always on integrated mode by default

  log(
    '\n🚀 Running Mobile End-to-End Tests (INTEGRATED MODE)...',
    COLORS.cyan,
  );
  log('🔗 Using real backend and database.', COLORS.yellow);

  if (!(await ensureBackendStarted(isIntegrated))) {
    process.exit(1);
  }

  log('📦 Generating localizations...', COLORS.gray);
  try {
    await execAsync('flutter gen-l10n', { cwd: MobileDir });
  } catch (e) {
    // Ignore if it fails but log it
    log(
      '⚠️ flutter gen-l10n failed or not configured, continuing...',
      COLORS.gray,
    );
  }

  const logDir = join(MobileDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
    .replace('T', '_');
  const logFile = join(logDir, `e2e_test_${timestamp}.log`);

  log(`[RUNNING] test/e2e_test.dart`, COLORS.yellow);
  log(`Logging output to: ${logFile}`, COLORS.gray);

  const dartDefines = isIntegrated
    ? ['--dart-define=INTEGRATED_TEST=true']
    : [];
  const flutterArgs = [
    'test',
    '--reporter',
    'json',
    ...dartDefines,
    'test/e2e_test.dart',
  ];

  let filePassed = 0;
  let fileFailed = 0;
  let fileErrors = 0;
  let hasWarning = false;
  let foundResults = false;
  const fs = await import('node:fs');
  const testFileContent = fs.readFileSync(join(MobileDir, 'test/e2e_test.dart'), 'utf-8');
  const totalTests = (testFileContent.match(/testWidgets\(/g) || []).length;
  let currentTestCount = 0;
  const testNames = new Map();
  const fileReasons = [];

  // We use spawn because we need to parse JSON line by line
  const { spawn } = await import('node:child_process');
  const child = spawn('flutter', flutterArgs, {
    cwd: MobileDir,
    shell: true,
  });

  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

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
            if (!evt.test.name.includes('loading') && !evt.test.name.includes('tearDownAll')) {
              currentTestCount++;
              log(`\n[${currentTestCount}/${totalTests}] 🏃 Testing: ${evt.test.name}`, COLORS.cyan);
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
            const isInternal = name && (name.includes('loading') || name.includes('setUpAll') || name.includes('tearDownAll'));
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
        } catch (e) {
          // Not valid JSON or parsing error
        }
      } else {
        // Non-JSON output, print it if it looks interesting
        if (line && !line.startsWith('{')) {
          // process.stdout.write(line + '\n');
        }
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
  log('🏁 E2E TEST SUMMARY', COLORS.cyan);
  log('========================================', COLORS.white);
  log(`✅ TOTAL PASSED:   ${filePassed}`, COLORS.green);
  log(`❌ TOTAL FAILED:   ${fileFailed}`, COLORS.red);
  log(`⚠️ TOTAL ERRORS:   ${fileErrors}`, COLORS.magenta);
  log(`🔍 TOTAL WARNINGS: ${hasWarning ? 1 : 0}`, COLORS.yellow);
  log('========================================', COLORS.white);

  if (fileFailed > 0 || fileErrors > 0) {
    fileReasons.forEach((r) => log(r, COLORS.gray));
  }

  if (fileFailed === 0 && fileErrors === 0 && foundResults) {
    log('🏆 E2E SUCCESS', COLORS.green);
    process.exit(0);
  } else {
    log('💀 E2E TEST FAILED', COLORS.red);
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  log(`FATAL ERROR: ${err.message}`, COLORS.red);
  process.exit(1);
});
