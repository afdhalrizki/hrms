import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import {
  log,
  COLORS,
  isPortInUse,
  killPortProcess,
} from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BackendDir = resolve(__dirname, '..');

async function main() {
  log('--- Stopping HRMS Backend Local Dev Server ---', COLORS.cyan);

  const ports = [8000];
  let killed = false;

  for (const port of ports) {
    if (await isPortInUse(port)) {
      log(`Found process running on port ${port}, terminating...`, COLORS.yellow);
      await killPortProcess(port);
      killed = true;
    }
  }

  if (killed) {
    log('✅ Successfully stopped service on port 8000.', COLORS.green);
  } else {
    log('ℹ️ No server running on port 8000.', COLORS.gray);
  }
}

main().catch(console.error);
