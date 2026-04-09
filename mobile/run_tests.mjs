import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS, spawnStream } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname);

async function main() {
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
    const exitCode = await spawnStream('node', [join(MobileDir, 'run_unit_tests.mjs')], { cwd: MobileDir });
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
    const e2eArgs = [join(MobileDir, 'run_e2e_tests.mjs')];
    if (integrated) e2eArgs.push('--integrated');
    
    const exitCode = await spawnStream('node', e2eArgs, { cwd: MobileDir });
    if (exitCode !== 0) {
      log("❌ E2E Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ E2E Tests Passed.", COLORS.green);
    }
  }

  if (allPassed) {
    log("\n🏆 ALL HARIKERJA MOBILE TESTS PASSED.", COLORS.green);
    process.exit(0);
  } else {
    log("\n💀 SOME HARIKERJA MOBILE TESTS FAILED.", COLORS.red);
    process.exit(1);
  }
}

main().catch(console.error);
