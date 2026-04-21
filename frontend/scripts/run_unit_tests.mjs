import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { ensureDir, log, COLORS, spawnStream, spawnBackground, waitForHttp, isPortInUse, parseMetrics } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FrontendDir = resolve(__dirname, '..');
const RootDir = resolve(FrontendDir, '..');
const BackendDir = join(RootDir, 'backend');

async function main() {
  const args = process.argv.slice(2);
  const skipInstall = args.includes('--skip-install');
  const coverage = args.includes('--coverage');
  const quick = args.includes('--quick');

  log("--- HRMS Frontend Integrated Unit Test Automation ---", COLORS.cyan);

  // 1. Backend Orchestration
  log("[1/3] Ensuring Backend is running and seeded...", COLORS.yellow);
  const backendHealthy = await isPortInUse(8000) && await waitForHttp('http://localhost:8000/api/', 2000, 'Backend Check');
  
  if (!backendHealthy) {
    log("Backend not detected or unhealthy. Starting local backend...", COLORS.gray);
    // Start backend in background. We use --seed to ensure fresh data.
    spawnBackground('node', [join(BackendDir, 'scripts/run_dev.mjs'), '--seed'], { cwd: BackendDir });
    
    log("Waiting for backend (max 60s)...", COLORS.gray);
    const ready = await waitForHttp('http://localhost:8000/api/', 60000, 'Backend');
    if (!ready) {
      log("ERROR: Backend failed to start. Integrated tests cannot run.", COLORS.red);
      process.exit(1);
    }
  } else {
    log("Backend is already running. Re-seeding for consistency...", COLORS.gray);
    // Run seed script directly
    const pythonPath = existsSync(join(BackendDir, 'venv/bin/python')) 
      ? join(BackendDir, 'venv/bin/python') 
      : 'python3';
    await spawnStream(pythonPath, [join(BackendDir, 'scripts/seed_test_db.py')], { cwd: BackendDir });
  }

  const logDir = join(FrontendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  // 2. Dependency Check
  if (!skipInstall) {
    log("\n[2/3] Checking Frontend Dependencies...", COLORS.yellow);
    await spawnStream('npm', ['install'], { cwd: FrontendDir });
  }

  // 3. Execution
  log("\n[3/3] Launching Vitest Suite (INDIVIDUAL FILE MODE to avoid OOM)...", COLORS.cyan);
  log(`Logging output to: ${logFile}`, COLORS.gray);

  const testDir = join(FrontendDir, 'src/__tests__');
  const files = readdirSync(testDir)
    .filter(f => f.endsWith('.test.tsx') || f.endsWith('.test.ts'))
    .map(f => join('src/__tests__', f));

  log(`Found ${files.length} test files. Running sequentially...`, COLORS.gray);

  let totalFailedFiles = 0;
  const failedFiles = [];
  const metrics = { passed: 0, failed: 0, errors: 0, warnings: 0 };

  for (const file of files) {
    log(`\nRunning: ${file}`, COLORS.white);
    
    const vitestArgs = [
      'vitest', 'run', file,
      '--environment=jsdom',
      '--pool=forks',
      '--reporter=verbose',
    ];

    let fileOutput = '';
    const exitCode = await new Promise((resolve) => {
      const child = spawn('npx', vitestArgs, {
        cwd: FrontendDir,
        shell: true,
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=4096',
          NEXT_PUBLIC_API_URL: 'http://localhost:8000/api'
        }
      });

      child.stdout.on('data', (data) => {
        const str = data.toString();
        fileOutput += str;
        process.stdout.write(data);
      });

      child.stderr.on('data', (data) => {
        const str = data.toString();
        fileOutput += str;
        process.stderr.write(data);
      });

      child.on('close', resolve);
    });

    // Parse metrics from this file's output
    const fileMetrics = parseMetrics(fileOutput, 'Frontend');
    metrics.passed += fileMetrics.p;
    metrics.failed += fileMetrics.f;
    metrics.errors += fileMetrics.e;
    metrics.warnings += fileMetrics.w;

    if (exitCode !== 0) {
      totalFailedFiles++;
      failedFiles.push(file);
      log(`FAILED: ${file}`, COLORS.red);
    } else {
      log(`PASSED: ${file}`, COLORS.green);
    }
  }

  // Final Summary Table (Similar to Backend)
  log("\n" + "=".repeat(50), COLORS.cyan);
  log("UNIT TEST EXECUTION SUMMARY (FRONTEND INTEGRATED)", COLORS.cyan);
  log("=".repeat(50), COLORS.cyan);
  
  const statusColor = totalFailedFiles === 0 ? COLORS.green : COLORS.red;
  const statusText = totalFailedFiles === 0 ? "SUCCESS" : "FAILURE";

  log(`Status:         ${statusText}`, statusColor);
  log(`Files Scanned:  ${files.length}`, COLORS.white);
  log(`Files Failed:   ${totalFailedFiles}`, totalFailedFiles > 0 ? COLORS.red : COLORS.white);
  log("-".repeat(50), COLORS.gray);
  log(`Tests Passed:   ${metrics.passed}`, COLORS.green);
  log(`Tests Failed:   ${metrics.failed}`, metrics.failed > 0 ? COLORS.red : COLORS.white);
  log(`Tests Errored:  ${metrics.errors}`, metrics.errors > 0 ? COLORS.red : COLORS.white);
  log(`Warnings:       ${metrics.warnings}`, metrics.warnings > 0 ? COLORS.yellow : COLORS.white);
  log("=".repeat(50), COLORS.cyan);

  if (totalFailedFiles === 0) {
    log("\nAll integrated unit tests passed.", COLORS.green);
    process.exit(0);
  } else {
    log(`\nFailed files:`, COLORS.red);
    failedFiles.forEach(f => log(`  - ${f}`, COLORS.red));
    process.exit(1);
  }
}

main().catch(console.error);
