import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { ensureDir, log, COLORS, spawnStream, stripAnsi } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FrontendDir = resolve(__dirname, '..');

function getLatestLog(filter) {
  const logDir = join(FrontendDir, 'logs');
  if (!existsSync(logDir)) return null;
  const files = readdirSync(logDir)
    .filter(f => f.startsWith(filter) && f.endsWith('.log'))
    .map(f => ({ name: f, time: existsSync(join(logDir, f)) ? statSync(join(logDir, f)).mtimeMs : 0 }))
    .sort((a, b) => b.time - a.time);
  return files.length > 0 ? join(logDir, files[0].name) : null;
}

// Helper to count warnings in a log file
function countWarnings(logFilePath) {
  if (!logFilePath || !existsSync(logFilePath)) return 0;
  const content = readFileSync(logFilePath, 'utf8');
  const lines = content.split('\n');
  let warnings = 0;
  for (const line of lines) {
    if (stripAnsi(line).match(/warning|Warning|WARNING/)) {
      warnings++;
    }
  }
  return warnings;
}

async function main() {
  const args = process.argv.slice(2);
  const skipE2E = args.includes('--skip-e2e');
  const skipUnit = args.includes('--skip-unit');
  const skipInstall = args.includes('--skip-install');
  const coverage = args.includes('--coverage');
  const live = args.includes('--live');

  log("========================================", COLORS.cyan);
  log("🏆 HARIKERJA FRONTEND TEST ORCHESTRATOR", COLORS.cyan);
  log("========================================", COLORS.cyan);

  const logDir = join(FrontendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `master_test_${timestamp}.log`);

  let allPassed = true;
  let unitMetrics = { passed: 0, failed: 0, total: 0, warnings: 0 };
  let e2eMetrics = { passed: 0, failed: 0, total: 0, warnings: 0, errors: 0 };

  const unitResultsFile = join(logDir, 'unit_results.json');
  const e2eResultsFile = join(logDir, 'e2e_results.json');

  // Clear stale results
  if (existsSync(unitResultsFile)) {
    try { unlinkSync(unitResultsFile); } catch (e) { }
  }
  if (existsSync(e2eResultsFile)) {
    try { unlinkSync(e2eResultsFile); } catch (e) { }
  }

  // 1. Dependency Check
  if (!skipInstall) {
    log("[0/2] Checking Frontend Dependencies...", COLORS.yellow);
    await spawnStream('npm', ['install'], { cwd: FrontendDir });
  }

  // 2. Run Unit Tests (Vitest)
  if (!skipUnit) {
    log("\n🧪 [1/2] Running Unit Tests (Vitest)...", COLORS.yellow);
    const unitArgs = ['--skip-install'];
    if (coverage) unitArgs.push('--coverage');

    const exitCode = await spawnStream('node', [join(FrontendDir, 'scripts/run_unit_tests.mjs'), ...unitArgs], { cwd: FrontendDir });
    if (exitCode !== 0) {
      log("❌ Unit Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ Unit Tests Passed.", COLORS.green);
    }

    if (existsSync(unitResultsFile)) {
      try {
        const unitJson = JSON.parse(readFileSync(unitResultsFile, 'utf8'));
        unitMetrics.passed = unitJson.numPassedTests || 0;
        unitMetrics.failed = unitJson.numFailedTests || 0;
        unitMetrics.total = unitJson.numTotalTests || 0;

        const latestUnitLog = getLatestLog('unit_test_');
        unitMetrics.warnings = countWarnings(latestUnitLog);
      } catch (e) {
        log(`Warning: Failed to parse unit results JSON: ${e.message}`, COLORS.yellow);
      }
    } else {
      log("Warning: unit_results.json NOT FOUND. Metrics might be incomplete.", COLORS.yellow);
    }
  }

  // 3. Run E2E Tests (Playwright)
  if (allPassed && !skipE2E) {
    log("\n🌐 [2/2] Running E2E Tests (Playwright)...", COLORS.yellow);
    const e2eArgs = ['--skip-install'];
    if (live) e2eArgs.push('--live');
    if (args.includes('--skip-build')) e2eArgs.push('--skip-build');

    const exitCode = await spawnStream('node', [join(FrontendDir, 'scripts/run_e2e_tests.mjs'), ...e2eArgs], { cwd: FrontendDir });
    if (exitCode !== 0) {
      log("❌ E2E Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ E2E Tests Passed.", COLORS.green);
    }

    if (existsSync(e2eResultsFile)) {
      try {
        const e2eJson = JSON.parse(readFileSync(e2eResultsFile, 'utf8'));
        const stats = e2eJson.stats;
        e2eMetrics.passed = (stats.expected || 0) + (stats.flaky || 0);
        e2eMetrics.failed = stats.unexpected || 0;
        e2eMetrics.total = (stats.expected || 0) + (stats.unexpected || 0) + (stats.flaky || 0) + (stats.skipped || 0);
        e2eMetrics.errors = (e2eJson.errors || []).length;

        const latestE2ELog = getLatestLog('e2e_test_');
        e2eMetrics.warnings = countWarnings(latestE2ELog);
      } catch (e) {
        log("Warning: Failed to parse E2E results JSON.", COLORS.gray);
      }
    }
  }

  // Summary Table
  log("\n" + "=".repeat(60), COLORS.gray);
  log("                TOTAL HARIKERJA FRONTEND TESTS SUMMARY", COLORS.cyan);
  log("=".repeat(60), COLORS.gray);

  const printBreakdown = (label, metrics) => {
    const percent = metrics.total > 0 ? Math.round((metrics.passed / metrics.total) * 1000) / 10 : 0;
    let percentColor = COLORS.red;
    if (percent === 100) percentColor = COLORS.green;
    else if (percent > 80) percentColor = COLORS.yellow;

    log(`[${label}]`, COLORS.white);
    process.stdout.write(`  Tests   : ${metrics.passed} / ${metrics.total}`);
    log(` (${percent}%)`, percentColor);
    log(`  Failed  : ${metrics.failed}`, metrics.failed > 0 ? COLORS.red : COLORS.gray);
    log(`  Warnings: ${metrics.warnings}`, metrics.warnings > 0 ? COLORS.yellow : COLORS.gray);
  };

  printBreakdown('Unit Tests', unitMetrics);
  log("");
  printBreakdown('E2E Tests', e2eMetrics);

  const totalPass = unitMetrics.passed + e2eMetrics.passed;
  const grandTotal = unitMetrics.total + e2eMetrics.total;
  const overallPercent = grandTotal > 0 ? Math.round((totalPass / grandTotal) * 1000) / 10 : 0;
  const totalErrors = e2eMetrics.errors;

  log("-".repeat(60), COLORS.gray);
  log(`OVERALL SUCCESS: ${overallPercent}%`, overallPercent === 100 ? COLORS.green : COLORS.red);
  log(`TOTAL ERRORS   : ${totalErrors}`, totalErrors > 0 ? COLORS.red : COLORS.gray);

  if (overallPercent === 100 && allPassed) {
    log(" STATUS  : ✅ ALL TESTS PASSED", COLORS.green);
  } else {
    log(` STATUS  : ❌ ${!allPassed ? 'EXECUTION FAILED' : 'SOME TESTS FAILED OR SKIPPED'}`, COLORS.red);
  }
  log("=".repeat(60), COLORS.gray);

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
