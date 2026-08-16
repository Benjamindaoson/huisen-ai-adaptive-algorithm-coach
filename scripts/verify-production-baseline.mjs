import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildProductionBaseline } from './lib/production-baseline.mjs';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, process.argv[2] ?? 'docs/quality/production-baseline.json');

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

async function gatewayJson(path) {
  const baseUrl = process.env.LEARNING_API_URL?.trim() || 'http://127.0.0.1:8787';
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, { signal: AbortSignal.timeout(2_000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

const report = buildProductionBaseline({
  catalog: await readJson('content/index.json'),
  hiddenTestSource: await readFile(resolve(root, 'services/runner/gateway/src/hidden-tests.ts'), 'utf8'),
  mentorReport: await readJson('docs/quality/mentor-diagnosis-v2-report.json'),
  frontendEnv: process.env,
  gatewayHealth: await gatewayJson('/healthz'),
  gatewayCapabilities: await gatewayJson('/api/v1/capabilities'),
  generatedAt: new Date().toISOString(),
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
