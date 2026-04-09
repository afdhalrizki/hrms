import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import net from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

export const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  magenta: "\x1b[35m",
};

export function log(msg, color = COLORS.white, noNewLine = false) {
  process.stdout.write(`${color}${msg}${COLORS.reset}${noNewLine ? '' : '\n'}`);
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

export function spawnStream(command, args, options = {}) {
  const { logFile, cwd = process.cwd(), env = process.env } = options;
  
  return new Promise((resolve, reject) => {
    log(`Executing: ${command} ${args.join(' ')}`, COLORS.gray);
    
    // In Node.js, we must explicitly check for .cmd on Windows for many binaries
    const actualCommand = (process.platform === 'win32' && !command.includes('\\')) ? `${command}.cmd` : command;
    
    const child = spawn(command, args, { 
      cwd, 
      env, 
      shell: true, // Use shell to handle platform differences correctly
      stdio: ['inherit', 'pipe', 'pipe'] 
    });

    let logStream;
    if (logFile) {
      logStream = createWriteStream(logFile, { flags: 'a' });
    }

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      if (logStream) logStream.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      if (logStream) logStream.write(data);
    });

    child.on('close', (code) => {
      if (logStream) logStream.end();
      resolve(code);
    });

    child.on('error', (err) => {
      log(`Failed to start process: ${err.message}`, COLORS.red);
      if (logStream) logStream.end();
      reject(err);
    });
  });
}

export function spawnBackground(command, args, options = {}) {
  const { cwd = process.cwd(), env = process.env, logFile } = options;
  log(`Starting Background Process: ${command} ${args.join(' ')}`, COLORS.gray);
  
  const child = spawn(command, args, { 
    cwd, 
    env, 
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'] 
  });

  let logStream;
  if (logFile) {
    logStream = createWriteStream(logFile, { flags: 'a' });
  }

  child.stdout.on('data', (data) => {
    if (logStream) logStream.write(data);
  });

  child.stderr.on('data', (data) => {
    if (logStream) logStream.write(data);
  });

  return child;
}

export function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
}

export async function waitForPort(port, host = '127.0.0.1', timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => { socket.destroy(); resolve(); });
        socket.on('error', (err) => { socket.destroy(); reject(err); });
        socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
        socket.connect(port, host);
      });
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return false;
}

export async function waitForHttp(url, timeoutMs = 60000, label = 'service') {
  const start = Date.now();
  log(`Waiting for ${label} to be ready on ${url}...`, COLORS.yellow);
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          // Accept any response that isn't a server error (5xx)
          // 404 is often acceptable as "the server is up, but this specific route isn't ready"
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => { req.destroy(); resolve(false); });
      });
      if (ok) {
        log(`\n✅ ${label} is ready!`, COLORS.green);
        return true;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 2000));
    log(".", COLORS.gray, true);
  }
  log(`\n❌ Timeout waiting for ${label} after ${timeoutMs}ms`, COLORS.red);
  return false;
}

export function parseMetrics(logContent, suiteName) {
  let p = 0, f = 0, e = 0, w = 0;
  const lines = logContent.split(/\r?\n/);

  if (suiteName.includes("Backend")) {
    for (const line of lines) {
      const cleanLine = stripAnsi(line);
      if (cleanLine.match(/==.* (passed|failed|error|skipped|warning|xfailed|xpassed).* in .*/)) {
        const passMatch = cleanLine.match(/(\d+)\s+passed/);
        const failMatch = cleanLine.match(/(\d+)\s+failed/);
        const errMatch = cleanLine.match(/(\d+)\s+error/);
        const warnMatch = cleanLine.match(/(\d+)\s+warning/);
        if (passMatch) p += parseInt(passMatch[1], 10);
        if (failMatch) f += parseInt(failMatch[1], 10);
        if (errMatch) e += parseInt(errMatch[1], 10);
        if (warnMatch) w += parseInt(warnMatch[1], 10);
      }
    }
  } else if (suiteName.includes("Frontend")) {
    for (const line of lines) {
      const cleanLine = stripAnsi(line);
      // Vitest
      const vPass = cleanLine.match(/Tests.*?(\d+)\s+passed/);
      const vFail = cleanLine.match(/Tests.*?(\d+)\s+failed/);
      if (vPass) p += parseInt(vPass[1], 10);
      if (vFail) f += parseInt(vFail[1], 10);
      // Playwright
      const pPass = cleanLine.match(/^\s*(\d+)\s+passed/);
      const pFail = cleanLine.match(/^\s*(\d+)\s+failed/);
      const pFlaky = cleanLine.match(/^\s*(\d+)\s+flaky/);
      if (pPass) p += parseInt(pPass[1], 10);
      if (pFail) f += parseInt(pFail[1], 10);
      if (pFlaky) w += parseInt(pFlaky[1], 10);
    }
  } else if (suiteName.includes("Mobile")) {
    for (const line of lines) {
      const cleanLine = stripAnsi(line);
      // Case 1: Standard summary log lines (manual or PowerShell wrapper)
      const mPass = cleanLine.match(/TOTAL PASSED:\s+(\d+)/);
      const mFail = cleanLine.match(/TOTAL FAILED:\s+(\d+)/);
      const mErr = cleanLine.match(/TOTAL ERRORS:\s+(\d+)/);
      const mWarn = cleanLine.match(/WARNINGS?:\s+(\d+)/);
      if (mPass) p += parseInt(mPass[1], 10);
      if (mFail) f += parseInt(mFail[1], 10);
      if (mErr) e += parseInt(mErr[1], 10);
      if (mWarn) w += parseInt(mWarn[1], 10);

      // Case 2: Native Flutter expanded reporter (e.g., 00:15 +67: All tests passed!)
      // Note: We only take the final count (+XX) to avoid double counting intermittent updates
      const fPassMatch = cleanLine.match(/\d{2,}:\d{2}\s+\+(\d+): (?:All tests passed|Some tests failed)/);
      if (fPassMatch) {
         p = Math.max(p, parseInt(fPassMatch[1], 10));
      }
      
      const fFailMatch = cleanLine.match(/\d{2,}:\d{2}\s+\+\d+\s+-(\d+): Some tests failed/);
      if (fFailMatch) {
         f = Math.max(f, parseInt(fFailMatch[1], 10));
      }
    }
  }
  return { p, f, e, w };
}

export async function getDockerComposeCommand() {
  try {
    await execAsync('docker-compose --version');
    return 'docker-compose';
  } catch (e) {
    try {
      await execAsync('docker compose version');
      return 'docker compose';
    } catch (e2) {
      return null;
    }
  }
}

export async function checkDockerDaemon() {
  try {
    await execAsync('docker info');
    return true;
  } catch (e) {
    return false;
  }
}

export async function ensureDockerRunning() {
  if (await checkDockerDaemon()) return true;

  if (process.platform === 'win32') {
    log("⚠️ Docker daemon is not running. Attempting to start Docker Desktop...", COLORS.yellow);
    const dockerPath = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
    try {
      // Start process without waiting in JS is tricky, we'll use spawn with detached
      const child = spawn(dockerPath, [], { detached: true, stdio: 'ignore' });
      child.unref();

      log("🚀 Starting Docker Desktop... Please wait.", COLORS.gray);
      let maxWait = 24; // 2 minutes
      while (maxWait > 0) {
        await new Promise(r => setTimeout(r, 5000));
        if (await checkDockerDaemon()) {
          log("\n✅ Docker is now running!", COLORS.green);
          return true;
        }
        process.stdout.write(COLORS.gray + "." + COLORS.reset);
        maxWait--;
      }
    } catch (e) {
      log(`❌ ERROR: Failed to start Docker Desktop: ${e.message}`, COLORS.red);
    }
  }

  log("\n❌ ERROR: Docker daemon is not running and could not be started automatically.", COLORS.red);
  return false;
}

export async function isPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

export async function killPortProcess(port) {
  if (process.platform !== 'win32') return; // Simplified for this environment

  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
    const lines = stdout.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        log(`Terminating process ${pid} on port ${port}...`, COLORS.yellow);
        await execAsync(`taskkill /F /PID ${pid}`);
      }
    }
  } catch (e) {
    // If findstr fails (no process), it's okay
  }
}

export async function saveDockerLogs(suffix, logDir, rootDir) {
  const composeCmd = await getDockerComposeCommand();
  if (!composeCmd) return;

  const timestamp = getTimestamp();
  const cleanSuffix = suffix.replace(/[^a-z0-9]/gi, '_');
  const outFile = join(logDir, `docker_compose_logs_${cleanSuffix}_${timestamp}.log`);
  const envFile = join(rootDir, 'environments', '.env.local');

  log(`📦 Capturing docker compose logs to ${outFile}`, COLORS.yellow);
  try {
    const cmd = `${composeCmd} --env-file "${envFile}" logs --no-color --tail 200`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: rootDir });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(outFile, stdout + stderr);
  } catch (e) {
    log(`⚠️ Failed to capture docker compose logs: ${e.message}`, COLORS.yellow);
  }
}

export async function moveFailureScreenshots(dir) {
  const { readdir, rename } = await import('node:fs/promises');
  const logDir = join(dir, 'logs');
  await ensureDir(logDir);

  try {
    const files = await readdir(dir);
    const failureImages = files.filter(f => f.endsWith('-failure.png'));
    for (const file of failureImages) {
      await rename(join(dir, file), join(logDir, file));
    }
    if (failureImages.length > 0) {
      log(`   📸 Moved ${failureImages.length} failure screenshots to ${logDir}`, COLORS.yellow);
    }
  } catch (e) {
    // No-op if failed to search/move
  }
}
