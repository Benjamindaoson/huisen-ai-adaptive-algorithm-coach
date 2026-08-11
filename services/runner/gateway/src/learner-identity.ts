import { createHmac, timingSafeEqual } from 'node:crypto';

export type LearnerIdentityMode = 'signed' | 'permissive-local';
export type LearnerCredential = { version: 1; learnerId: string; token: string; expiresAt: string; mode: LearnerIdentityMode };
export type LearnerIdentityService = {
  readonly mode: LearnerIdentityMode;
  issue(learnerId: string): LearnerCredential;
  verify(authorization: string | undefined, expectedLearnerId: string): boolean;
};

type TokenPayload = { version: 1; sub: string; iat: number; exp: number };

function validLearnerId(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,200}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase());
}

export function createLearnerIdentityService(options: { secret?: string; now?: () => Date; ttlSeconds?: number } = {}): LearnerIdentityService {
  const secret = options.secret?.trim() ?? '';
  if (secret && secret.length < 32) throw new Error('MENTOR_AUTH_SECRET must contain at least 32 characters');
  const now = options.now ?? (() => new Date());
  const ttlSeconds = Math.max(60, Math.min(options.ttlSeconds ?? 7 * 24 * 60 * 60, 30 * 24 * 60 * 60));
  const mode: LearnerIdentityMode = secret ? 'signed' : 'permissive-local';
  const sign = (encoded: string) => createHmac('sha256', secret).update(encoded).digest('base64url');
  return {
    mode,
    issue(learnerId) {
      if (!validLearnerId(learnerId)) throw new Error('Invalid learner id');
      const issuedAt = Math.floor(now().getTime() / 1_000);
      const payload: TokenPayload = { version: 1, sub: learnerId, iat: issuedAt, exp: issuedAt + ttlSeconds };
      const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
      return {
        version: 1, learnerId, mode, expiresAt: new Date(payload.exp * 1_000).toISOString(),
        token: mode === 'signed' ? `${encoded}.${sign(encoded)}` : '',
      };
    },
    verify(authorization, expectedLearnerId) {
      if (!validLearnerId(expectedLearnerId)) return false;
      if (mode === 'permissive-local') return true;
      const match = authorization?.match(/^Bearer\s+([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
      if (!match) return false;
      const [, encoded, signature] = match;
      const expected = Buffer.from(sign(encoded)); const actual = Buffer.from(signature);
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
      try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<TokenPayload>;
        const current = Math.floor(now().getTime() / 1_000);
        return payload.version === 1 && payload.sub === expectedLearnerId && Number.isInteger(payload.iat) && Number.isInteger(payload.exp)
          && (payload.iat as number) <= current + 60 && (payload.exp as number) > current;
      } catch { return false; }
    },
  };
}
