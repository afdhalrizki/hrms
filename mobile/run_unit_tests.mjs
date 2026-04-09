import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, log, COLORS } from '../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname);

async function runUnitTests() {
  log("🚀 Starting Mobile Unit Test Suite (Merged) ...", COLORS.cyan);

  const logDir = join(MobileDir, 'logs');
  await ensureDir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const logFile = join(logDir, `unit_test_${timestamp}.log`);

  log("Running flutter test with JSON reporter (single pass)...", COLORS.yellow);
  log(`Logging output to: ${logFile}`, COLORS.gray);

  const flutterArgs = ['test', '--reporter', 'json'];

  let filePassed = 0;
  let fileFailed = 0;
  let fileErrors = 0;
  let hasWarning = false;
  let foundResults = false;
  const testNames = new Map();
  const fileReasons = [];

  const { spawn } = await import('node:child_process');
  const child = spawn('flutter.bat', flutterArgs, { 
    cwd: MobileDir,
    shell: true
  });

  const fs = await import('node:fs');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  child.stdout.on('data', (data) => {
    const str = data.toString();
    logStream.write(data);
    
    const lines = str.split(/\r?\n/);
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
            const name = testNames.get(evt.testID) || "Unknown Test";
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
        } catch (e) {
        }
      }
    }
  });

  child.stderr.on('data', (data) => {
    logStream.write(data);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', (code) => {
      logStream.end();
      resolve(code);
    });
  });

  log("\n========================================", COLORS.white);
  log("🏁 FINAL MOBILE UNIT SUMMARY", COLORS.cyan);
  log("========================================", COLORS.white);
  log(`✅ TOTAL PASSED:   ${filePassed}`, COLORS.green);
  log(`❌ TOTAL FAILED:   ${fileFailed}`, COLORS.red);
  log(`⚠️ TOTAL ERRORS:   ${fileErrors}`, COLORS.magenta);
  log(`🔍 WARNINGS:       ${hasWarning ? 1 : 0}`, COLORS.yellow);
  log("========================================", COLORS.white);

  fileReasons.forEach(r => log(r, COLORS.gray));

  if (fileFailed === 0 && fileErrors === 0 && foundResults) {
    log("🏆 100% SUCCESS", COLORS.green);
    process.exit(0);
  } else {
    log("💀 SOME TESTS FAILED", COLORS.red);
    process.exit(1);
  }
}

runUnitTests().catch(err => {
  log(`FATAL ERROR: ${err.message}`, COLORS.red);
  process.exit(1);
});
