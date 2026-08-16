import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { validateJudgeIsolation, validateLocalStackServices } from './lib/local-stack-contract.mjs';

const runnerDir = resolve(import.meta.dirname, '../services/runner');
const command = spawnSync(process.platform === 'win32' ? 'docker.exe' : 'docker', ['compose', '--env-file', '.env', '-f', 'compose.production-like.yml', 'config', '--services'], {
  cwd: runnerDir, encoding: 'utf8',
});
if (command.status !== 0) {
  process.stderr.write(command.stderr || 'Unable to render production-like Compose configuration.\n');
  process.exit(command.status ?? 1);
}
const services = command.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const result = validateLocalStackServices(services);
const isolation=validateJudgeIsolation(await readFile(resolve(runnerDir,'docker-compose.yml'),'utf8'));
process.stdout.write(`${JSON.stringify({ version: 1, services, ...result,judgeIsolation:isolation }, null, 2)}\n`);
if (!result.ok||!isolation.ok) process.exitCode = 1;
