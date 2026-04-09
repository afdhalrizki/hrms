import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { 
  ensureDir, log, COLORS, spawnStream, waitForPort, waitForHttp,
  isPortInUse, getDockerComposeCommand, ensureDockerRunning 
} from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname);
const RootDir = resolve(BackendDir, '..');
const EnvFile = join(RootDir, 'environments', '.env.local');

function getFileHash(path) {
  if (!existsSync(path)) return "";
  const content = readFileSync(path);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  const noServer = args.includes('--no-server');
  const noDeps = args.includes('--no-deps');
  const forceDeps = args.includes('--force-deps');
  const seed = args.includes('--seed') || args.includes('--Seed');
  const coverage = args.includes('--coverage') || args.includes('--Coverage');

  log("--- HRMS Backend Local Dev Setup (Node.js) ---", COLORS.cyan);

  // 1. Env Check
  if (!existsSync(EnvFile)) {
    log(`❌ ERROR: Environment file not found at ${EnvFile}`, COLORS.red);
    process.exit(1);
  }

  // 2. Docker Setup
  log("[1/5] Ensuring Docker services are running...", COLORS.yellow);
  
  // Defensive Port Checks
  const requiredPorts = [5432, 6379, 6432, 8000];
  for (const port of requiredPorts) {
    if (await isPortInUse(port)) {
      log(`WARNING: Port ${port} is already in use. This might cause Docker or Local Server to fail.`, COLORS.yellow);
    }
  }

  if (!(await ensureDockerRunning())) {
    process.exit(1);
  }

  const composeCmd = await getDockerComposeCommand();
  if (!composeCmd) {
    log("❌ ERROR: Neither docker-compose nor docker compose found.", COLORS.red);
    process.exit(1);
  }

  log(`Using: ${composeCmd}`, COLORS.gray);
  await spawnStream(composeCmd, ['--env-file', EnvFile, 'up', '-d', 'db', 'redis', 'pgbouncer'], { cwd: RootDir });

  // 3. Env Vars & DB Health
  log("[2/5] Loading environment variables...", COLORS.yellow);
  const envContent = readFileSync(EnvFile, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
  process.env.DB_HOST = "localhost";
  process.env.REDIS_URL = "redis://localhost:6379/1";
  process.env.DATABASE_URL = "postgres://hrms_user:hrms_password@localhost:6432/hrms";

  log("Waiting for database to be ready on localhost:5432...", COLORS.gray);
  const dbReady = await waitForPort(5432);
  if (!dbReady) {
    log("\n❌ ERROR: Database did not become ready in time.", COLORS.red);
    process.exit(1);
  }
  log("Database is ready!", COLORS.green);

  // 4. Venv Check
  const isWin = process.platform === 'win32';
  const venvDir = join(BackendDir, 'venv');
  const pythonPath = isWin ? join(venvDir, 'Scripts', 'python.exe') : join(venvDir, 'bin', 'python');

  log("[3/5] Checking virtual environment...", COLORS.yellow);
  if (!existsSync(venvDir)) {
    log("Creating virtual environment...", COLORS.gray);
    await spawnStream('python', ['-m', 'venv', venvDir], { cwd: BackendDir });
  }

  // 5. Sync Dependencies
  log("[4/5] Syncing dependencies...", COLORS.yellow);
  if (!noDeps) {
    const reqPath = join(BackendDir, 'requirements.txt');
    const hashPath = join(BackendDir, '.venv_requirements.hash');
    const currentHash = getFileHash(reqPath);
    const cachedHash = existsSync(hashPath) ? readFileSync(hashPath, 'utf8').trim() : "";

    if (forceDeps || currentHash !== cachedHash) {
      log("Installing requirements (changes detected)...", COLORS.gray);
      await spawnStream(pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'], { cwd: BackendDir });
      await spawnStream(pythonPath, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: BackendDir });
      writeFileSync(hashPath, currentHash);
    } else {
      log("Requirements are unchanged; skip pip install.", COLORS.green);
    }
  }

  // 6. Migrations
  log("[5/5] Checking migrations (shared & tenant)...", COLORS.yellow);
  try {
    await spawnStream(pythonPath, ['manage.py', 'migrate_schemas', '--shared', '--noinput'], { cwd: BackendDir });
    await spawnStream(pythonPath, ['manage.py', 'migrate_schemas', '--tenant', '--noinput'], { cwd: BackendDir });
  } catch (e) {
    log("Migration failed. You might need to run 'python manage.py bootstrap_tenants' if this is first run.", COLORS.red);
  }

  if (seed) {
    log("[5+/5] Seeding test data...", COLORS.yellow);
    const seedScript = join(BackendDir, 'scripts', 'seed_test_db.py');
    if (existsSync(seedScript)) {
      await spawnStream(pythonPath, [seedScript], { cwd: BackendDir });
    } else {
      log("WARNING: scripts/seed_test_db.py not found. Skipping seed.", COLORS.yellow);
    }
  }

  // 7. Start Server
  if (!noServer) {
    if (await isPortInUse(8000)) {
      log("Port 8000 is already in use; assuming existing backend service is running. Skipping local runserver.", COLORS.yellow);
    } else {
      log("--- Starting Django Server at http://localhost:8000 ---", COLORS.green);
      if (coverage) {
        log("Running WITH coverage collection...", COLORS.magenta);
        await spawnStream(pythonPath, ['-m', 'coverage', 'run', 'manage.py', 'runserver', '0.0.0.0:8000', '--noreload'], { cwd: BackendDir });
      } else {
        await spawnStream(pythonPath, ['manage.py', 'runserver', '0.0.0.0:8000'], { cwd: BackendDir });
      }
    }
  } else {
    log("Skipping runserver due to --no-server.", COLORS.yellow);
  }
}

main().catch(console.error);
