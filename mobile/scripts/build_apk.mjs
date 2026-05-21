import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, copyFileSync } from 'node:fs';
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

  // 3. Rename APK to include 'harikerja' and version
  let version = '1.0.0';
  try {
    const pubspecContent = readFileSync(join(MobileDir, 'pubspec.yaml'), 'utf8');
    const versionMatch = pubspecContent.match(/^version:\s*([^\s#]+)/m);
    if (versionMatch) {
      version = versionMatch[1].split('+')[0];
    }
  } catch (err) {
    log(`⚠️ Warning: Could not read version from pubspec.yaml, using default: ${version}`, COLORS.yellow);
  }

  const originalApkPath = join(MobileDir, 'build/app/outputs/flutter-apk/app-release.apk');
  const customApkName = `harikerja-v${version}.apk`;
  const customApkPath = join(MobileDir, 'build/app/outputs/flutter-apk', customApkName);

  try {
    copyFileSync(originalApkPath, customApkPath);
    log('\n✅ APK Build Successful!', COLORS.green);
    log(`📍 Output path: ${customApkPath}`, COLORS.cyan);
  } catch (err) {
    throw new Error(`Failed to copy and rename build output to ${customApkName}: ${err.message}`);
  }
}

main().catch((err) => {
  log(`FATAL ERROR: ${err.message}`, COLORS.red);
  process.exit(1);
});
