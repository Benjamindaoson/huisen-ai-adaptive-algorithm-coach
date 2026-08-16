import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AccountIdentityService, AuthenticatedAccount } from './identity/account-identity.js';
import {
  LEARNING_STATE_KINDS, LearningConflictError, type AttemptRecord, type AuthoritativeLearningStore, type LearningStateKind,
} from './postgres-learning-store.js';
import { validateLearnerId, validateLearnerProfile, validateLearningEvent, validateLearningEventsBatch } from './learning-validation.js';

function objectBody(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid learning request');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new Error('Invalid learning request');
  return body;
}
function cookie(request: FastifyRequest): string {
  for (const part of (request.headers.cookie ?? '').split(';')) { const [key, ...rest] = part.trim().split('='); if (key === 'od_session') return decodeURIComponent(rest.join('=')); }
  return '';
}
function csrf(request: FastifyRequest): string { return typeof request.headers['x-csrf-token'] === 'string' ? request.headers['x-csrf-token'] : ''; }
function safePayload(value: unknown, depth = 0): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 20) throw new Error('Invalid learning state payload');
  if (JSON.stringify(value).length > 256 * 1024) throw new Error('Invalid learning state payload');
  for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid learning state payload');
    if (item && typeof item === 'object' && !Array.isArray(item)) safePayload(item, depth + 1);
  }
  return structuredClone(value as Record<string, unknown>);
}
function timestamp(value: unknown): string { if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error('Invalid timestamp'); return value; }
function stateKind(value: unknown): LearningStateKind { if (typeof value !== 'string' || !LEARNING_STATE_KINDS.includes(value as LearningStateKind)) throw new Error('Invalid learning state kind'); return value as LearningStateKind; }
function attempt(learnerId: string, value: unknown): AttemptRecord {
  const body = objectBody(value, ['id', 'problemId', 'language', 'outcome', 'assisted', 'sourceHash', 'createdAt']);
  const id = (field: unknown) => typeof field === 'string' && /^[A-Za-z0-9._:-]{1,200}$/.test(field);
  if (!id(body.id) || !id(body.problemId) || typeof body.language !== 'string' || !['python', 'javascript', 'java', 'cpp'].includes(body.language) ||
    typeof body.outcome !== 'string' || body.outcome.length > 100 || typeof body.assisted !== 'boolean' ||
    typeof body.sourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(body.sourceHash) || typeof body.createdAt !== 'string' || Number.isNaN(Date.parse(body.createdAt))) throw new Error('Invalid attempt');
  return { learnerId, ...body } as AttemptRecord;
}

export function registerAuthoritativeLearningRoutes(app: FastifyInstance, store: AuthoritativeLearningStore, identity: AccountIdentityService) {
  async function authorize(request: FastifyRequest, reply: FastifyReply, learnerId: string, write: boolean): Promise<AuthenticatedAccount | null> {
    let account: AuthenticatedAccount | null;
    try { account = write ? await identity.authenticateWithCsrf(cookie(request), csrf(request)) : await identity.authenticate(cookie(request)); }
    catch { return reply.code(403).send({ error: { code: 'invalid-session-or-csrf' } }) as never; }
    if (!account) return reply.code(401).send({ error: { code: 'authentication-required' } }) as never;
    const roles = write ? ['admin'] as const : ['reviewer', 'admin'] as const;
    if (!identity.authorize(account, learnerId, [...roles])) return reply.code(403).send({ error: { code: 'forbidden' } }) as never;
    return account;
  }
  function failure(reply: FastifyReply, error: unknown) {
    if (error instanceof LearningConflictError) return reply.code(409).send({ error: { code: 'version-conflict', currentVersion: error.currentVersion } });
    if (error instanceof Error && /^(Invalid|Unsupported)/.test(error.message)) return reply.code(400).send({ error: { code: 'invalid-request', message: error.message } });
    return reply.code(503).send({ error: { code: 'learning-service-unavailable' } });
  }

  app.get<{ Params: { id: string } }>('/api/v1/learners/:id/bootstrap', async (request, reply) => {
    try { const learnerId = validateLearnerId(request.params.id); if (!await authorize(request, reply, learnerId, false)) return; return store.bootstrap(learnerId); }
    catch (error) { return failure(reply, error); }
  });
  app.get<{ Params: { id: string }; Querystring: { after?: string } }>('/api/v1/learners/:id/sync', async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id); if (!await authorize(request, reply, learnerId, false)) return;
      const after = Number(request.query.after ?? 0); if (!Number.isInteger(after) || after < 0) throw new Error('Invalid sync cursor');
      return store.listEventsAfter(learnerId, after);
    } catch (error) { return failure(reply, error); }
  });
  app.put<{ Params: { id: string } }>('/api/v1/learners/:id/profile', async (request, reply) => {
    try { const learnerId = validateLearnerId(request.params.id); if (!await authorize(request, reply, learnerId, true)) return; return store.putProfile(validateLearnerProfile(learnerId, request.body)); }
    catch (error) { return failure(reply, error); }
  });
  app.post<{ Params: { id: string } }>('/api/v1/learners/:id/events', async (request, reply) => {
    try { const learnerId = validateLearnerId(request.params.id); if (!await authorize(request, reply, learnerId, true)) return; const result = await store.appendEvent(validateLearningEvent(learnerId, request.body)); return reply.code(result.created ? 201 : 200).send(result.event); }
    catch (error) { return failure(reply, error); }
  });
  app.post<{ Params: { id: string } }>('/api/v1/learners/:id/events/batch', async (request, reply) => {
    try { const learnerId = validateLearnerId(request.params.id); if (!await authorize(request, reply, learnerId, true)) return; return store.appendEvents(validateLearningEventsBatch(learnerId, request.body)); }
    catch (error) { return failure(reply, error); }
  });
  app.put<{ Params: { id: string; kind: string } }>('/api/v1/learners/:id/states/:kind', async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id); const kind = stateKind(request.params.kind); if (!await authorize(request, reply, learnerId, true)) return;
      const body = objectBody(request.body, ['expectedVersion', 'payload', 'updatedAt']);
      if (!Number.isInteger(body.expectedVersion) || Number(body.expectedVersion) < 0) throw new Error('Invalid expected version');
      return await store.putState({ learnerId, kind, expectedVersion: Number(body.expectedVersion), payload: safePayload(body.payload), updatedAt: timestamp(body.updatedAt) });
    } catch (error) {
      if (error instanceof LearningConflictError) {
        const learnerId = validateLearnerId(request.params.id); const kind = stateKind(request.params.kind);
        return reply.code(409).send({ error: { code: 'version-conflict', currentVersion: error.currentVersion }, state: await store.getState(learnerId, kind) });
      }
      return failure(reply, error);
    }
  });
  app.post<{ Params: { id: string } }>('/api/v1/learners/:id/attempts', async (request, reply) => {
    try { const learnerId = validateLearnerId(request.params.id); if (!await authorize(request, reply, learnerId, true)) return; const result = await store.putAttempt(attempt(learnerId, request.body)); return reply.code(result.created ? 201 : 200).send(result.attempt); }
    catch (error) { return failure(reply, error); }
  });
  app.get<{ Params: { id: string } }>('/api/v1/learners/:id/export', async (request, reply) => {
    try { const learnerId = validateLearnerId(request.params.id); if (!await authorize(request, reply, learnerId, false)) return; return reply.header('content-disposition', `attachment; filename="${learnerId}-learning-export.json"`).send(await store.exportLearner(learnerId)); }
    catch (error) { return failure(reply, error); }
  });
  app.delete<{ Params: { id: string } }>('/api/v1/learners/:id', async (request, reply) => {
    try { const learnerId = validateLearnerId(request.params.id); if (!await authorize(request, reply, learnerId, true)) return; await store.deleteLearner(learnerId, new Date().toISOString()); return reply.code(204).send(); }
    catch (error) { return failure(reply, error); }
  });
}
