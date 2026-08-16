import { describe, expect, it, vi } from 'vitest';
import { createIdentityNotifier } from './identity-delivery.js';

describe('identity delivery adapter', () => {
  it('requires an HTTPS authenticated delivery webhook in production', () => {
    expect(() => createIdentityNotifier({ APP_ENV: 'production' })).toThrow(/IDENTITY_DELIVERY_WEBHOOK_URL/);
    expect(() => createIdentityNotifier({ APP_ENV: 'production', IDENTITY_DELIVERY_WEBHOOK_URL: 'http://mail.local', IDENTITY_DELIVERY_WEBHOOK_SECRET: 'x'.repeat(32) })).toThrow(/HTTPS/);
  });

  it('delivers verification material server-to-server without logging it', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 202 }));
    const notify = createIdentityNotifier({
      APP_ENV: 'production', IDENTITY_DELIVERY_WEBHOOK_URL: 'https://mail.example.com/identity', IDENTITY_DELIVERY_WEBHOOK_SECRET: 's'.repeat(32),
    }, fetcher);
    await notify({ purpose: 'verification', recipient: 'learner@example.com', token: 'opaque-secret-token' });
    expect(fetcher).toHaveBeenCalledWith('https://mail.example.com/identity', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ authorization: `Bearer ${'s'.repeat(32)}` }),
      body: JSON.stringify({ version: 1, purpose: 'verification', recipient: 'learner@example.com', token: 'opaque-secret-token' }),
    }));
  });
});
