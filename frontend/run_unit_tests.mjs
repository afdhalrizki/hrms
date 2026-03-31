import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS, spawnStream } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FrontendDir = resolve(__dirname);

async function main() {
  const args = process.argv.slice(2);
  const skipInstall = args.includes('--skip-install');
  const coverage = args.includes('--coverage');

  log("--- HRMS Frontend Unit Tests (Vitest) ---", COLORS.cyan);

  if (!skipInstall) {
    log("[0/1] Checking Frontend Dependencies...", COLORS.yellow);
    await spawnStream('npm', ['install'], { cwd: FrontendDir });
  }

  log("[1/1] Running Vitest Unit Tests...", COLORS.yellow);
  const logDir = join(FrontendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  const vitestArgs = ['run'];
  if (coverage) vitestArgs.push('--coverage');

  const exitCode = await spawnStream('npx', ['vitest', ...vitestArgs], { 
    cwd: FrontendDir,
    logFile
  });

  log(`\nUNIT TEST RUN SUMMARY (Exit: ${exitCode})`, COLORS.cyan);
  process.exit(exitCode);
}

main().catch(console.error);
