import { afterEach, expect, it } from 'vitest';
import { buildServer } from './server.js';
import { startGateway } from './startup.js';

const servers: ReturnType<typeof buildServer>[] = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

it('starts a real HTTP listener on the requested host and an available port', async () => {
  const app = buildServer();
  servers.push(app);
  await startGateway({ app, port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  expect(address).toMatchObject({ address: '127.0.0.1' });
  expect(typeof address === 'object' && address && address.port).toBeGreaterThan(0);
  if (typeof address !== 'object' || !address) throw new Error('Gateway did not expose a TCP address');
  const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ ok: true, mentor: { storage: 'file-local', identity: 'permissive-local' } });
});
