import { describe, expect, it } from 'vitest';
import { buildCapabilities, platformError, validateIdempotencyKey } from './platform-contract.js';
import { buildServer } from './server.js';
import { createLearnerIdentityService } from './learner-identity.js';
import { createLearningStore } from './learning-store.js';

describe('v1 platform contract', () => {
  it('reports each backend capability without treating degraded dependencies as ready', () => {
    expect(buildCapabilities({
      identity: 'permissive-local', learningStorage: 'memory', mentorStorage: 'file-local',
      mentorRuntimeStorage: 'file-local', mentorModel: 'deepseek-v4-flash', runner: 'unavailable', qualityGatePassed: false,
    })).toEqual({
      version: 1, status: 'degraded',
      capabilities: {
        identity: { status: 'local-only', mode: 'permissive-local' },
        learning: { status: 'local-only', storage: 'memory' },
        runner: { status: 'unavailable' },
        mentor: { status: 'experimental', storage: 'file-local', runtimeStorage: 'file-local', model: 'deepseek-v4-flash' },
      },
    });
  });

  it('uses one non-leaking error envelope and validates bounded idempotency keys', () => {
    expect(platformError('invalid-request', 'Request body is invalid', 'trace-1')).toEqual({
      version: 1, error: { code: 'invalid-request', message: 'Request body is invalid', traceId: 'trace-1' },
    });
    expect(validateIdempotencyKey('attempt:abc-123')).toBe('attempt:abc-123');
    expect(() => validateIdempotencyKey('')).toThrow('Invalid idempotency key');
    expect(() => validateIdempotencyKey('secret value')).toThrow('Invalid idempotency key');
  });

  it('serves the versioned capability route with a response schema', async () => {
    const app = buildServer({
      learnerIdentity: createLearnerIdentityService(),
      learningStore: createLearningStore(),
      capabilityProbe: async () => ({ runner: 'unavailable' }),
      qualityGate: { passed: false, eligibleRealCaseCount: 0, minimumEligibleRealCases: 100, failures: [] },
    });
    const response = await app.inject({ method: 'GET', url: '/api/v1/capabilities' });
    await app.close();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ version: 1, status: 'degraded', capabilities: { runner: { status: 'unavailable' } } });
  });

  it('publishes an OpenAPI contract for identity, learning and durable judging APIs', async () => {
    const app = buildServer();
    const response = await app.inject({ method: 'GET', url: '/api/v1/openapi.json' });
    await app.close();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: '3.1.0', info: { title: 'OD Learning Platform API' },
      paths: {
        '/api/v1/auth/sessions': { post: expect.any(Object) },
        '/api/v1/learners/{id}/bootstrap': { get: expect.any(Object) },
        '/api/v1/learners/{id}/states/{kind}': { put: expect.any(Object) },
        '/api/v1/submissions': { post: expect.any(Object) },
        '/api/v1/submissions/{id}': { get: expect.any(Object), delete: expect.any(Object) },
        '/api/v1/operations/judging/metrics': { get: expect.any(Object) },
      },
      components: { schemas: { ErrorEnvelope: expect.any(Object), CapabilityResponse: expect.any(Object), DurableSubmission: expect.any(Object), JudgingMetrics: expect.any(Object) } },
    });
  });

  it('allows credentialed requests only from configured browser origins', async () => {
    const previous = process.env.RUNNER_ALLOWED_ORIGIN; process.env.RUNNER_ALLOWED_ORIGIN = 'http://127.0.0.1:4178';
    const app = buildServer();
    const allowed = await app.inject({ method: 'GET', url: '/api/v1/capabilities', headers: { origin: 'http://127.0.0.1:4178' } });
    const denied = await app.inject({ method: 'GET', url: '/api/v1/capabilities', headers: { origin: 'https://evil.example' } });
    await app.close(); if (previous === undefined) delete process.env.RUNNER_ALLOWED_ORIGIN; else process.env.RUNNER_ALLOWED_ORIGIN = previous;
    expect(allowed.headers['access-control-allow-origin']).toBe('http://127.0.0.1:4178');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
