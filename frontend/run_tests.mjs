import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS, spawnStream } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FrontendDir = resolve(__dirname);

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

  let allPassed = true;

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
    
    const exitCode = await spawnStream('node', [join(FrontendDir, 'run_unit_tests.mjs'), ...unitArgs], { cwd: FrontendDir });
    if (exitCode !== 0) {
      log("❌ Unit Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ Unit Tests Passed.", COLORS.green);
    }
  }

  // 3. Run E2E Tests (Playwright)
  if (allPassed && !skipE2E) {
    log("\n🌐 [2/2] Running E2E Tests (Playwright)...", COLORS.yellow);
    const e2eArgs = ['--skip-install'];
    if (live) e2eArgs.push('--live');
    
    const exitCode = await spawnStream('node', [join(FrontendDir, 'run_e2e_tests.mjs'), ...e2eArgs], { cwd: FrontendDir });
    if (exitCode !== 0) {
      log("❌ E2E Tests Failed.", COLORS.red);
      allPassed = false;
    } else {
      log("✅ E2E Tests Passed.", COLORS.green);
    }
  }

  if (allPassed) {
    log("\n🏆 ALL HARIKERJA FRONTEND TESTS PASSED.", COLORS.green);
    process.exit(0);
  } else {
    log("\n💀 SOME HARIKERJA FRONTEND TESTS FAILED.", COLORS.red);
    process.exit(1);
  }
}

main().catch(console.error);
