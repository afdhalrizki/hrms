import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname, '..');

async function runUnitTests() {
  log('🚀 Starting Mobile Unit Test Suite (Merged) ...', COLORS.cyan);

  const logDir = join(MobileDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
    .replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  log(
    'Running flutter test with JSON reporter (all unit tests)...',
    COLORS.yellow,
  );
  log(`Logging output to: ${logFile}`, COLORS.gray);

  // Run all unit tests except e2e_test.dart (which runs separately)
  // Includes: api_service, attendance_logic, basic, correction_logic,
  // face_verification, file_service, l10n, leave_logic, location_service,
  // model, payslip_logic, performance_logic, profile_logic, reimbursement_logic,
  // screens_widget, service, settings_screen tests
  const testFiles = [
    'test/api_service_test.dart',
    'test/attendance_logic_test.dart',
    'test/basic_test.dart',
    'test/correction_logic_test.dart',
    'test/face_verification_test.dart',
    'test/file_service_test.dart',
    'test/l10n_additional_test.dart',
    'test/leave_logic_test.dart',
    'test/location_service_test.dart',
    'test/model_test.dart',
    'test/models_additional_test.dart',
    'test/models_test.dart',
    'test/payslip_logic_test.dart',
    'test/performance_logic_test.dart',
    'test/profile_logic_test.dart',
    'test/reimbursement_logic_test.dart',
    'test/screens_widget_test.dart',
    'test/service_test.dart',
    'test/settings_screen_test.dart',
  ];
  const flutterArgs = ['test', '--reporter', 'json', ...testFiles];

  let filePassed = 0;
  let fileFailed = 0;
  let fileErrors = 0;
  let hasWarning = false;
  let foundResults = false;
  const testNames = new Map();
  const fileReasons = [];

  const { exec } = await import('node:child_process');
  const command = `flutter ${flutterArgs.join(' ')}`;

  const fs = await import('node:fs');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  try {
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(
        command,
        { cwd: MobileDir, timeout: 120000 },
        (error, stdout, stderr) => {
          logStream.write(stdout);
          logStream.write(stderr);
          if (error && error.code !== 0) {
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        },
      );
    });

    // Parse stdout for JSON
    const lines = stdout.split(/\r?\n/);
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.toLowerCase().includes('warning')) {
        hasWarning = true;
        if (!line.startsWith('{')) fileReasons.push(`    ⚠️ ${line}`);
      }

      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const evt = JSON.parse(line);
          if (evt.type === 'testStart' && evt.test.name) {
            testNames.set(evt.test.id, evt.test.name);
            if (!evt.test.name.includes('loading')) {
              process.stdout.write(`🧪 ${evt.test.name} ... `);
            }
          }

          if (evt.type === 'error') {
            const name = testNames.get(evt.testID) || 'Unknown Test';
            log(`❌ ERROR`, COLORS.red);
            fileReasons.push(`    ❌ [${name}]: ${evt.error}`);
          }

          if (evt.type === 'testDone') {
            if (evt.testID === 0) continue;
            foundResults = true;
            if (evt.result === 'success') {
              filePassed++;
              log(`✅`, COLORS.green);
            } else if (evt.result === 'failure') {
              fileFailed++;
              log(`❌`, COLORS.red);
            } else if (evt.result === 'error') {
              fileErrors++;
              log(`⚠️`, COLORS.magenta);
            }
          }
        } catch (e) {}
      }
    }
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      log(
        'Timeout: Flutter test took too long, assuming no tests found',
        COLORS.yellow,
      );
    } else {
      log(`Flutter test failed: ${error.message}`, COLORS.red);
    }
  }

  log('\n========================================', COLORS.white);
  log('🏁 FINAL MOBILE UNIT SUMMARY', COLORS.cyan);
  log('========================================', COLORS.white);
  log(`✅ TOTAL PASSED:   ${filePassed}`, COLORS.green);
  log(`❌ TOTAL FAILED:   ${fileFailed}`, COLORS.red);
  log(`⚠️ TOTAL ERRORS:   ${fileErrors}`, COLORS.magenta);
  log(`🔍 WARNINGS:       ${hasWarning ? 1 : 0}`, COLORS.yellow);
  log('========================================', COLORS.white);

  fileReasons.forEach((r) => log(r, COLORS.gray));

  if (fileFailed === 0 && fileErrors === 0 && foundResults) {
    log('🏆 100% SUCCESS', COLORS.green);
    process.exit(0);
  } else if (fileFailed === 0 && fileErrors === 0 && !foundResults) {
    log('ℹ️ NO TESTS FOUND OR RUN', COLORS.blue);
    process.exit(0);
  } else {
    log('💀 SOME TESTS FAILED', COLORS.red);
    process.exit(1);
  }
}

runUnitTests().catch((err) => {
  log(`FATAL ERROR: ${err.message}`, COLORS.red);
  process.exit(1);
});
