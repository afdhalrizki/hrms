import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, COLORS, spawnStream } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  const isWeb = args.includes('--web');
  const isWindows = args.includes('--windows');

  log('🚀 Launching harikerja Mobile (Development)...', COLORS.cyan);

  const flutterArgs = ['run'];
  if (isWeb) {
    flutterArgs.push('-d', 'chrome');
  } else if (isWindows) {
    flutterArgs.push('-d', 'windows');
  }

  await spawnStream('flutter', flutterArgs, {
    cwd: MobileDir,
    stdio: 'inherit',
  });
}

main().catch((err) => {
  log(`FATAL ERROR: ${err.message}`, COLORS.red);
  process.exit(1);
});
