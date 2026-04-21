import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { 
  ensureDir, log, COLORS, spawnStream, waitForHttp, isPortInUse, waitForPort, spawnBackground, moveFailureScreenshots, getPythonExec
} from '../../scripts/lib.mjs';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const FrontendDir = resolve(__dirname, '..');
const BackendDir = resolve(__dirname, '..', '..', 'backend');
const RootDir = resolve(BackendDir, '..');
const EnvFile = join(RootDir, 'deploy', 'environments', '.env.local');

// 0. Load Environment Variables
if (existsSync(EnvFile)) {
    log('Loading environment variables from .env.local...', COLORS.gray);
    const envContent = readFileSync(EnvFile, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const value = m[2].trim();
        process.env[key] = value;
        if (key.startsWith('DB_')) {
          log(`Loaded Env: ${key}=${value}`, COLORS.gray);
        }
      }
    });
}

async function cleanupPort(port) {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
      if (stdout) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            log(`Cleaning up process ${pid} on port ${port}...`, COLORS.gray);
            await execAsync(`taskkill /F /PID ${pid}`);
          }
        }
      }
    } else {
      // Linux/macOS cleanup
      log(`Checking port ${port} on Linux...`, COLORS.gray);
      try {
        // Try fuser first
        await execAsync(`fuser -k ${port}/tcp 2>/dev/null || true`);
        // Then try lsof + kill as backup
        await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
        log(`Cleaned up port ${port}.`, COLORS.gray);
      } catch (e) {
        // cleanup failed, which is fine
      }
    }
  } catch (e) {
    // Port not in use or cleanup failed, which is fine
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skipInstall = args.includes('--skip-install');
  const skipSeed = args.includes('--skip-seed');
  const live = args.includes('--live');

  log("--- HRMS Playwright Automation ---", COLORS.cyan);

  const logDir = join(FrontendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `e2e_test_${timestamp}.log`);

  // 1. Dependency Check
  if (!skipInstall) {
    log("[1/3] Checking Frontend Dependencies...", COLORS.yellow);
    await spawnStream('npm', ['install'], { cwd: FrontendDir });
    await spawnStream('npx', ['playwright', 'install', 'chromium'], { cwd: FrontendDir });
  }

  log(`Logging output to: ${logFile}`, COLORS.gray);

  // 2. Environment Setup
  if (live) {
    log("[2/3] Setting up Live Backend Environment...", COLORS.yellow);
    const upScript = join(RootDir, 'up.mjs');
    if (existsSync(upScript)) {
      log("Ensuring backend is up...", COLORS.gray);
      await spawnStream('node', [upScript, 'dev'], { cwd: RootDir });

      log("Waiting for backend port 8000 (max 180s)...", COLORS.gray);
      const portReady = await waitForPort(8000, '127.0.0.1', 180000);
      if (!portReady) {
        log("ERROR: Backend port 8000 did not become available.", COLORS.red);
        process.exit(1);
      }

      if (!await waitForHttp('http://127.0.0.1:8000/api/', 30000, 'Backend Health')) {
        log("ERROR: Backend health check failed after startup.", COLORS.red);
        process.exit(1);
      }
      
      // Wait for DB to settle
      await new Promise(r => setTimeout(r, 5000));
    } else {
      log("Warning: up.mjs not found, continuing with existing backend state...", COLORS.yellow);
    }
  }

  if (!skipSeed) {
    log("[2/3] Preparing/Seeding test data (Backend)...", COLORS.yellow);
    let pythonCmd = 'python';
    try {
      await execAsync('python --version');
    } catch (e) {
      try {
        await execAsync('python3 --version');
        pythonCmd = 'python3';
      } catch (e2) {
        log("Warning: Neither 'python' nor 'python3' found in PATH.", COLORS.yellow);
      }
    }

    const venvPath = getPythonExec(BackendDir);
    if (existsSync(venvPath)) {
      pythonCmd = venvPath;
      log(`Using venv: ${pythonCmd}`, COLORS.gray);
    } else {
      const venvPathLinuxAlt = join(BackendDir, 'venv_linux', 'bin', 'python');
      if (existsSync(venvPathLinuxAlt)) {
        pythonCmd = venvPathLinuxAlt;
        log(`Using Linux venv (alt): ${pythonCmd}`, COLORS.gray);
      }
    }

    const seedScript = join(BackendDir, 'scripts', 'seed_test_db.py');
    if (existsSync(seedScript)) {
      const exitCode = await spawnStream(pythonCmd, [seedScript], { cwd: BackendDir });
      if (exitCode === 0) {
        log("Seed successful.", COLORS.green);
      } else {
        log(`Warning: Seed script failed (Exit Code: ${exitCode}).`, COLORS.gray);
      }
    } else {
      log(`Warning: Seed script not found at ${seedScript}`, COLORS.yellow);
    }
  } else {
    log("[2/3] Skipping Seed...", COLORS.gray);
  }

  // 3. Port Cleanup
  log("[3/4] Ensuring ports are available...", COLORS.yellow);
  await cleanupPort(3000);
  await cleanupPort(3001);
  await cleanupPort(8000);

  // 3.5. Build Frontend
  if (!args.includes('--skip-build')) {
    log("[3.5/4] Building Frontend Production Bundle...", COLORS.yellow);
    const buildEnv = { 
      ...process.env, 
      NEXT_DISABLE_SWC: "1", 
      NEXT_PRIVATE_LOCAL_SKIP_SWC_CHECK: "1",
      NODE_OPTIONS: "--max-old-space-size=2048",
      NEXT_PUBLIC_API_URL: live ? 'https://qa.harikerja.web.id/api' : 'http://127.0.0.1:8000/api'
    };
    const buildCode = await spawnStream('npm', ['run', 'build'], { cwd: FrontendDir, env: buildEnv });
    if (buildCode !== 0) {
      log("ERROR: Frontend build failed. Aborting tests.", COLORS.red);
      process.exit(1);
    }
  } else {
    log("[3.5/4] Skipping Frontend Build (Using existing .next folder)...", COLORS.gray);
  }

  // 4. Execution
  log("[4/4] Launching Playwright Tests...", COLORS.cyan);
  const testEnv = {
    ...process.env,
    PORT: "3001",
    HOSTNAME: "127.0.0.1", // Force IPv4 to avoid EADDRINUSE conflicts
    NODE_OPTIONS: "--max-old-space-size=1536", // Limit memory per worker
    PLAYWRIGHT_JSON_OUTPUT_NAME: "logs/e2e_results.json",
    NEXT_PUBLIC_API_URL: (live ? 'https://qa.harikerja.web.id/api' : 'http://127.0.0.1:8000/api')
  };

  const pwArgs = [
    'playwright', 'test',
    '--grep-invert', '"diagnostic|Instrumentation"',
    '--workers=1',
    '--retries=2',
    '--timeout=120000',
    '--reporter=list,json'
  ];

  let exitCode = await spawnStream('npx', pwArgs, { 
    cwd: FrontendDir,
    logFile,
    env: testEnv
  });

  // Extra retry for transient failures
  if (exitCode !== 0) {
    log("Transient failure detected, cleaning up ports and retrying Playwright suite once more...", COLORS.yellow);
    await cleanupPort(3000);
    await cleanupPort(8000);
    await new Promise(r => setTimeout(r, 5000));
    exitCode = await spawnStream('npx', pwArgs, { 
      cwd: FrontendDir,
      env: testEnv
    });
  }

  if (existsSync(FrontendDir)) {
    await moveFailureScreenshots(FrontendDir);
  }

  if (exitCode === 0) {
    log("\nWINNER! All tests passed.", COLORS.green);
  } else {
    log("\nFAILURE. Some tests failed. Check the Playwright report.", COLORS.red);
  }

  process.exit(exitCode);
}

main().catch(console.error);
