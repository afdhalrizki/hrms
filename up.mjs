import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { 
  log, COLORS, spawnStream, getDockerComposeCommand 
} from './scripts/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RootDir = resolve(__dirname);

async function main() {
  const args = process.argv.slice(2);
  
  // Parse environment
  const envs = ["dev", "qa", "staging", "prod"];
  const envName = args.find(a => envs.includes(a)) || "dev";
  
  // Parse flags
  const down = args.includes('--down') || args.includes('down');
  const logs = args.includes('--logs') || args.includes('logs');
  const build = args.includes('--build') || args.includes('build');

  let envFile = "deploy/environments/.env.local";
  if (envName === "qa") envFile = "deploy/environments/.env.qa";
  else if (envName === "staging") envFile = "deploy/environments/.env.staging";
  else if (envName === "prod") envFile = "deploy/environments/.env.production";

  const envPath = join(RootDir, envFile);
  if (!existsSync(envPath)) {
    log(`❌ ERROR: Environment file not found at ${envPath}`, COLORS.red);
    process.exit(1);
  }

  const composeCmd = await getDockerComposeCommand();
  if (!composeCmd) {
    log("❌ ERROR: Neither docker-compose nor docker compose found.", COLORS.red);
    process.exit(1);
  }

  if (down) {
    log(`Stopping all HRMS [${envName}] containers...`, COLORS.yellow);
    const code = await spawnStream(composeCmd, ['--env-file', envFile, 'down'], { cwd: RootDir });
    process.exit(code);
  }

  if (logs) {
    log(`Viewing logs for HRMS [${envName}]...`, COLORS.cyan);
    const code = await spawnStream(composeCmd, ['--env-file', envFile, 'logs', '-f'], { cwd: RootDir });
    process.exit(code);
  }

  const buildFlag = build ? ["--build"] : [];
  log(`Starting HRMS Platform in [${envName}] mode using [${envFile}]...`, COLORS.cyan);
  
  const upArgs = ['--env-file', envFile, 'up', '-d', ...buildFlag];
  const code = await spawnStream(composeCmd, upArgs, { cwd: RootDir });

  if (code === 0) {
    log("System is coming up...", COLORS.green);
    log(`To view logs, run: node up.mjs ${envName} logs`, COLORS.white);
  } else {
    log(`❌ ERROR: Failed to start containers (Exit Code: ${code})`, COLORS.red);
  }

  process.exit(code);
}

main().catch(console.error);
