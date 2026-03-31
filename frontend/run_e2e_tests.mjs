import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS, spawnStream } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FrontendDir = resolve(__dirname);

async function main() {
  const args = process.argv.slice(2);
  const skipInstall = args.includes('--skip-install');
  const live = args.includes('--live');

  log("--- HRMS Frontend E2E Tests (Playwright) ---", COLORS.cyan);

  if (!skipInstall) {
    log("[0/1] Checking Frontend Dependencies...", COLORS.yellow);
    await spawnStream('npm', ['install'], { cwd: FrontendDir });
    await spawnStream('npx', ['playwright', 'install', 'chromium'], { cwd: FrontendDir });
  }

  log("[1/1] Running Playwright E2E Tests...", COLORS.yellow);
  const logDir = join(FrontendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `e2e_test_${timestamp}.log`);

  const pwArgs = ['playwright', 'test'];
  // In Node runner, we use environment variables for Live mode if needed.
  // The playwright.config.ts should pick these up.
  
  const exitCode = await spawnStream('npx', pwArgs, { 
    cwd: FrontendDir,
    logFile,
    env: { ...process.env, NEXT_PUBLIC_API_URL: live ? 'https://qa.harikerja.web.id/api' : 'http://localhost:8000/api' }
  });

  log(`\nE2E TEST RUN SUMMARY (Exit: ${exitCode})`, COLORS.cyan);
  process.exit(exitCode);
}

main().catch(console.error);
