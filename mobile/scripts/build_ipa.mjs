import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, COLORS, spawnStream } from '../../scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MobileDir = resolve(__dirname, '..');

async function main() {
  log('🚀 Starting harikerja Mobile IPA Build (iOS)...', COLORS.cyan);

  if (process.platform !== 'darwin') {
    log('⚠️ WARNING: iOS builds can only be run on macOS. The build might fail if not executed on macOS.', COLORS.yellow);
  }

  // 1. Run flutter pub get first to make sure dependencies are up to date
  log('📦 Fetching packages...', COLORS.yellow);
  const getCode = await spawnStream('flutter', ['pub', 'get'], {
    cwd: MobileDir,
    stdio: 'inherit',
  });

  if (getCode !== 0) {
    throw new Error(`Failed to fetch packages (Exit Code: ${getCode})`);
  }

  // 2. Build the IPA
  log('🛠 Building Release IPA (iOS Bundle)...', COLORS.yellow);
  const buildCode = await spawnStream('flutter', ['build', 'ipa'], {
    cwd: MobileDir,
    stdio: 'inherit',
  });

  if (buildCode !== 0) {
    throw new Error(`Flutter build ipa failed (Exit Code: ${buildCode})`);
  }

  log('\n✅ IPA Build Successful!', COLORS.green);
  log(`📍 Output path: ${join(MobileDir, 'build/ios/archive/')} or ${join(MobileDir, 'build/ios/ipa/')}`, COLORS.cyan);
}

main().catch((err) => {
  log(`FATAL ERROR: ${err.message}`, COLORS.red);
  process.exit(1);
});
