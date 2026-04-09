import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS, spawnStream } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FrontendDir = resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  const skipInstall = args.includes('--skip-install');
  const coverage = args.includes('--coverage');
  const quick = args.includes('--quick');

  log("--- HRMS Frontend Unit Test Automation ---", COLORS.cyan);

  const logDir = join(FrontendDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  // 1. Dependency Check
  if (!skipInstall) {
    log("[1/2] Checking Frontend Dependencies...", COLORS.yellow);
    await spawnStream('npm', ['install'], { cwd: FrontendDir });
  }

  // 2. Execution
  log("[2/2] Launching Vitest Suite...", COLORS.cyan);
  log(`Logging output to: ${logFile}`, COLORS.gray);

  const vitestArgs = [
    'vitest', 'run', 
    '--pool=threads', 
    '--maxWorkers', quick ? '4' : '8',
    '--reporter=verbose', 
    '--reporter=json', 
    '--outputFile=logs/unit_results.json'
  ];

  if (coverage) {
    vitestArgs.push('--coverage');
  }

  const exitCode = await spawnStream('npx', vitestArgs, { 
    cwd: FrontendDir,
    logFile
  });

  if (exitCode === 0) {
    log("\nSUCCESS! All unit tests passed.", COLORS.green);
  } else {
    log("\nFAILURE. Some unit tests failed. Check the output above.", COLORS.red);
  }

  process.exit(exitCode);
}

main().catch(console.error);
