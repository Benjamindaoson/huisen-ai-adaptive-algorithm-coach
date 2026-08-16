const gateway = process.env.LEARNING_API_URL?.trim() || 'http://127.0.0.1:8787';
const objectStore = process.env.OBJECT_STORE_HEALTH_URL?.trim() || 'http://127.0.0.1:9000/minio/health/live';

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

const health = await getJson(`${gateway}/healthz`);
const capabilities = await getJson(`${gateway}/api/v1/capabilities`);
const objectResponse = await fetch(objectStore, { signal: AbortSignal.timeout(10_000) });
if (!objectResponse.ok) throw new Error(`Object store returned ${objectResponse.status}`);
const runResponse = await fetch(`${gateway}/run`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ language: 'javascript', sourceCode: 'console.log(42)', stdin: '' }),
  signal: AbortSignal.timeout(20_000),
});
const run = await runResponse.json();
if (!runResponse.ok || run.kind !== 'success' || run.stdout.trim() !== '42') throw new Error(`Runner smoke failed: ${JSON.stringify(run)}`);
process.stdout.write(`${JSON.stringify({ version: 1, health, capabilities, objectStore: 'ready', runner: 'ready' }, null, 2)}\n`);
