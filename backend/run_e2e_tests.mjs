import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ensureDir, log, COLORS, spawnStream, waitForHttp } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname);
const RootDir = resolve(BackendDir, '..');
const EnvFile = join(RootDir, 'environments', '.env.local');

async function main() {
  log("--- HRMS Backend E2E Test Suite (Node.js) ---", COLORS.cyan);

  // 1. Check if backend server is running
  const serverReady = await waitForHttp("http://localhost:8000/api/", 60000, 'backend');
  if (!serverReady) {
    log("❌ ERROR: Backend server is not reachable on localhost:8000. Please start it first.", COLORS.red);
    process.exit(1);
  }
  log("✅ Backend server is reachable and healthy.", COLORS.green);

  // 2. Seeding
  log("Seeding test database...", COLORS.yellow);
  const isWin = process.platform === 'win32';
  const pythonPath = isWin ? join(BackendDir, 'venv', 'Scripts', 'python.exe') : join(BackendDir, 'venv', 'bin', 'python');
  
  const seedResult = await spawnStream(pythonPath, [join('scripts', 'seed_test_db.py')], { cwd: BackendDir });
  if (seedResult !== 0) {
    log("❌ ERROR: Database seeding failed.", COLORS.red);
    process.exit(1);
  }
  log("Successfully seeded all test users and employee records.", COLORS.green);

  // 3. Run E2E tests
  log("Running E2E tests targeting localhost:8000...", COLORS.green);
  const logDir = join(BackendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `e2e_test_${timestamp}.log`);

  const exitCode = await spawnStream(pythonPath, ['-m', 'pytest', 'tests_e2e/', '--color=yes'], { 
    cwd: BackendDir,
    logFile
  });

  log(`\nE2E TEST RUN SUMMARY (Exit: ${exitCode})`, COLORS.cyan);
  process.exit(exitCode);
}

main().catch(console.error);
