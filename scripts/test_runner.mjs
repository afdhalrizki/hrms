import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ensureDir, log, COLORS, spawnStream, spawnBackground, waitForHttp, parseMetrics } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RootDir = resolve(__dirname, '..');
const LogDir = join(RootDir, 'logs');

async function main() {
  const args = process.argv.slice(2);
  const skipE2E = args.includes('-SkipE2E') || args.includes('--skip-e2e');
  const skipMobile = args.includes('-SkipMobile') || args.includes('--skip-mobile');
  const maxSuiteRetries = 1;

  await ensureDir(LogDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const rootLog = join(LogDir, `run_all_test_${timestamp}.log`);

  log("========================================", COLORS.cyan);
  log("🏆 HARIKERJA MASTER NODE TEST RUNNER", COLORS.cyan);
  log("========================================", COLORS.cyan);

  let allPassed = true;
  let backendProc = null;

  try {
    // 1. Infrastructure Preparation
    log("🔧 Preparing Global environment...", COLORS.yellow);
    const dockerResult = await spawnStream('node', [join(RootDir, 'backend/run_unit_tests.mjs'), '--docker-only', '--reset-docker'], { cwd: join(RootDir, 'backend') });
    if (dockerResult !== 0) {
       log("⚠️ Initial Docker setup failed; retrying without reset...", COLORS.yellow);
       await spawnStream('node', [join(RootDir, 'backend/run_unit_tests.mjs'), '--docker-only'], { cwd: join(RootDir, 'backend') });
    }

    // 2. Start Backend Server (for E2E)
    if (!skipE2E) {
      log("🚀 Starting backend environment for E2E tests...", COLORS.yellow);
      backendProc = spawnBackground('node', [join(RootDir, 'backend/run_dev.mjs')], { 
        cwd: join(RootDir, 'backend'),
        logFile: join(LogDir, 'backend_server_bg.log')
      });
      
      const ready = await waitForHttp("http://localhost:8000/api/", 60000, 'backend');
      if (!ready) {
        log("❌ Backend failed to start in time. Aborting full test run to prevent false failures.", COLORS.red);
        process.exit(1);
      }
    }

    const suites = [
      { name: "Backend Stack", path: "backend/run_tests.mjs" },
      { name: "Frontend Stack", path: "frontend/run_tests.mjs" },
      { name: "Mobile Stack", path: "mobile/run_tests.mjs" }
    ];

    const results = [];
    for (const s of suites) {
      if (s.name.includes("Mobile") && skipMobile) {
        log(`\n⏭ SKIPPED: ${s.name}`, COLORS.yellow);
        results.push({ name: s.name, status: "⏭ SKIPPED", p: "-", f: "-", e: "-", w: "-", exit: 0 });
        continue;
      }

      log(`\n🚀 RUNNING: ${s.name}`, COLORS.yellow);
      log("----------------------------------------", COLORS.gray);
      
      const suiteTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
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

      const suiteMetrics = parseMetrics(readFileSync(suiteLog, 'utf8'), s.name);
      const status = exitCode === 0 ? "✅ PASSED" : "❌ FAILED";
      if (exitCode !== 0) allPassed = false;
      
      results.push({ 
        name: s.name, 
        status: status + (attempt > 0 && exitCode === 0 ? ` (retried ${attempt})` : ""), 
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
    if (backendProc && backendProc.kill) {
      log("[Backend] Stopping backend server process...", COLORS.gray);
      backendProc.kill();
    }
    process.exit(allPassed ? 0 : 1);
  }
}

main().catch(console.error);
