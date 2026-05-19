import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { ensureDir, log, COLORS, spawnStream, formatDuration } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname, '..');

function getLatestLog(filter) {
  const logDir = join(MobileDir, 'logs');
  if (!existsSync(logDir)) return null;
  const files = readdirSync(logDir)
    .filter(f => f.startsWith(filter) && f.endsWith('.log'))
    .map(f => ({ name: f, time: existsSync(join(logDir, f)) ? statSync(join(logDir, f)).mtimeMs : 0 }))
    .sort((a, b) => b.time - a.time);
  return files.length > 0 ? join(logDir, files[0].name) : null;
}

function parseLogMetrics(logFilePath) {
  const metrics = { passed: 0, failed: 0, errors: 0, warnings: 0, total: 0 };
  if (!logFilePath || !existsSync(logFilePath)) return metrics;
  const content = readFileSync(logFilePath, 'utf8');
  
  const testNames = new Map();
  const lines = content.split(/\r?\n/);
  let parsedJsonCount = 0;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.toLowerCase().includes('warning')) {
      metrics.warnings++;
    }

    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const evt = JSON.parse(line);
        if (evt.type === 'testStart' && evt.test && evt.test.name) {
          testNames.set(evt.test.id, evt.test.name);
        }
        if (evt.type === 'testDone') {
          if (evt.testID === 0) continue;
          const name = testNames.get(evt.testID);
          const isInternal = name && (
            name.startsWith('loading ') || 
            name.includes('loading') || 
            name.includes('setUpAll') || 
            name.includes('tearDownAll')
          );
          if (isInternal) continue;
          
          parsedJsonCount++;
          if (evt.result === 'success') {
            metrics.passed++;
          } else if (evt.result === 'failure') {
            metrics.failed++;
          } else if (evt.result === 'error') {
            metrics.errors++;
          }
        }
      } catch (e) {
        // Fall through to text parsing if JSON parsing fails
      }
    }
  }

  // If we couldn't parse any JSON test results, fall back to parsing plain text markers
  if (parsedJsonCount === 0) {
    const passedMatch = content.match(/TOTAL PASSED:\s*(\d+)/i);
    const failedMatch = content.match(/TOTAL FAILED:\s*(\d+)/i);
    const errorsMatch = content.match(/TOTAL ERRORS:\s*(\d+)/i);
    const warningsMatch = content.match(/TOTAL WARNINGS:\s*(\d+)/i);

    if (passedMatch) metrics.passed = parseInt(passedMatch[1], 10);
    if (failedMatch) metrics.failed = parseInt(failedMatch[1], 10);
    if (errorsMatch) metrics.errors = parseInt(errorsMatch[1], 10);
    if (warningsMatch) metrics.warnings = parseInt(warningsMatch[1], 10);
  }
  
  metrics.total = metrics.passed + metrics.failed + metrics.errors;
  return metrics;
}

async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const skipE2E = args.includes('--skip-e2e');
  const skipUnit = args.includes('--skip-unit');
  const integrated = args.includes('--integrated');

  log("========================================", COLORS.cyan);
  log("🏆 HARIKERJA MOBILE TEST ORCHESTRATOR", COLORS.cyan);
  log("========================================", COLORS.cyan);

  let allPassed = true;

  // 1. Run Unit Tests (Flutter)
  if (!skipUnit) {
    log("\n🧪 [1/2] Running Unit Tests (Flutter)...", COLORS.yellow);
    const exitCode = await spawnStream('node', [join(MobileDir, 'scripts/run_unit_tests.mjs')], { cwd: MobileDir });
    if (exitCode !== 0) {
      log("❌ Unit Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ Unit Tests Passed.", COLORS.green);
    }
  }

  // 2. Run E2E Tests (Flutter)
  if (allPassed && !skipE2E) {
    log("\n🌐 [2/2] Running E2E Tests (Flutter)...", COLORS.yellow);
    const e2eArgs = [join(MobileDir, 'scripts/run_e2e_tests.mjs')];
    if (integrated) e2eArgs.push('--integrated');
    
    const exitCode = await spawnStream('node', e2eArgs, { cwd: MobileDir });
    if (exitCode !== 0) {
      log("❌ E2E Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ E2E Tests Passed.", COLORS.green);
    }
  }

  // Final Summary
  const latestUnitLog = getLatestLog('unit_test_');
  const latestE2ELog = getLatestLog('e2e_test_');

  const unitMetrics = !skipUnit ? parseLogMetrics(latestUnitLog) : { passed: 0, failed: 0, errors: 0, warnings: 0, total: 0 };
  const e2eMetrics = !skipE2E ? parseLogMetrics(latestE2ELog) : { passed: 0, failed: 0, errors: 0, warnings: 0, total: 0 };

  const totalPass = unitMetrics.passed + e2eMetrics.passed;
  const totalFailed = unitMetrics.failed + e2eMetrics.failed;
  const totalErrors = unitMetrics.errors + e2eMetrics.errors;
  const totalWarnings = unitMetrics.warnings + e2eMetrics.warnings;
  const grandTotal = unitMetrics.total + e2eMetrics.total;
  const overallPercent = grandTotal > 0 ? Math.round((totalPass / grandTotal) * 1000) / 10 : 0;

  log('\n' + '='.repeat(60), COLORS.cyan);
  log('           TOTAL HARIKERJA MOBILE TESTS SUMMARY', COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);

  const printBreakdown = (label, metrics) => {
    const percent = metrics.total > 0 ? Math.round((metrics.passed / metrics.total) * 1000) / 10 : 0;
    let percentColor = COLORS.red;
    if (percent === 100) percentColor = COLORS.green;
    else if (percent > 80) percentColor = COLORS.yellow;

    log(`[${label}]`, COLORS.white);
    process.stdout.write(`  Tests   : ${metrics.passed} / ${metrics.total}`);
    log(` (${percent}%)`, percentColor);
    log(`  Failed  : ${metrics.failed}`, metrics.failed > 0 ? COLORS.red : COLORS.gray);
    log(`  Errors  : ${metrics.errors}`, metrics.errors > 0 ? COLORS.red : COLORS.gray);
    log(`  Warnings: ${metrics.warnings}`, metrics.warnings > 0 ? COLORS.yellow : COLORS.gray);
  };

  printBreakdown('Unit Tests', unitMetrics);
  log("");
  printBreakdown('E2E Tests', e2eMetrics);

  log("-".repeat(60), COLORS.gray);
  log(`OVERALL SUCCESS    : ${overallPercent}%`, overallPercent === 100 ? COLORS.green : COLORS.red);
  log(`TOTAL PASSED       : ${totalPass} / ${grandTotal}`, COLORS.green);
  log(`TOTAL FAILED       : ${totalFailed}`, totalFailed > 0 ? COLORS.red : COLORS.gray);
  log(`TOTAL ERRORS       : ${totalErrors}`, totalErrors > 0 ? COLORS.red : COLORS.gray);
  log(`TOTAL WARNINGS     : ${totalWarnings}`, totalWarnings > 0 ? COLORS.yellow : COLORS.gray);
  log(`TEST TIME DURATION : ${formatDuration(Date.now() - startTime)}`, COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);

  if (allPassed) {
    log("\n🏆 ALL HARIKERJA MOBILE TESTS PASSED.", COLORS.green);
    process.exit(0);
  } else {
    log("\n💀 SOME HARIKERJA MOBILE TESTS FAILED.", COLORS.red);
    process.exit(1);
  }
}

main().catch(console.error);
