import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, COLORS, spawnStream } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname, '..');

async function main() {
  log('🚀 Starting harikerja Mobile APK Build (Android)...', COLORS.cyan);

  // 1. Run flutter pub get first to make sure dependencies are up to date
  log('📦 Fetching packages...', COLORS.yellow);
  const getCode = await spawnStream('flutter', ['pub', 'get'], {
    cwd: MobileDir,
    stdio: 'inherit',
  });

  if (getCode !== 0) {
    throw new Error(`Failed to fetch packages (Exit Code: ${getCode})`);
  }

  // 2. Build the APK
  log('🛠 Building Release APK...', COLORS.yellow);
  const buildCode = await spawnStream('flutter', ['build', 'apk', '--release'], {
    cwd: MobileDir,
    stdio: 'inherit',
  });

  if (buildCode !== 0) {
    throw new Error(`Flutter build apk failed (Exit Code: ${buildCode})`);
  }

  log('\n✅ APK Build Successful!', COLORS.green);
  log(`📍 Output path: ${join(MobileDir, 'build/app/outputs/flutter-apk/app-release.apk')}`, COLORS.cyan);
}

main().catch((err) => {
  log(`FATAL ERROR: ${err.message}`, COLORS.red);
  process.exit(1);
});
