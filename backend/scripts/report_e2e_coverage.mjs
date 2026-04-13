import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync } from 'node:fs';
import { ensureDir, log, COLORS, spawnStream } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname, '..');
const VenvDir = join(BackendDir, 'venv');
const isWin = process.platform === 'win32';
const PythonExec = isWin
  ? join(VenvDir, 'Scripts', 'python.exe')
  : join(VenvDir, 'bin', 'python');

function getPythonCommand() {
  if (existsSync(PythonExec)) return PythonExec;
  return isWin ? 'python' : 'python3';
}

const coverageFile = join(BackendDir, '.coverage');
const reportDir = join(BackendDir, 'coverage');

function coverageFragmentsExist() {
  return readdirSync(BackendDir).some((name) => name.startsWith('.coverage.'));
}

async function main() {
  log('--- Generating Backend E2E Coverage Report ---', COLORS.cyan);

  if (!existsSync(VenvDir)) {
    log('Creating virtual environment...', COLORS.gray);
    const systemPython = isWin ? 'python' : 'python3';
    await spawnStream(systemPython, ['-m', 'venv', VenvDir], {
      cwd: BackendDir,
    });
  }

  const pythonPath = getPythonCommand();

  if (coverageFragmentsExist()) {
    log('Combining coverage data...', COLORS.gray);
    const combineCode = await spawnStream(
      pythonPath,
      ['-m', 'coverage', 'combine', '--data-file', coverageFile],
      { cwd: BackendDir },
    );

    if (combineCode !== 0) {
      log('❌ ERROR: coverage combine failed.', COLORS.red);
      process.exit(combineCode);
    }
  } else {
    log(
      'No parallel coverage files (.coverage.*) found. Using base .coverage file.',
      COLORS.yellow,
    );
  }

  await ensureDir(reportDir);
  log(`Generating HTML report in ${reportDir} ...`, COLORS.gray);
  const htmlCode = await spawnStream(
    pythonPath,
    ['-m', 'coverage', 'html', '--data-file', coverageFile, '-d', reportDir],
    { cwd: BackendDir },
  );

  if (htmlCode !== 0) {
    log('❌ ERROR: coverage html generation failed.', COLORS.red);
    process.exit(htmlCode);
  }

  log('✅ Backend E2E Coverage Report generated!', COLORS.green);
  log(`Open: ${join(reportDir, 'index.html')}`, COLORS.gray);
  process.exit(0);
}

main().catch((error) => {
  log(`❌ ERROR: ${error.message}`, COLORS.red);
  process.exit(1);
});
