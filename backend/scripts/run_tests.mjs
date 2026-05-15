import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { log, COLORS, spawnStream, ensureDir, parseMetrics, formatDuration } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname, '..');

async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const skipE2E = args.includes('--skip-e2e');
  const skipUnit = args.includes('--skip-unit');
  const dockerOnly = args.includes('--docker-only');
  const resetDocker = args.includes('--reset-docker');
  const skipDocker = args.includes('--skip-docker');

  const orchestratorFlags = ['--skip-e2e', '--skip-unit'];
  const forwardArgs = args.filter(a => !orchestratorFlags.includes(a));

  log("========================================", COLORS.cyan);
  log("🏆 HARIKERJA BACKEND TEST ORCHESTRATOR", COLORS.cyan);
  log("========================================", COLORS.cyan);

  const logDir = join(BackendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const masterLogFile = join(logDir, `master_test_${timestamp}.log`);
  log(`Master log: ${masterLogFile}`, COLORS.gray);

  let allPassed = true;

  // 1. Run Unit Tests
  if (!skipUnit) {
    log("\n🧪 [1/2] Running Unit Tests (Pytest)...", COLORS.yellow);
    const exitCode = await spawnStream('node', [join(BackendDir, 'scripts/run_unit_tests.mjs'), ...forwardArgs], {
      cwd: BackendDir,
      logFile: masterLogFile
    });
    if (exitCode !== 0) {
      log("❌ Unit Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ Unit Tests Passed.", COLORS.green);
    }
  }

  // 2. Run E2E Tests
  if (allPassed && !skipE2E && !dockerOnly) {
    log("\n🌐 [2/2] Running E2E Tests (Pytest)...", COLORS.yellow);
    const exitCode = await spawnStream('node', [join(BackendDir, 'scripts/run_e2e_tests.mjs'), ...forwardArgs], {
      cwd: BackendDir,
      logFile: masterLogFile
    });
    if (exitCode !== 0) {
      log("❌ E2E Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ E2E Tests Passed.", COLORS.green);
    }
  }

  // 3. Final Summary
  const logContent = readFileSync(masterLogFile, 'utf8');
  const metrics = parseMetrics(logContent, 'Backend');
  const durationMs = Date.now() - startTime;

  log('\n' + '='.repeat(60), COLORS.cyan);
  log('           TOTAL HARIKERJA BACKEND TESTS SUMMARY', COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);

  const statusColor = (metrics.f === 0 && metrics.e === 0 && allPassed) ? COLORS.green : COLORS.red;
  const statusText = (metrics.f === 0 && metrics.e === 0 && allPassed) ? "PASSED" : "FAILED";

  log(`Overall Status: ${statusText}`, statusColor);
  log("-".repeat(60), COLORS.gray);
  log(`Total Passed:       ${metrics.p}`, COLORS.green);
  log(`Total Failed:       ${metrics.f}`, metrics.f > 0 ? COLORS.red : COLORS.white);
  log(`Total Errored:      ${metrics.e}`, metrics.e > 0 ? COLORS.red : COLORS.white);
  log(`Total Warnings:     ${metrics.w}`, metrics.w > 0 ? COLORS.yellow : COLORS.white);
  log(`Test Time Duration: ${formatDuration(durationMs)}`, COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);

  if (allPassed) {
    log("\n🏆 ALL HARIKERJA BACKEND TESTS PASSED.", COLORS.green);
    process.exit(0);
  } else {
    log("\n💀 SOME HARIKERJA BACKEND TESTS FAILED.", COLORS.red);
    process.exit(1);
  }
}

main().catch(console.error);
