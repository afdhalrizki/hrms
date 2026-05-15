import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { ensureDir, log, COLORS, spawnStream, spawnBackground, waitForHttp, isPortInUse, parseMetrics, getPythonExec, formatDuration } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FrontendDir = resolve(__dirname, '..');
const RootDir = resolve(FrontendDir, '..');
const BackendDir = join(RootDir, 'backend');

async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const skipInstall = args.includes('--skip-install');
  const skipBackendRestart = args.includes('--skip-backend-restart');
  const coverage = args.includes('--coverage');
  const quick = args.includes('--quick');
  const numWorkers = 1;

  log("--- HRMS Frontend Integrated Unit Test Automation ---", COLORS.cyan);

  // 1. Backend Orchestration
  log("[1/3] Ensuring Backend is running and seeded...", COLORS.yellow);
  const skipSetup = process.env.SKIP_BACKEND_SETUP === '1';
  const backendHealthy = await isPortInUse(8000) && await waitForHttp('http://localhost:8000/api/', 30000, 'Backend Check');
  
  const logDir = join(FrontendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  if (!backendHealthy && !skipSetup) {
    log("Backend not detected or unhealthy. Starting local backend...", COLORS.gray);
    const backendLog = join(logDir, `backend_integrated_${timestamp}.log`);
    log(`Backend logs will be at: ${backendLog}`, COLORS.gray);
    // Start backend in background. We use --seed to ensure fresh data.
    spawnBackground('node', [join(BackendDir, 'scripts/run_dev.mjs'), '--seed', '--workers', numWorkers.toString(), '--force'], { cwd: BackendDir, logFile: backendLog });
    
    log("Waiting for backend setup to initialize (15s)...", COLORS.gray);
    await new Promise(r => setTimeout(r, 15000));

    log("Waiting for backend (max 120s)...", COLORS.gray);
    const ready = await waitForHttp('http://localhost:8000/api/', 120000, 'Backend');
    if (!ready) {
      log("ERROR: Backend failed to start. Integrated tests cannot run.", COLORS.red);
      process.exit(1);
    }
  } else if (!process.env.NO_RESEED) {
    log("Backend is already running. Re-seeding for consistency...", COLORS.gray);
    const python = getPythonExec(BackendDir);
    const seederScript = join(BackendDir, 'scripts/seed_test_db.py');
    
    // Direct seeding without restarting the server
    await spawnStream(python, [seederScript, '--workers', numWorkers.toString(), '--preset', 'full'], { 
      cwd: BackendDir,
      env: { ...process.env, DB_HOST: '127.0.0.1' }
    });
    log("✅ Re-seeding completed.", COLORS.green);
  }

  // 2. Dependency Check
  if (!skipInstall) {
    log("\n[2/3] Checking Frontend Dependencies...", COLORS.yellow);
    await spawnStream('npm', ['install'], { cwd: FrontendDir });
  }

  // 3. Execution
  log("\n[3/3] Launching Vitest Suite (PARALLEL MODE with happy-dom)...", COLORS.cyan);
  log(`Logging output to: ${logFile}`, COLORS.gray);

  const filterArgs = args.filter(a => !a.startsWith('--'));

  const vitestArgs = [
    'vitest', 'run',
    '--environment=happy-dom',
    '--pool=forks',
    '--maxWorkers=' + numWorkers,
    '--reporter=verbose',
    ...filterArgs
  ];

  let fullOutput = '';
  const exitCode = await new Promise((resolve) => {
    const child = spawn('npx', vitestArgs, {
      cwd: FrontendDir,
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096',
        NEXT_PUBLIC_API_URL: 'http://localhost:8000/api',
        TEST_WORKER_COUNT: numWorkers.toString(),
        DEBUG_API: 'true'
      }
    });

    child.stdout.on('data', (data) => {
      const str = data.toString();
      fullOutput += str;
      process.stdout.write(data);
      appendFileSync(logFile, data);
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      fullOutput += str;
      process.stderr.write(data);
      appendFileSync(logFile, data);
    });

    child.on('close', resolve);
  });

  const metrics = parseMetrics(fullOutput, 'Frontend');
  const testFilesDir = join(FrontendDir, 'src', '__tests__');
  const allTestFiles = existsSync(testFilesDir) ? readdirSync(testFilesDir).filter(f => f.endsWith('.test.tsx') || f.endsWith('.test.ts')) : [];
  
  // Extract failed files from output
  const failedFiles = [];
  const lines = fullOutput.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('FAIL') && (line.includes('.test.tsx') || line.includes('.test.ts'))) {
      const match = line.match(/src\/__tests__\/[a-zA-Z0-9._-]+\.test\.tsx?/);
      if (match && !failedFiles.includes(match[0])) {
        failedFiles.push(match[0]);
      }
    }
  }

  const totalFailedFiles = failedFiles.length;


  // Final Summary Table (Similar to Backend)
  log("\n" + "=".repeat(50), COLORS.cyan);
  log("UNIT TEST EXECUTION SUMMARY (FRONTEND INTEGRATED)", COLORS.cyan);
  log("=".repeat(50), COLORS.cyan);
  
  const statusColor = totalFailedFiles === 0 ? COLORS.green : COLORS.red;
  const statusText = totalFailedFiles === 0 ? "SUCCESS" : "FAILURE";

  log(`Status:         ${statusText}`, statusColor);
  log(`Files Scanned:  ${allTestFiles.length}`, COLORS.white);
  log(`Files Failed:   ${totalFailedFiles}`, totalFailedFiles > 0 ? COLORS.red : COLORS.white);
  log("-".repeat(50), COLORS.gray);
  const m = {
    passed: metrics.p || 0,
    failed: metrics.f || 0,
    errors: metrics.e || 0,
    warnings: metrics.w || 0
  };
  log(`Tests Passed:       ${m.passed}`, COLORS.green);
  log(`Tests Failed:       ${m.failed}`, m.failed > 0 ? COLORS.red : COLORS.white);
  log(`Tests Errored:      ${m.errors}`, m.errors > 0 ? COLORS.red : COLORS.white);
  log(`Warnings:           ${m.warnings}`, m.warnings > 0 ? COLORS.yellow : COLORS.white);
  log(`Test Time Duration: ${formatDuration(Date.now() - startTime)}`, COLORS.cyan);
  log("=".repeat(50), COLORS.cyan);

  // Save metrics to JSON for the master orchestrator
  const unitResults = {
    numPassedTests: m.passed,
    numFailedTests: m.failed,
    numTotalTests: m.passed + m.failed,
    numErroredTests: m.errors,
    warnings: m.warnings
  };
  const unitResultsPath = join(logDir, 'unit_results.json');
  writeFileSync(unitResultsPath, JSON.stringify(unitResults, null, 2));

  if (totalFailedFiles === 0) {
    log("\nAll integrated unit tests passed.", COLORS.green);
    process.exit(0);
  } else {
    log(`\nFailed files:`, COLORS.red);
    failedFiles.forEach(f => log(`  - ${f}`, COLORS.red));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
