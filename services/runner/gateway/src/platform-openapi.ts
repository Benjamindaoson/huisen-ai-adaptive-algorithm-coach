import { capabilityResponseSchema } from './platform-contract.js';

const errorEnvelope = {
  type: 'object', additionalProperties: false, required: ['version', 'error'], properties: {
    version: { const: 1 }, error: { type: 'object', required: ['code', 'message', 'traceId'], properties: { code: { type: 'string' }, message: { type: 'string' }, traceId: { type: 'string' } } },
  },
};
const jsonBody = { content: { 'application/json': { schema: { type: 'object' } } } };
const errors = { '400': { description: 'Invalid request', ...jsonBody }, '401': { description: 'Authentication required', ...jsonBody }, '403': { description: 'Forbidden', ...jsonBody }, '409': { description: 'Version or idempotency conflict', ...jsonBody }, '503': { description: 'Dependency unavailable', ...jsonBody } };
const ownerParameters = [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[A-Za-z0-9._:-]{1,200}$' } }];
const submissionIdParameter = [{ name: 'id', in: 'path', required: true, schema: { type: 'string', minLength: 1, maxLength: 200 } }];
const durableSubmission = {
  type: 'object', additionalProperties: false,
  required: ['id', 'problemId', 'problemVersionId', 'status', 'submittedAt', 'passedCount', 'totalCount', 'revision'],
  properties: {
    id: { type: 'string' }, problemId: { type: 'string' }, problemVersionId: { type: 'string' },
    status: { enum: ['queued', 'running', 'cancelled', 'passed', 'failed', 'error'] },
    submittedAt: { type: 'integer' }, completedAt: { type: 'integer' }, passedCount: { type: 'integer', minimum: 0 }, totalCount: { type: 'integer', minimum: 0 },
    timeMs: { type: 'integer', minimum: 0 }, error: { type: 'string' }, revision: { type: 'integer', minimum: 1 },
  },
};
const judgingMetrics = {
  type: 'object', additionalProperties: false,
  required: ['total', 'queued', 'running', 'cancelled', 'passed', 'failed', 'error', 'saturation', 'oldestQueueAgeMs', 'averageRuntimeMs', 'executionTimeMs', 'estimatedCostMicros', 'retries'],
  properties: Object.fromEntries(['total', 'queued', 'running', 'cancelled', 'passed', 'failed', 'error', 'saturation', 'oldestQueueAgeMs', 'averageRuntimeMs', 'executionTimeMs', 'estimatedCostMicros', 'retries'].map((key) => [key, { type: 'integer', minimum: 0 }])),
};

export const platformOpenApi = {
  openapi: '3.1.0',
  info: { title: 'OD Learning Platform API', version: '1.0.0', description: 'Versioned production identity, learning synchronization and capability contract.' },
  servers: [{ url: '/' }],
  paths: {
    '/api/v1/capabilities': { get: { operationId: 'getCapabilities', responses: { '200': { description: 'Runtime capabilities', content: { 'application/json': { schema: { $ref: '#/components/schemas/CapabilityResponse' } } } } } } },
    '/api/v1/auth/register': { post: { operationId: 'register', requestBody: { required: true, ...jsonBody }, responses: { '201': { description: 'Account created; verification dispatched', ...jsonBody }, ...errors } } },
    '/api/v1/auth/verify': { post: { operationId: 'verifyEmail', requestBody: { required: true, ...jsonBody }, responses: { '200': { description: 'Email verified', ...jsonBody }, ...errors } } },
    '/api/v1/auth/sessions': { post: { operationId: 'createSession', requestBody: { required: true, ...jsonBody }, responses: { '201': { description: 'HttpOnly cookie session and in-memory CSRF credential created', ...jsonBody }, ...errors } } },
    '/api/v1/auth/session': { get: { operationId: 'getSession', security: [{ cookieSession: [] }], responses: { '200': { description: 'Current account session', ...jsonBody } } } },
    '/api/v1/auth/sessions/refresh': { post: { operationId: 'rotateSession', security: [{ cookieSession: [], csrf: [] }], responses: { '200': { description: 'Rotated session', ...jsonBody }, ...errors } } },
    '/api/v1/auth/sessions/current': { delete: { operationId: 'revokeSession', security: [{ cookieSession: [], csrf: [] }], responses: { '204': { description: 'Session revoked' }, ...errors } } },
    '/api/v1/auth/recovery': { post: { operationId: 'requestRecovery', requestBody: { required: true, ...jsonBody }, responses: { '200': { description: 'Enumeration-safe acceptance', ...jsonBody }, ...errors } } },
    '/api/v1/auth/recovery/complete': { post: { operationId: 'completeRecovery', requestBody: { required: true, ...jsonBody }, responses: { '200': { description: 'Password replaced and sessions revoked', ...jsonBody }, ...errors } } },
    '/api/v1/auth/anonymous/claim': { post: { operationId: 'claimAnonymousLearning', security: [{ cookieSession: [], csrf: [] }], requestBody: { required: true, ...jsonBody }, responses: { '200': { description: 'Idempotent ownership reconciliation receipt', ...jsonBody }, ...errors } } },
    '/api/v1/learners/{id}/bootstrap': { get: { operationId: 'bootstrapLearning', parameters: ownerParameters, security: [{ cookieSession: [] }], responses: { '200': { description: 'Authoritative learning snapshot', ...jsonBody }, ...errors } } },
    '/api/v1/learners/{id}/sync': { get: { operationId: 'syncLearningEvents', parameters: [...ownerParameters, { name: 'after', in: 'query', schema: { type: 'integer', minimum: 0 } }], security: [{ cookieSession: [] }], responses: { '200': { description: 'Incremental semantic events', ...jsonBody }, ...errors } } },
    '/api/v1/learners/{id}/profile': { put: { operationId: 'putLearnerProfile', parameters: ownerParameters, security: [{ cookieSession: [], csrf: [] }], requestBody: { required: true, ...jsonBody }, responses: { '200': { description: 'Profile persisted', ...jsonBody }, ...errors } } },
    '/api/v1/learners/{id}/events': { post: { operationId: 'appendLearningEvent', parameters: ownerParameters, security: [{ cookieSession: [], csrf: [] }], requestBody: { required: true, ...jsonBody }, responses: { '201': { description: 'Event created', ...jsonBody }, '200': { description: 'Idempotent replay', ...jsonBody }, ...errors } } },
    '/api/v1/learners/{id}/states/{kind}': { put: { operationId: 'putLearningState', parameters: [...ownerParameters, { name: 'kind', in: 'path', required: true, schema: { enum: ['drafts', 'progress', 'practice', 'exam'] } }], security: [{ cookieSession: [], csrf: [] }], requestBody: { required: true, ...jsonBody }, responses: { '200': { description: 'Monotonic state version created', ...jsonBody }, ...errors } } },
    '/api/v1/learners/{id}/attempts': { post: { operationId: 'appendAttempt', parameters: ownerParameters, security: [{ cookieSession: [], csrf: [] }], requestBody: { required: true, ...jsonBody }, responses: { '201': { description: 'Immutable attempt created', ...jsonBody }, '200': { description: 'Idempotent replay', ...jsonBody }, ...errors } } },
    '/api/v1/learners/{id}/export': { get: { operationId: 'exportLearner', parameters: ownerParameters, security: [{ cookieSession: [] }], responses: { '200': { description: 'Portable learner export', ...jsonBody }, ...errors } } },
    '/api/v1/learners/{id}': { delete: { operationId: 'deleteLearner', parameters: ownerParameters, security: [{ cookieSession: [], csrf: [] }], responses: { '204': { description: 'Learner data deleted and audit retained' }, ...errors } } },
    '/api/v1/submissions': { post: { operationId: 'createDurableSubmission', security: [{ cookieSession: [], csrf: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['problemVersionId', 'language', 'sourceCode', 'idempotencyKey'], properties: { problemVersionId: { type: 'string' }, language: { enum: ['python', 'javascript', 'java', 'cpp'] }, sourceCode: { type: 'string', minLength: 1, maxLength: 50000 }, idempotencyKey: { type: 'string' } } } } } }, responses: { '202': { description: 'Immutable submission accepted', content: { 'application/json': { schema: { $ref: '#/components/schemas/DurableSubmission' } } } }, ...errors } } },
    '/api/v1/submissions/{id}': {
      get: { operationId: 'getDurableSubmission', parameters: submissionIdParameter, security: [{ cookieSession: [] }], responses: { '200': { description: 'Aggregate-only submission status', content: { 'application/json': { schema: { $ref: '#/components/schemas/DurableSubmission' } } } }, '404': { description: 'Submission not found', ...jsonBody }, ...errors } },
      delete: { operationId: 'cancelDurableSubmission', parameters: submissionIdParameter, security: [{ cookieSession: [], csrf: [] }], responses: { '200': { description: 'Queued or running submission cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/DurableSubmission' } } } }, '404': { description: 'Submission not found', ...jsonBody }, ...errors } },
    },
    '/api/v1/operations/judging/metrics': { get: { operationId: 'getJudgingMetrics', security: [{ cookieSession: [] }], 'x-required-role': 'admin', responses: { '200': { description: 'Redacted queue, verdict and runtime telemetry', content: { 'application/json': { schema: { $ref: '#/components/schemas/JudgingMetrics' } } } }, ...errors } } },
    '/api/v1/judge-packs/available': { get: { operationId: 'listAvailableJudgePacks', security: [{ cookieSession: [] }], responses: { '200': { description: 'Identifiers and trust levels only; no hidden cases', ...jsonBody }, ...errors } } },
  },
  components: {
    securitySchemes: { cookieSession: { type: 'apiKey', in: 'cookie', name: 'od_session' }, csrf: { type: 'apiKey', in: 'header', name: 'x-csrf-token' } },
    schemas: { ErrorEnvelope: errorEnvelope, CapabilityResponse: capabilityResponseSchema, DurableSubmission: durableSubmission, JudgingMetrics: judgingMetrics },
  },
} as const;
