import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS, spawnStream } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname);

async function main() {
  log("--- HRMS Mobile E2E Tests (Flutter Integration) ---", COLORS.cyan);

  log("[1/1] Running Flutter Integration Tests...", COLORS.yellow);
  const logDir = join(MobileDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `e2e_test_${timestamp}.log`);

  // Target common device (Chrome for desktop, or specified id)
  const exitCode = await spawnStream('flutter', ['test', 'integration_test', '-d', 'windows', '--no-pub'], { 
    cwd: MobileDir,
    logFile
  });

  log(`\nE2E TEST RUN SUMMARY (Exit: ${exitCode})`, COLORS.cyan);
  process.exit(exitCode);
}

main().catch(console.error);
