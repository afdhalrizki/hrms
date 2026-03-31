import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS, spawnStream } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname);

async function main() {
  log("--- HRMS Mobile Unit Tests (Flutter) ---", COLORS.cyan);

  log("[1/1] Running Flutter Unit Tests...", COLORS.yellow);
  const logDir = join(MobileDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  const exitCode = await spawnStream('flutter', ['test', '--no-pub', '--reporter=expanded'], { 
    cwd: MobileDir,
    logFile
  });

  log(`\nUNIT TEST RUN SUMMARY (Exit: ${exitCode})`, COLORS.cyan);
  process.exit(exitCode);
}

main().catch(console.error);
