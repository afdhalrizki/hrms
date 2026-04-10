import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import { 
  ensureDir, log, COLORS, spawnStream, spawnBackground, waitForHttp, parseMetrics,
  isPortInUse, killPortProcess, getTimestamp, ensureDockerRunning, 
  saveDockerLogs, moveFailureScreenshots 
} from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RootDir = resolve(__dirname, '..');
const LogDir = join(RootDir, 'logs');

let BackendServerProcess = null;

async function startBackendRunserver() {
  const backendDir = join(RootDir, "backend");
  
  if (await isPortInUse(8000)) {
    // Check if it's healthy
    const healthy = await new Promise(resolve => {
       const req = http.get("http://localhost:8000/api/", res => resolve(res.statusCode < 500));
       req.on('error', () => resolve(false));
       req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });

    if (healthy) {
      log("⚠️ Port 8000 is already listening and /api/ is healthy; reuse existing backend.", COLORS.yellow);
      return null;
    }

    log("⚠️ Port 8000 is listening but backend health check failed; terminating old process(es) and restarting.", COLORS.yellow);
    await killPortProcess(8000);
    await new Promise(r => setTimeout(r, 2000));
  }

  log("[Backend] Starting run_dev.mjs (with Coverage collection) in background process...", COLORS.green);
  BackendServerProcess = spawnBackground('node', [join(backendDir, 'scripts/run_dev.mjs'), '--coverage'], { 
    cwd: backendDir,
    logFile: join(LogDir, 'backend_server_bg.log')
  });

  return BackendServerProcess;
}

async function stopBackendRunserver() {
  if (BackendServerProcess) {
    log(`[Backend] Stopping backend runserver process...`, COLORS.yellow);
    try {
      // In Node, we can try to be nice or just kill
      BackendServerProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 2000));
      if (!BackendServerProcess.killed) BackendServerProcess.kill('SIGKILL');
    } catch (e) {}
    BackendServerProcess = null;
  }
}

async function ensureBackendServerReady(maxAttempts = 3, waitSeconds = 240) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    const ready = await waitForHttp("http://localhost:8000/api/", 30000, 'backend-check');
    if (ready) {
      log("✅ Backend server is healthy.", COLORS.green);
      return true;
    }

    log(`⚠️ Backend server is not healthy; restarting backend (attempt ${attempt + 1}/${maxAttempts})...`, COLORS.yellow);
    await stopBackendRunserver();
    await startBackendRunserver();

    // Use a longer wait if we just started it
    const waitOk = await waitForHttp("http://localhost:8000/api/", waitSeconds * 1000, 'backend-startup');
    if (waitOk) return true;

    attempt++;
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const skipE2E = args.includes('-SkipE2E') || args.includes('--skip-e2e');
  const skipMobile = args.includes('-SkipMobile') || args.includes('--skip-mobile');
  const maxSuiteRetries = 1;

  await ensureDir(LogDir);
  const timestamp = getTimestamp();
  const rootLog = join(LogDir, `run_all_test_${timestamp}.log`);

  log("========================================", COLORS.cyan);
  log("🏆 HARIKERJA MASTER NODE TEST RUNNER", COLORS.cyan);
  log("========================================", COLORS.cyan);

  let allPassed = true;

  try {
    // 1. Infrastructure Preparation
    log("🔧 Preparing Global environment...", COLORS.yellow);
    if (!(await ensureDockerRunning())) {
      log("❌ Docker is required for tests.", COLORS.red);
      process.exit(1);
    }

    const dockerResult = await spawnStream('node', [join(RootDir, 'backend/scripts/run_unit_tests.mjs'), '--docker-only', '--reset-docker'], { cwd: join(RootDir, 'backend') });
    if (dockerResult !== 0) {
       log("⚠️ Initial Docker setup failed; retrying without reset...", COLORS.yellow);
       await spawnStream('node', [join(RootDir, 'backend/scripts/run_unit_tests.mjs'), '--docker-only'], { cwd: join(RootDir, 'backend') });
    }

    // 2. Start Backend Server (for E2E)
    if (!skipE2E) {
      log("🚀 Preparing backend infrastructure (migrations/deps)...", COLORS.yellow);
      const initCode = await spawnStream('node', [join(RootDir, 'backend/scripts/run_dev.mjs'), '--no-server'], { cwd: join(RootDir, 'backend') });
      if (initCode !== 0) {
        log("⚠️ Backend initialization failed. E2E might fail.", COLORS.red);
        allPassed = false;
      }

      await startBackendRunserver();
      const serverReady = await ensureBackendServerReady(1, 300); // Initial long wait
      
      if (!serverReady) {
        log("\n⚠️ Backend server did not become ready in 300s. Attempting deeper recovery...", COLORS.yellow);
        const secondTry = await ensureBackendServerReady(2, 240);
        if (!secondTry) {
           log("\n❌ ERROR: Backend server failed to start in time after retries.", COLORS.red);
           log("Backend E2E may still run but could fail; we continue to run all suites.", COLORS.yellow);
           allPassed = false;
        }
      }
    }

    const suites = [
      { name: "Backend Stack", path: "backend/scripts/run_tests.mjs" },
      { name: "Frontend Stack", path: "frontend/scripts/run_tests.mjs" },
      { name: "Mobile Stack", path: "mobile/scripts/run_tests.mjs" }
    ];

    const results = [];
    for (const s of suites) {
      if (s.name.includes("Mobile") && skipMobile) {
        log(`\n⏭ SKIPPED: ${s.name}`, COLORS.yellow);
        results.push({ name: s.name, status: "⏭ SKIPPED", p: "-", f: "-", e: "-", w: "-", exit: 0, log: "-" });
        continue;
      }

      // Pre-check backend for Backend suite if E2E is relevant
      if (s.name.includes("Backend") && !skipE2E) {
        if (!await isPortInUse(8000)) {
           log(`\n⚠️ Backend server unexpectedly stopped. Restarting for ${s.name}...`, COLORS.yellow);
           await ensureBackendServerReady(2, 240);
        }
      }

      log(`\n🚀 RUNNING: ${s.name}`, COLORS.yellow);
      log("----------------------------------------", COLORS.gray);
      
      const suiteTimestamp = getTimestamp();
      const suiteLog = join(LogDir, `${s.name.replace(/[^a-z0-9]/gi, '_')}_${suiteTimestamp}.log`);
      
      let exitCode = 1;
      let attempt = 0;
      while (attempt <= maxSuiteRetries) {
        if (attempt > 0) log(`Retry attempt ${attempt} for suite ${s.name} ...`, COLORS.yellow);
        
        exitCode = await spawnStream('node', [join(RootDir, s.path), ...(skipE2E ? ['--skip-e2e'] : [])], { 
          cwd: dirname(join(RootDir, s.path)),
          logFile: suiteLog
        });
        
        if (exitCode === 0) break;
        attempt++;
      }

      // Post-suite processing
      if (exitCode !== 0) {
        await saveDockerLogs(s.name, LogDir, RootDir);
        allPassed = false;
      }

      await moveFailureScreenshots(dirname(join(RootDir, s.path)));

      const suiteMetrics = parseMetrics(readFileSync(suiteLog, 'utf8'), s.name);
      let status = exitCode === 0 ? "✅ PASSED" : "❌ FAILED";
      if (attempt > 0 && exitCode === 0) status += ` (retried ${attempt})`;
      
      results.push({ 
        name: s.name, 
        status: status, 
        ...suiteMetrics, 
        exit: exitCode,
        log: suiteLog
      });
    }

    // Final Report
    log("\n========================================", COLORS.cyan);
    log("📊 FINAL MASTER REPORT", COLORS.cyan);
    log("========================================", COLORS.cyan);
    console.table(results.map(r => ({
      Suite: r.name,
      Status: r.status,
      Passed: r.p,
      Failed: r.f,
      Errors: r.e,
      Warn: r.w,
      Log: r.log
    })));

  } catch (err) {
    log(`❌ Master Orchestration error: ${err.message}`, COLORS.red);
    allPassed = false;
  } finally {
    log("\n🧼 Cleaning up...", COLORS.yellow);
    await stopBackendRunserver();

    // Final check for port 8000
    if (await isPortInUse(8000)) {
      await killPortProcess(8000);
    }

    // Post-Processing Coverage (triggering the existing PS script)
    const coverageScript = join(RootDir, 'backend/scripts/report_e2e_coverage.ps1');
    if (existsSync(coverageScript)) {
       log("\n📊 Post-Processing Coverage Data...", COLORS.cyan);
       await spawnStream('pwsh', ['-NoProfile', '-NoLogo', '-Command', `cd '${join(RootDir, 'backend/scripts')}'; ./report_e2e_coverage.ps1`], { cwd: join(RootDir, 'backend/scripts') });
    }

    if (!allPassed) {
       await saveDockerLogs("master_failure", LogDir, RootDir);
    }

    process.exit(allPassed ? 0 : 1);
  }
}

main().catch(console.error);
