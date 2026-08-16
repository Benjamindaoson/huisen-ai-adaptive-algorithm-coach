import { evaluateContainmentProbes } from './lib/judge-containment.mjs';

const baseUrl = (process.env.GATEWAY_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
async function run(sourceCode, timeoutMs = 25_000) {
  const response = await fetch(`${baseUrl}/run`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({ language: 'python', sourceCode, stdin: '' }),
  });
  if (!response.ok) throw new Error(`Containment probe failed: HTTP ${response.status}`);
  return response.json();
}

const [timeout, network, environment] = await Promise.all([
  run('while True:\n    pass\n'),
  run('import socket\ntry:\n    socket.create_connection(("1.1.1.1", 53), 1)\n    print("NETWORK_OK")\nexcept Exception:\n    print("NETWORK_BLOCKED")\n'),
  run('import os\nmarkers=("POSTGRES", "REDIS", "MINIO", "DEEPSEEK", "SECRET", "PASSWORD", "TOKEN_PEPPER")\nprint(sum(any(marker in key.upper() for marker in markers) for key in os.environ))\n'),
]);
const report = { version: 1, generatedAt: new Date().toISOString(), ...evaluateContainmentProbes({ timeout, network, environment }), probes: { timeout: timeout.kind, network: network.kind, environment: environment.kind } };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
