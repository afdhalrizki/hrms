import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createWriteStream, appendFileSync, readFileSync, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import net from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

export const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  magenta: '\x1b[35m',
  black: '\x1b[30m',
  bold: '\x1b[1m',
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

    const actualCommand =
      process.platform === 'win32' && !command.includes('\\')
        ? `${command}.cmd`
        : command;

    const child = spawn(command, args, {
      cwd,
      env,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
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
    stdio: ['inherit', 'pipe', 'pipe'],
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
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
    .replace('T', '_');
}

export async function waitForPort(port, host = '127.0.0.1', timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('timeout'));
        });
        socket.connect(port, host);
      });
      return true;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 2000));
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
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) {
        log(`\n✅ ${label} is ready!`, COLORS.green);
        return true;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 2000));
    log('.', COLORS.gray, true);
  }
  log(`\n❌ Timeout waiting for ${label} after ${timeoutMs}ms`, COLORS.red);
  return false;
}

export function parseMetrics(logContent, suiteName) {
  let p = 0, f = 0, e = 0, w = 0;
  
  const attempts = logContent.split(/--- SUITE RETRY ATTEMPT \d+ ---/);
  const finalContent = attempts[attempts.length - 1];
  const lines = finalContent.split(/\r?\n/);

  if (suiteName.includes('Backend')) {
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
  } else if (suiteName.includes('Frontend')) {
    for (const line of lines) {
      const cleanLine = stripAnsi(line);
      const vPass = cleanLine.match(/Tests.*?(\d+)\s+passed/);
      const vFail = cleanLine.match(/Tests.*?(\d+)\s+failed/);
      const vErr = cleanLine.match(/Tests.*?(\d+)\s+error/);
      if (vPass) p = Math.max(p, parseInt(vPass[1], 10));
      if (vFail) f = Math.max(f, parseInt(vFail[1], 10));
      if (vErr) e = Math.max(e, parseInt(vErr[1], 10));
      const pPass = cleanLine.match(/^\s*(\d+)\s+passed/);
      const pFail = cleanLine.match(/^\s*(\d+)\s+failed/);
      const pFlaky = cleanLine.match(/^\s*(\d+)\s+flaky/);
      if (pPass) p += parseInt(pPass[1], 10);
      if (pFail) f += parseInt(pFail[1], 10);
      if (pFlaky) w += parseInt(pFlaky[1], 10);
    }
  } else if (suiteName.includes('Mobile')) {
    for (const line of lines) {
      const cleanLine = stripAnsi(line);
      const mPass = cleanLine.match(/TOTAL PASSED:\s+(\d+)/);
      const mFail = cleanLine.match(/TOTAL FAILED:\s+(\d+)/);
      const mErr = cleanLine.match(/TOTAL ERRORS:\s+(\d+)/);
      const mWarn = cleanLine.match(/WARNINGS?:\s+(\d+)/);
      if (mPass) p += parseInt(mPass[1], 10);
      if (mFail) f += parseInt(mFail[1], 10);
      if (mErr) e += parseInt(mErr[1], 10);
      if (mWarn) w += parseInt(mWarn[1], 10);

      const fPassMatch = cleanLine.match(/\d{2,}:\d{2}\s+\+(\d+): (?:All tests passed|Some tests failed)/);
      if (fPassMatch) p = Math.max(p, parseInt(fPassMatch[1], 10));
      const fFailMatch = cleanLine.match(/\d{2,}:\d{2}\s+\+\d+\s+-(\d+): Some tests failed/);
      if (fFailMatch) f = Math.max(f, parseInt(fFailMatch[1], 10));
    }
  }
  return { p, f, e, w };
}

export async function getDockerComposeCommand() {
  try {
    await execAsync('docker compose version');
    return 'docker compose';
  } catch (e) {
    try {
      await execAsync('docker-compose --version');
      return 'docker-compose';
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
    const dockerPath = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
    try {
      const child = spawn(dockerPath, [], { detached: true, stdio: 'ignore' });
      child.unref();
      let maxWait = 24;
      while (maxWait > 0) {
        await new Promise((r) => setTimeout(r, 5000));
        if (await checkDockerDaemon()) return true;
        maxWait--;
      }
    } catch (e) {}
  }
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
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
      const lines = stdout.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') await execAsync(`taskkill /F /PID ${pid}`);
      }
    } catch (e) {}
  } else {
    try {
      // Try SIGINT first (Ctrl+C) - often better for graceful shutdown/data flushing
      try { await execAsync(`fuser -k -INT ${port}/tcp`); } catch (e) {
        const { stdout } = await execAsync(`lsof -t -i:${port}`);
        const pids = stdout.split('\n').filter((p) => p.trim().length > 0);
        for (const pid of pids) await execAsync(`kill -2 ${pid}`);
      }
      
      // Wait a bit for graceful shutdown
      await new Promise(r => setTimeout(r, 2000));
      
      // If still in use, use SIGTERM
      if (await isPortInUse(port)) {
        try { await execAsync(`fuser -k -TERM ${port}/tcp`); } catch (e) {
          const { stdout } = await execAsync(`lsof -t -i:${port}`);
          const pids = stdout.split('\n').filter((p) => p.trim().length > 0);
          for (const pid of pids) await execAsync(`kill -15 ${pid}`);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // If still in use, use SIGKILL
      if (await isPortInUse(port)) {
        try { await execAsync(`fuser -k -KILL ${port}/tcp`); } catch (e) {
          const { stdout } = await execAsync(`lsof -t -i:${port}`);
          const pids = stdout.split('\n').filter((p) => p.trim().length > 0);
          for (const pid of pids) await execAsync(`kill -9 ${pid}`);
        }
      }
    } catch (e) {}
  }
}

export async function saveDockerLogs(suffix, logDir, rootDir) {
  const composeCmd = await getDockerComposeCommand();
  if (!composeCmd) return;
  const outFile = join(logDir, `docker_compose_logs_${suffix.replace(/[^a-z0-9]/gi, '_')}_${getTimestamp()}.log`);
  const envFile = join(rootDir, 'deploy', 'environments', '.env.local');
  try {
    const { stdout, stderr } = await execAsync(`${composeCmd} --env-file "${envFile}" logs --no-color --tail 200`, { cwd: rootDir });
    writeFileSync(outFile, stdout + stderr);
  } catch (e) {}
}

export async function moveFailureScreenshots(dir) {
  const { readdir, rename } = await import('node:fs/promises');
  const { basename } = await import('node:path');
  const logDir = join(dir, 'logs');
  await ensureDir(logDir);

  const failureImages = [];
  async function scan(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (filePath === logDir) continue;
        await scan(filePath);
      } else if (entry.isFile() && (
        entry.name.endsWith('-failure.png') || 
        entry.name.includes('-fail-') || 
        entry.name.includes('backend-unreachable-')
      )) {
        failureImages.push(filePath);
      }
    }
  }

  try {
    await scan(dir);
    for (const file of failureImages) {
      await rename(file, join(logDir, basename(file)));
    }
    if (failureImages.length > 0) {
      log(`   📸 Moved ${failureImages.length} failure screenshots to ${logDir}`, COLORS.yellow);
    }
  } catch (e) {}
}

export function getPythonExec(backendDir) {
  const isWin = process.platform === 'win32';
  return isWin
    ? join(backendDir, 'venv', 'Scripts', 'python.exe')
    : join(backendDir, 'venv', 'bin', 'python');
}
