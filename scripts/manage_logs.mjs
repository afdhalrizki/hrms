#!/usr/bin/env node
/**
 * Universal Logs Manager
 * Manage test logs for all services: backend, frontend, mobile
 */

import { readdir, mkdir, rename, rm, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RootDir = resolve(__dirname, '..');

// ANSI Colors
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

// Services configuration
const SERVICES = {
  backend: {
    path: join(RootDir, 'backend', 'logs'),
    logPatterns: ['test_*.log', 'pytest_*.log'],
  },
  frontend: {
    path: join(RootDir, 'frontend', 'logs'),
    logPatterns: ['test_*.log', 'e2e_*.log'],
  },
  mobile: {
    path: join(RootDir, 'mobile', 'logs'),
    logPatterns: ['unit_test_*.log', 'e2e_test_*.log'],
  },
};

async function getServiceLogs(service) {
  const config = SERVICES[service];
  if (!config) {
    log(`  ❌ Unknown service: ${service}`, 'red');
    return [];
  }

  try {
    const files = await readdir(config.path);
    return files
      .filter((f) => f.endsWith('.log') && f !== 'archive')
      .sort()
      .reverse(); // Latest first
  } catch (error) {
    return []; // Directory doesn't exist
  }
}

async function archiveOldLogs(service, daysOld = 7) {
  const config = SERVICES[service];
  if (!config) {
    log(`❌ Unknown service: ${service}`, 'red');
    return;
  }

  try {
    const archiveDir = join(config.path, 'archive');
    await mkdir(archiveDir, { recursive: true });
    log(`📦 Archiving ${service} logs older than ${daysOld} days...`, 'cyan');

    const files = await readdir(config.path);
    const now = Date.now();
    const cutoffTime = now - daysOld * 24 * 60 * 60 * 1000;

    let archived = 0;
    for (const file of files) {
      if (file === 'archive') continue;

      const filePath = join(config.path, file);
      try {
        const fileStat = await stat(filePath);
        if (
          fileStat.isFile() &&
          fileStat.mtimeMs &&
          fileStat.mtimeMs < cutoffTime
        ) {
          const archivePath = join(archiveDir, file);
          await rename(filePath, archivePath);
          archived++;
        }
      } catch (e) {
        // Ignore
      }
    }

    if (archived > 0) {
      log(`  ✅ Archived ${archived} log file(s) from ${service}`, 'green');
    } else {
      log(`  ℹ️  No logs older than ${daysOld} days in ${service}`, 'gray');
    }
  } catch (error) {
    log(`  ❌ Error archiving ${service} logs: ${error.message}`, 'red');
  }
}

async function clearOldLogs(service, daysOld = 30) {
  const config = SERVICES[service];
  if (!config) {
    log(`❌ Unknown service: ${service}`, 'red');
    return;
  }

  try {
    log(`🗑️  Removing ${service} logs older than ${daysOld} days...`, 'yellow');

    const files = await readdir(config.path);
    const now = Date.now();
    const cutoffTime = now - daysOld * 24 * 60 * 60 * 1000;

    let deleted = 0;
    for (const file of files) {
      if (file === 'archive') continue;

      const filePath = join(config.path, file);
      try {
        const fileStat = await stat(filePath);
        if (
          fileStat.isFile() &&
          fileStat.mtimeMs &&
          fileStat.mtimeMs < cutoffTime
        ) {
          await rm(filePath);
          deleted++;
        }
      } catch (e) {
        // Ignore
      }
    }

    if (deleted > 0) {
      log(`  ✅ Deleted ${deleted} log file(s) from ${service}`, 'green');
    } else {
      log(`  ℹ️  No logs older than ${daysOld} days in ${service}`, 'gray');
    }
  } catch (error) {
    log(`  ❌ Error clearing ${service} logs: ${error.message}`, 'red');
  }
}

async function listLogs(service, limit = 10) {
  const logs = await getServiceLogs(service);
  const config = SERVICES[service];

  if (!config) {
    log(`❌ Unknown service: ${service}`, 'red');
    return;
  }

  if (logs.length === 0) {
    log(`  ℹ️  No logs found for ${service} (${config.path})`, 'gray');
    return;
  }

  log(
    `  📋 ${service.toUpperCase()} Test Logs (${logs.length} files):`,
    'cyan',
  );
  logs.slice(0, limit).forEach((file, i) => {
    log(`     ${i + 1}. ${file}`, 'gray');
  });

  if (logs.length > limit) {
    log(`     ... and ${logs.length - limit} more`, 'gray');
  }
}

async function logStats() {
  log('\n📊 Logs Statistics:', 'cyan');
  log('==========================================', 'cyan');

  for (const [service, config] of Object.entries(SERVICES)) {
    try {
      const files = await readdir(config.path);
      const logs = files.filter((f) => f.endsWith('.log'));
      log(`  ${service.toUpperCase()}:`, 'blue');
      log(`    Location: ${config.path}`, 'gray');
      log(`    Total logs: ${logs.length}`, 'gray');
    } catch (error) {
      log(`  ${service.toUpperCase()}: Missing logs directory`, 'gray');
    }
  }

  log('==========================================', 'reset');
}

async function main() {
  const command = process.argv[2];
  const service = process.argv[3] || 'all';
  const param = process.argv[4];

  log('\n🔧 Universal Logs Manager', 'cyan');
  log('==========================================', 'cyan');

  const services = service === 'all' ? Object.keys(SERVICES) : [service];

  if (!command || command === '--help' || command === '-h') {
    log('\n📖 Usage:', 'cyan');
    log('  node scripts/manage_logs.mjs list [service] [limit]', 'gray');
    log('    List test logs (services: backend|frontend|mobile|all)', 'gray');
    log('    default limit: 10', 'gray');
    log('', 'gray');
    log('  node scripts/manage_logs.mjs stats', 'gray');
    log('    Show logs statistics for all services', 'gray');
    log('', 'gray');
    log('  node scripts/manage_logs.mjs archive [service] [days]', 'gray');
    log('    Archive old logs (default: 7 days)', 'gray');
    log('', 'gray');
    log('  node scripts/manage_logs.mjs clear [service] [days]', 'gray');
    log('    Delete old logs (default: 30 days)', 'gray');
    log('', 'gray');
    log('Examples:', 'cyan');
    log(
      '  node scripts/manage_logs.mjs list mobile          # List mobile logs',
      'gray',
    );
    log(
      '  node scripts/manage_logs.mjs list all             # List all services logs',
      'gray',
    );
    log(
      '  node scripts/manage_logs.mjs archive mobile 7     # Archive mobile logs > 7 days',
      'gray',
    );
    log(
      '  node scripts/manage_logs.mjs clear backend 30     # Delete backend logs > 30 days',
      'gray',
    );
    log('', 'reset');
    return;
  }

  switch (command) {
    case 'list':
      log(`\n📋 Test Logs:`, 'cyan');
      for (const srv of services) {
        const limit = parseInt(param) || 10;
        await listLogs(srv, limit);
      }
      break;

    case 'stats':
      await logStats();
      break;

    case 'archive':
      const archiveDays = parseInt(param) || 7;
      log('');
      if (service === 'all') {
        for (const srv of services) {
          await archiveOldLogs(srv, archiveDays);
        }
      } else {
        await archiveOldLogs(service, archiveDays);
      }
      break;

    case 'clear':
      const clearDays = parseInt(param) || 30;
      log('');
      if (service === 'all') {
        for (const srv of services) {
          await clearOldLogs(srv, clearDays);
        }
      } else {
        await clearOldLogs(service, clearDays);
      }
      break;

    default:
      log(`\n❌ Unknown command: ${command}`, 'red');
      log('Use --help for usage information', 'gray');
      process.exit(1);
  }

  log('', 'reset');
}

main().catch((err) => {
  log(`\n❌ FATAL ERROR: ${err.message}`, 'red');
  process.exit(1);
});
