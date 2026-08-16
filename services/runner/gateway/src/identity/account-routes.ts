import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AccountIdentityService } from './account-identity.js';

const SESSION_COOKIE = 'od_session';

function objectBody(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowed.includes(key))) throw new Error('Invalid request');
  return record;
}

function requiredString(value: unknown, field: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${field}`);
  return value;
}

function cookie(request: FastifyRequest, name: string): string {
  const raw = request.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function sessionCookie(token: string, secure: boolean, maxAge = 7 * 24 * 60 * 60): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function authFailure(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : 'Identity operation failed';
  if (message === 'Account already exists') return reply.code(409).send({ error: 'account-exists' });
  if (message === 'Invalid credentials' || message === 'Email verification required') return reply.code(401).send({ error: 'invalid-credentials' });
  if (message === 'Invalid session' || message === 'Invalid csrf token') return reply.code(403).send({ error: 'invalid-session-or-csrf' });
  if (/^Invalid|Password/.test(message)) return reply.code(400).send({ error: 'invalid-request' });
  return reply.code(503).send({ error: 'identity-service-unavailable' });
}

export function registerAccountRoutes(app: FastifyInstance, identity: AccountIdentityService, options: {
  secureCookie: boolean;
  onAnonymousClaim?: (input: { userId: string; anonymousLearnerId: string; idempotencyKey: string; claimedAt: string }) => Promise<unknown>;
  developmentTokenFor?: (recipient: string, purpose: 'verification' | 'recovery') => string | undefined;
}) {
  app.post('/api/v1/auth/register', async (request, reply) => {
    try {
      const body = objectBody(request.body, ['email', 'password']);
      const account = await identity.register({ email: requiredString(body.email, 'email', 254), password: requiredString(body.password, 'password', 200) });
      const developmentVerificationToken = options.developmentTokenFor?.(account.email, 'verification');
      return reply.code(201).send({ account, ...(developmentVerificationToken ? { developmentVerificationToken } : {}) });
    } catch (error) { return authFailure(reply, error); }
  });

  app.post('/api/v1/auth/verify', async (request, reply) => {
    try { const body = objectBody(request.body, ['token']); return { account: await identity.verifyEmail(requiredString(body.token, 'token')) }; }
    catch (error) { return authFailure(reply, error); }
  });

  app.post('/api/v1/auth/sessions', async (request, reply) => {
    try {
      const body = objectBody(request.body, ['email', 'password', 'deviceName']);
      const session = await identity.signIn({
        email: requiredString(body.email, 'email', 254), password: requiredString(body.password, 'password', 200),
        deviceName: body.deviceName === undefined ? 'Web browser' : requiredString(body.deviceName, 'deviceName', 120),
      });
      return reply.code(201).header('set-cookie', sessionCookie(session.sessionToken, options.secureCookie))
        .send({ account: { id: session.userId, roles: session.roles }, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
    } catch (error) { return authFailure(reply, error); }
  });

  app.get('/api/v1/auth/session', async (request) => {
    const account = await identity.authenticate(cookie(request, SESSION_COOKIE));
    return account ? { authenticated: true, account: { id: account.userId, roles: account.roles } } : { authenticated: false };
  });

  app.post('/api/v1/auth/sessions/csrf', async (request, reply) => {
    try { return await identity.issueCsrf(cookie(request, SESSION_COOKIE)); }
    catch (error) { return authFailure(reply, error); }
  });

  app.post('/api/v1/auth/sessions/refresh', async (request, reply) => {
    try {
      const session = await identity.rotate(cookie(request, SESSION_COOKIE), requiredString(request.headers['x-csrf-token'], 'csrf token'));
      return reply.header('set-cookie', sessionCookie(session.sessionToken, options.secureCookie))
        .send({ account: { id: session.userId, roles: session.roles }, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
    } catch (error) { return authFailure(reply, error); }
  });

  app.delete('/api/v1/auth/sessions/current', async (request, reply) => {
    try {
      await identity.revoke(cookie(request, SESSION_COOKIE), requiredString(request.headers['x-csrf-token'], 'csrf token'));
      return reply.code(204).header('set-cookie', sessionCookie('', options.secureCookie, 0)).send();
    } catch (error) { return authFailure(reply, error); }
  });

  app.post('/api/v1/auth/recovery', async (request, reply) => {
    try { const body = objectBody(request.body, ['email']); return await identity.requestRecovery(requiredString(body.email, 'email', 254)); }
    catch (error) { return authFailure(reply, error); }
  });

  app.post('/api/v1/auth/recovery/complete', async (request, reply) => {
    try {
      const body = objectBody(request.body, ['token', 'password']);
      return await identity.completeRecovery(requiredString(body.token, 'token'), requiredString(body.password, 'password', 200));
    } catch (error) { return authFailure(reply, error); }
  });

  app.post('/api/v1/auth/anonymous/claim', async (request, reply) => {
    try {
      const account = await identity.authenticate(cookie(request, SESSION_COOKIE));
      if (!account) return reply.code(401).send({ error: 'authentication-required' });
      const body = objectBody(request.body, ['anonymousLearnerId', 'idempotencyKey']);
      const anonymousLearnerId = requiredString(body.anonymousLearnerId, 'anonymous learner id', 200);
      const idempotencyKey = requiredString(body.idempotencyKey, 'idempotency key', 200);
      const claim = await identity.claimAnonymous(account.userId, anonymousLearnerId, idempotencyKey);
      const reconciliation = options.onAnonymousClaim ? await options.onAnonymousClaim(claim) : undefined;
      return { ...claim, ...(reconciliation ? { reconciliation } : {}) };
    } catch (error) { return authFailure(reply, error); }
  });
}
