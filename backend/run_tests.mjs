import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS, spawnStream } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname);

async function main() {
  const args = process.argv.slice(2);
  const skipE2E = args.includes('--skip-e2e');
  const skipUnit = args.includes('--skip-unit');
  const dockerOnly = args.includes('--docker-only');
  const resetDocker = args.includes('--reset-docker');

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
    const unitArgs = [];
    if (dockerOnly) unitArgs.push('--docker-only');
    if (resetDocker) unitArgs.push('--reset-docker');
    
    const exitCode = await spawnStream('node', [join(BackendDir, 'run_unit_tests.mjs'), ...unitArgs], { 
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
    const exitCode = await spawnStream('node', [join(BackendDir, 'run_e2e_tests.mjs')], { 
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

  if (allPassed) {
    log("\n🏆 ALL HARIKERJA BACKEND TESTS PASSED.", COLORS.green);
    process.exit(0);
  } else {
    log("\n💀 SOME HARIKERJA BACKEND TESTS FAILED.", COLORS.red);
    process.exit(1);
  }
}

main().catch(console.error);
