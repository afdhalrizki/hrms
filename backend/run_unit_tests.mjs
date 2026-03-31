import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { ensureDir, log, COLORS, spawnStream, waitForPort, stripAnsi } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname);
const RootDir = resolve(BackendDir, '..');
const EnvFile = join(RootDir, 'environments', '.env.local');

async function main() {
  const args = process.argv.slice(2);
  const dockerOnly = args.includes('--docker-only');
  const resetDocker = args.includes('--reset-docker');
  const pytestArgs = args.filter(a => !a.startsWith('--docker-only') && !a.startsWith('--reset-docker'));

  log("--- HRMS Backend Test Environment Setup (Node.js) ---", COLORS.cyan);

  // 1. Env Check
  if (!existsSync(EnvFile)) {
    log(`❌ ERROR: Environment file not found at ${EnvFile}`, COLORS.red);
    process.exit(1);
  }

  // 2. Docker Setup
  log("[1/3] Ensuring Docker services are running...", COLORS.yellow);
  const dockerCmd = 'docker';
  const composeCmd = 'docker-compose'; // or 'docker compose' as fallback in spawnStream

  if (resetDocker) {
    log("[Docker] Reset requested: packing down and re-creating containers...", COLORS.cyan);
    await spawnStream('docker-compose', ['--env-file', EnvFile, 'down', '--remove-orphans']);
  }

  await spawnStream('docker-compose', ['--env-file', EnvFile, 'up', '-d', 'db', 'redis', 'pgbouncer']);

  // 3. Env Vars & DB Health
  log("[2/3] Loading environment variables and checking DB...", COLORS.yellow);
  // Source env for this process
  const envContent = readFileSync(EnvFile, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
  // Overrides for local native run
  process.env.DB_HOST = "127.0.0.1";
  process.env.REDIS_URL = "redis://localhost:6379/1";
  process.env.DATABASE_URL = "postgres://hrms_user:hrms_password@localhost:6432/hrms";

  log("Waiting for database to be ready on localhost:5432...", COLORS.gray);
  const dbReady = await waitForPort(5432);
  if (!dbReady) {
    log("\n❌ ERROR: Database did not become ready in time.", COLORS.red);
    process.exit(1);
  }
  log("Database is ready!", COLORS.green);

  // 4. Venv & Pytest detection
  log("[3/3] Checking pytest in virtual environment...", COLORS.yellow);
  const isWin = process.platform === 'win32';
  const pythonPath = isWin ? join(BackendDir, 'venv', 'Scripts', 'python.exe') : join(BackendDir, 'venv', 'bin', 'python');
  
  if (!existsSync(pythonPath)) {
    log(`❌ ERROR: python not found in venv. Please ensure venv is setup.`, COLORS.red);
    process.exit(1);
  }

  if (dockerOnly) {
    log("--- Docker-only mode: environment ready, skipping pytest execution. ---", COLORS.green);
    process.exit(0);
  }

  // 5. Run Pytest
  log("--- Running HRMS Backend Unit Tests ---", COLORS.green);
  const logDir = join(BackendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  const exitCode = await spawnStream(pythonPath, ['-m', 'pytest', '--color=yes', ...pytestArgs], { 
    cwd: BackendDir,
    logFile
  });

  log(`\nTEST RUN SUMMARY (Exit: ${exitCode})`, COLORS.cyan);
  process.exit(exitCode);
}

main().catch(console.error);
