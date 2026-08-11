import { describe, expect, it } from 'vitest';
import { createLearnerIdentityService } from './learner-identity.js';

describe('signed learner identity', () => {
  it('issues an expiring token bound to exactly one learner', () => {
    const identity = createLearnerIdentityService({ secret: 'a-secure-test-secret-with-32-bytes', now: () => new Date('2026-08-11T00:00:00Z'), ttlSeconds: 600 });
    const issued = identity.issue('device-abc');
    expect(issued).toMatchObject({ learnerId: 'device-abc', mode: 'signed', expiresAt: '2026-08-11T00:10:00.000Z' });
    expect(identity.verify(`Bearer ${issued.token}`, 'device-abc')).toBe(true);
    expect(identity.verify(`Bearer ${issued.token}`, 'device-other')).toBe(false);
  });

  it('rejects tampering, malformed headers, and expiry', () => {
    let now = new Date('2026-08-11T00:00:00Z');
    const identity = createLearnerIdentityService({ secret: 'a-secure-test-secret-with-32-bytes', now: () => now, ttlSeconds: 60 });
    const issued = identity.issue('device-abc');
    expect(identity.verify(`Bearer ${issued.token}x`, 'device-abc')).toBe(false);
    expect(identity.verify(issued.token, 'device-abc')).toBe(false);
    now = new Date('2026-08-11T00:02:00Z');
    expect(identity.verify(`Bearer ${issued.token}`, 'device-abc')).toBe(false);
  });

  it('reports permissive-local explicitly when no secret is configured', () => {
    const identity = createLearnerIdentityService({});
    expect(identity.mode).toBe('permissive-local');
    expect(identity.verify(undefined, 'device-abc')).toBe(true);
    expect(identity.issue('device-abc')).toMatchObject({ mode: 'permissive-local', token: '' });
  });
});
