import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { runLearningAgent, type AgentRun } from './agent-runtime.js';
import { createProviderAgentPolicy } from './agent-policy-provider.js';
import { defaultAgentEvidence, validateAgentRequest, type AgentApiRequest } from './agent-validation.js';
import type { LearningEvidenceItem } from './learning-retrieval.js';
import { diagnoseWithProvider, type ProviderDiagnosis } from './coach-provider.js';
import { validateCoachRequest, type CoachRequest } from './coach-validation.js';
import { executeRun } from './judge0.js';
import { lookupHiddenTests } from './hidden-tests.js';
import { buildAgentPlan } from './learning-orchestrator.js';
import { createLearningStore, type LearningStore } from './learning-store.js';
import { validateLearningEvent, validateLearningEventsBatch, validateLearnerId, validateLearnerProfile, validatePlanRequest } from './learning-validation.js';
import { createSubmissionService, type SubmissionService } from './submissions.js';
import { validateRunRequest } from './validation.js';
import { createLearnerIdentityService, type LearnerIdentityService } from './learner-identity.js';
import { loadCorpusRetriever, type CorpusRetriever } from './mentor/corpus-retrieval.js';
import { createDeepSeekMentorProvider, resolveDeepSeekConfig, type MentorModelAdapter } from './mentor/deepseek-provider.js';
import { runMentorTurn, type MentorRuntimeOptions, type MentorTurnInput, type MentorTurnResult } from './mentor/mentor-engine.js';
import type { MentorStore } from './mentor/mentor-store.js';
import { validateMentorStartRequest, validateMentorTurnRequest } from './mentor/mentor-validation.js';
import { loadTrustedExpectationResolver } from './mentor/trusted-expectations.js';
import { createReferenceConsensusOracle } from './mentor/reference-consensus-oracle.js';
import { createCorpusReferenceSolutionRepository } from './mentor/reference-solution-repository.js';
import { createTieredExpectationResolver } from './mentor/tiered-expectation-resolver.js';
import { createConfiguredMentorStore } from './mentor/configured-mentor-store.js';
import { createQualityReviewStore, type QualityReviewStore } from './quality-review-store.js';
import { runExamAgentTurn } from './exam-agent-runtime.js';
import { validateContentExecution } from './content-execution.js';
import { validateMentorOSCommand, validateMentorOSStart } from './mentor-os/contracts.js';
import { createMentorOSStore, type MentorOSStore } from './mentor-os/store.js';
import { executeMentorOSAct } from './mentor-os/runtime.js';
import { requestEditApproval, resolveEditApproval } from './mentor-os/approval.js';
import { compileMentorContext } from './mentor-os/context-compiler.js';
import { buildCapabilities, capabilityResponseSchema, type RunnerCapability } from './platform-contract.js';
import { createAccountIdentityService, type AccountIdentityService } from './identity/account-identity.js';
import { createInMemoryAccountStore } from './identity/account-store.js';
import { registerAccountRoutes } from './identity/account-routes.js';
import type { AuthoritativeLearningStore } from './postgres-learning-store.js';
import { registerAuthoritativeLearningRoutes } from './authoritative-learning-routes.js';
import { platformOpenApi } from './platform-openapi.js';
import type { DurableSubmissionService } from './judging/durable-submission-service.js';
import { registerDurableSubmissionRoutes } from './judging/submission-routes.js';

type ServerDependencies = {
  executeRun?: typeof executeRun;
  diagnoseCoach?: (request: CoachRequest) => Promise<ProviderDiagnosis>;
  submissions?: SubmissionService;
  learningStore?: LearningStore;
  runAgent?: (request: Parameters<typeof runLearningAgent>[0]) => Promise<AgentRun>;
  resolveAgentEvidence?: (request: AgentApiRequest) => LearningEvidenceItem[];
  mentorStore?: MentorStore;
  mentorRetriever?: CorpusRetriever;
  mentorModel?: MentorModelAdapter | null;
  runMentor?: (request: MentorTurnInput, options: MentorRuntimeOptions) => Promise<MentorTurnResult>;
  mentorExpectedFor?: MentorRuntimeOptions['expectedFor'];
  learnerIdentity?: LearnerIdentityService;
  qualityReviewStore?: QualityReviewStore;
  qualityGate?: QualityGateSummary | null;
  mentorOSStore?: MentorOSStore;
  capabilityProbe?: () => Promise<{ runner: RunnerCapability }>;
  accountIdentity?: AccountIdentityService;
  authoritativeLearningStore?: AuthoritativeLearningStore;
  productionMode?: boolean;
  developmentIdentityTokenFor?: (recipient: string, purpose: 'verification' | 'recovery') => string | undefined;
  durableSubmissions?: DurableSubmissionService;
};

type QualityGateSummary = { passed: boolean; eligibleRealCaseCount: number; minimumEligibleRealCases: number; failures: string[] };

async function loadQualityGateSummary(filePath: string): Promise<QualityGateSummary | null> {
  try {
    const report = JSON.parse(await readFile(filePath, 'utf8')) as { eligibleRealCaseCount?: unknown; releaseGate?: { passed?: unknown; minimumEligibleRealCases?: unknown; failures?: unknown } };
    if (typeof report.eligibleRealCaseCount !== 'number' || typeof report.releaseGate?.passed !== 'boolean' || typeof report.releaseGate.minimumEligibleRealCases !== 'number' ||
      !Array.isArray(report.releaseGate.failures) || report.releaseGate.failures.some((item) => typeof item !== 'string')) return null;
    return { passed: report.releaseGate.passed, eligibleRealCaseCount: report.eligibleRealCaseCount, minimumEligibleRealCases: report.releaseGate.minimumEligibleRealCases, failures: report.releaseGate.failures };
  } catch { return null; }
}

function learningFailure(reply: FastifyReply, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/^(Invalid|Unsupported)/.test(message)) return reply.code(400).send({ error: message });
  return reply.code(503).send({ error: 'Learning service unavailable' });
}

export function buildServer(dependencies: ServerDependencies = {}) {
  const app = Fastify({ bodyLimit: 80 * 1024, logger: false });
  const run = dependencies.executeRun ?? executeRun;
  const diagnoseCoach = dependencies.diagnoseCoach ?? diagnoseWithProvider;
  const submissions = dependencies.submissions ?? createSubmissionService({ lookupTests: lookupHiddenTests, execute: run });
  const learningStore = dependencies.learningStore ?? createLearningStore({ filePath: process.env.LEARNING_DATA_FILE?.trim() || undefined });
  const agentPolicy = process.env.AI_API_URL?.trim() && process.env.AI_MODEL?.trim()
    ? createProviderAgentPolicy({ apiUrl: process.env.AI_API_URL.trim(), apiKey: process.env.AI_API_KEY?.trim() ?? '', model: process.env.AI_MODEL.trim() })
    : undefined;
  const runAgent = dependencies.runAgent ?? ((request) => runLearningAgent(request, { ...(agentPolicy ? { policy: agentPolicy } : {}) }));
  const resolveAgentEvidence = dependencies.resolveAgentEvidence ?? defaultAgentEvidence;
  const mentorStore = dependencies.mentorStore ?? createConfiguredMentorStore({ env: process.env, filePath: process.env.MENTOR_DATA_FILE?.trim() || undefined });
  const learnerIdentity = dependencies.learnerIdentity ?? createLearnerIdentityService({ secret: process.env.MENTOR_AUTH_SECRET });
  const accountIdentity = dependencies.accountIdentity ?? createAccountIdentityService({ store: createInMemoryAccountStore() });
  const productionMode = dependencies.productionMode ?? process.env.APP_ENV === 'production';
  const qualityReviewStore = dependencies.qualityReviewStore ?? createQualityReviewStore({ filePath: process.env.QUALITY_REVIEW_DATA_FILE?.trim() || undefined });
  const mentorOSStore = dependencies.mentorOSStore ?? createMentorOSStore({ filePath: process.env.MENTOR_OS_DATA_FILE?.trim() || undefined });
  const qualityGatePromise = dependencies.qualityGate !== undefined
    ? Promise.resolve(dependencies.qualityGate)
    : loadQualityGateSummary(process.env.QUALITY_REPORT_FILE?.trim() || fileURLToPath(new URL('../../../../docs/quality/mentor-diagnosis-v2-report.json', import.meta.url)));
  const deepSeekConfig = resolveDeepSeekConfig(process.env);
  const mentorModel = dependencies.mentorModel === null ? undefined : dependencies.mentorModel ?? (deepSeekConfig ? createDeepSeekMentorProvider(deepSeekConfig) : undefined);
  let mentorRetrieverPromise: Promise<CorpusRetriever> | undefined;
  const getMentorRetriever = () => {
    mentorRetrieverPromise ??= dependencies.mentorRetriever
      ? Promise.resolve(dependencies.mentorRetriever)
      : loadCorpusRetriever(fileURLToPath(new URL('../../../../content/mentor-index.json', import.meta.url)));
    return mentorRetrieverPromise;
  };
  const runMentor = dependencies.runMentor ?? runMentorTurn;
  const capabilityProbe = dependencies.capabilityProbe ?? (async () => ({ runner: process.env.JUDGE0_URL?.trim() ? 'ready' as const : 'unavailable' as const }));
  let trustedExpectationsPromise: ReturnType<typeof loadTrustedExpectationResolver> | undefined;
  let tieredExpectationsPromise: Promise<ReturnType<typeof createTieredExpectationResolver>> | undefined;
  const mentorExpectedFor: NonNullable<MentorRuntimeOptions['expectedFor']> = dependencies.mentorExpectedFor ?? (async ({ problem, candidate }) => {
    tieredExpectationsPromise ??= (async () => {
      trustedExpectationsPromise ??= loadTrustedExpectationResolver(fileURLToPath(new URL('../../../../content/verified-public-cases.json', import.meta.url)));
      const reviewed = await trustedExpectationsPromise;
      const repository = createCorpusReferenceSolutionRepository(fileURLToPath(new URL('../../../../content/problems', import.meta.url)));
      const consensus = createReferenceConsensusOracle({
        repository,
        execute: ({ language, sourceCode, candidateInput }) => run({ language, sourceCode, stdin: candidateInput }),
      });
      return createTieredExpectationResolver({ reviewed, consensus: ({ problemId, candidate }) => consensus.resolve({ problemId, candidate }) });
    })();
    return (await tieredExpectationsPromise)({ problemId: problem.id, candidate });
  });
  const allowedOrigins = process.env.RUNNER_ALLOWED_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const learningRateLimit = { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } } as const;
  void app.register(cors, { origin: allowedOrigins?.length ? allowedOrigins : false, credentials: true, methods: ['POST', 'GET', 'PUT', 'DELETE'] });
  void app.register(rateLimit, { max: 10, timeWindow: '1 minute' });

  registerAccountRoutes(app, accountIdentity, {
    secureCookie: process.env.COOKIE_SECURE === 'true' || process.env.APP_ENV === 'production',
    ...(dependencies.authoritativeLearningStore ? { onAnonymousClaim: (claim: { userId: string; anonymousLearnerId: string; idempotencyKey: string; claimedAt: string }) => dependencies.authoritativeLearningStore!.claimLearner(claim.anonymousLearnerId, claim.userId, claim.idempotencyKey, claim.claimedAt) } : {}),
    ...(!productionMode && dependencies.developmentIdentityTokenFor ? { developmentTokenFor: dependencies.developmentIdentityTokenFor } : {}),
  });
  if (dependencies.authoritativeLearningStore) registerAuthoritativeLearningRoutes(app, dependencies.authoritativeLearningStore, accountIdentity);
  if (dependencies.durableSubmissions) registerDurableSubmissionRoutes(app, dependencies.durableSubmissions, accountIdentity);

  const accountCookie = (request: FastifyRequest) => {
    for (const part of (request.headers.cookie ?? '').split(';')) { const [key, ...rest] = part.trim().split('='); if (key === 'od_session') return decodeURIComponent(rest.join('=')); }
    return '';
  };
  const authorize = async (request: FastifyRequest, reply: FastifyReply, learnerId: string): Promise<boolean> => {
    const account = await accountIdentity.authenticate(accountCookie(request));
    if (account) {
      if (accountIdentity.authorize(account, learnerId, ['reviewer', 'admin'])) return true;
      void reply.code(403).send({ error: 'Learner access forbidden' }); return false;
    }
    if (!productionMode && learnerIdentity.verify(request.headers.authorization, learnerId)) return true;
    void reply.code(401).send({ error: 'Learner authorization required' }); return false;
  };
  const requireRole = async (request: FastifyRequest, reply: FastifyReply, roles: Array<'reviewer' | 'admin'>): Promise<boolean> => {
    if (!productionMode) return true;
    const account = await accountIdentity.authenticate(accountCookie(request));
    if (!account) { void reply.code(401).send({ error: 'Account authorization required' }); return false; }
    if (!account.roles.some((role) => roles.includes(role as 'reviewer' | 'admin'))) { void reply.code(403).send({ error: 'Role access forbidden' }); return false; }
    return true;
  };
  const mentorResponse = (result: MentorTurnResult) => ({ ...result, platform: { storage: mentorStore.mode, identity: learnerIdentity.mode } });
  const mentorPricing = {
    inputMicrosPerMillionTokens: Math.max(0, Number(process.env.DEEPSEEK_INPUT_MICROS_PER_MILLION_TOKENS ?? 0) || 0),
    outputMicrosPerMillionTokens: Math.max(0, Number(process.env.DEEPSEEK_OUTPUT_MICROS_PER_MILLION_TOKENS ?? 0) || 0),
  };

  app.get('/healthz', async () => ({ ok: true, mentor: { storage: mentorStore.mode, identity: learnerIdentity.mode, model: mentorModel?.model ?? 'deterministic' } }));
  app.get('/api/v1/openapi.json', async () => platformOpenApi);
  app.get('/api/v1/capabilities', { schema: { response: { 200: capabilityResponseSchema } } }, async () => {
    const [probe, qualityGate] = await Promise.all([capabilityProbe(), qualityGatePromise]);
    return buildCapabilities({
      identity: accountIdentity.mode === 'postgres' ? 'account-postgres' : learnerIdentity.mode,
      learningStorage: learningStore.mode,
      mentorStorage: mentorStore.mode,
      mentorRuntimeStorage: mentorOSStore.mode,
      mentorModel: mentorModel?.model ?? 'deterministic',
      runner: probe.runner,
      qualityGatePassed: qualityGate?.passed === true,
    });
  });
  app.get('/quality/workbench', learningRateLimit, async (_request, reply) => {
    try {
      if (!await requireRole(_request, reply, ['reviewer', 'admin'])) return;
      const [comparisons, teacherReviews, adjudicationQueue, calibrations, qualityGate] = await Promise.all([
        qualityReviewStore.listComparisons(), qualityReviewStore.listTeacherReviews(), qualityReviewStore.listAdjudicationQueue(), qualityReviewStore.listCalibrations(), qualityGatePromise,
      ]);
      return { comparisons, teacherReviews, adjudicationQueue, calibrations, qualityGate, storage: qualityReviewStore.mode };
    } catch (error) { return learningFailure(reply, error, 'Quality workbench unavailable'); }
  });
  app.post('/quality/comparisons', learningRateLimit, async (request, reply) => {
    try { if (!await requireRole(request, reply, ['reviewer', 'admin'])) return; return reply.code(201).send(await qualityReviewStore.putComparison(request.body as never)); }
    catch (error) { return learningFailure(reply, error, 'Invalid quality comparison'); }
  });
  app.post('/quality/reviews', learningRateLimit, async (request, reply) => {
    try { if (!await requireRole(request, reply, ['reviewer', 'admin'])) return; return reply.code(201).send(await qualityReviewStore.submitTeacherReview(request.body as never)); }
    catch (error) { return learningFailure(reply, error, 'Invalid teacher quality review'); }
  });
  app.post('/quality/model-judgments', learningRateLimit, async (request, reply) => {
    try { if (!await requireRole(request, reply, ['admin'])) return; return reply.code(201).send(await qualityReviewStore.submitModelJudgment(request.body as never)); }
    catch (error) { return learningFailure(reply, error, 'Invalid model quality judgment'); }
  });
  app.post('/exam-agent/turn', learningRateLimit, async (request, reply) => {
    try {
      return await runExamAgentTurn(request.body as never, { execute: run, ...(mentorModel ? { model: mentorModel } : {}) });
    } catch (error) { return learningFailure(reply, error, 'Invalid exam agent request'); }
  });
  app.post('/content/validate-execution', learningRateLimit, async (request, reply) => {
    try { return await validateContentExecution(request.body as never, run); }
    catch (error) { return learningFailure(reply, error, 'Invalid generated content execution request'); }
  });
  app.post('/auth/anonymous', learningRateLimit, async (request, reply) => {
    try {
      if (productionMode) return reply.code(403).send({ error: 'Legacy anonymous identity is disabled' });
      if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) throw new Error('Invalid learner credential request');
      const value = request.body as Record<string, unknown>;
      if (value.version !== 1 || typeof value.learnerId !== 'string' || Object.keys(value).some((key) => !['version', 'learnerId'].includes(key))) throw new Error('Invalid learner credential request');
      return reply.code(201).send(learnerIdentity.issue(validateLearnerId(value.learnerId)));
    } catch (error) { return learningFailure(reply, error, 'Invalid learner credential request'); }
  });
  app.post('/mentor-os/runs', learningRateLimit, async (request, reply) => {
    try {
      const input = validateMentorOSStart(request.body);
      if (!await authorize(request, reply, input.learnerId)) return;
      return reply.code(201).send(await mentorOSStore.start(input));
    } catch (error) { return learningFailure(reply, error, 'Invalid Mentor OS start request'); }
  });
  app.get<{ Params: { id: string }; Querystring: { learnerId?: string; after?: string } }>('/mentor-os/runs/:id', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.query.learnerId);
      if (!await authorize(request, reply, learnerId)) return;
      const run = await mentorOSStore.get(request.params.id);
      if (!run || run.learnerId !== learnerId) return reply.code(404).send({ error: 'Mentor OS run not found' });
      if (request.query.after !== undefined) {
        const cursor = Number(request.query.after);
        if (!Number.isInteger(cursor) || cursor < 0) throw new Error('Invalid event cursor');
        return { runId: run.id, checkpoint: run.checkpoint, events: await mentorOSStore.eventsAfter(run.id, cursor) };
      }
      return run;
    } catch (error) { return learningFailure(reply, error, 'Invalid Mentor OS run request'); }
  });
  app.get<{ Params: { id: string }; Querystring: { learnerId?: string; after?: string } }>('/mentor-os/runs/:id/events', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.query.learnerId);
      if (!await authorize(request, reply, learnerId)) return;
      const run = await mentorOSStore.get(request.params.id);
      if (!run || run.learnerId !== learnerId) return reply.code(404).send({ error: 'Mentor OS run not found' });
      const cursor = Number(request.query.after ?? 0);
      if (!Number.isInteger(cursor) || cursor < 0) throw new Error('Invalid event cursor');
      const events = await mentorOSStore.eventsAfter(run.id, cursor);
      const body = events.map((event) => `id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n`).join('\n') + `\nevent: checkpoint\ndata: ${JSON.stringify(run.checkpoint)}\n\n`;
      return reply.header('cache-control', 'no-cache').type('text/event-stream; charset=utf-8').send(body);
    } catch (error) { return learningFailure(reply, error, 'Invalid Mentor OS event stream request'); }
  });
  app.post<{ Params: { id: string } }>('/mentor-os/runs/:id/commands', learningRateLimit, async (request, reply) => {
    try {
      const input = validateMentorOSCommand(request.body) as Record<string, unknown>;
      if (input.runId !== request.params.id) throw new Error('Mentor OS run mismatch');
      const osRun = await mentorOSStore.get(request.params.id);
      if (!osRun) return reply.code(404).send({ error: 'Mentor OS run not found' });
      if (!await authorize(request, reply, osRun.learnerId)) return;
      if (input.kind === 'act') {
        const mentorCore = typeof input.mentorSessionId === 'string' ? validateMentorTurnRequest(input.mentorInput) : validateMentorStartRequest(input.mentorInput);
        const mentorSession = typeof input.mentorSessionId === 'string' ? await mentorStore.getSession(input.mentorSessionId, osRun.learnerId) : null;
        if (typeof input.mentorSessionId === 'string' && !mentorSession) return reply.code(404).send({ error: 'Mentor session not found' });
        const mentorInput: MentorTurnInput = { ...mentorCore, ...(mentorSession ? { session: mentorSession } : {}) };
        if (mentorInput.learnerId !== osRun.learnerId) throw new Error('Mentor OS learner mismatch');
        return executeMentorOSAct({
          store: mentorOSStore, runId: osRun.id, expectedSequence: Number(input.expectedSequence), idempotencyKey: String(input.idempotencyKey),
          assessment: String(input.assessment ?? 'learning') as 'learning', context: Array.isArray(input.context) ? input.context as never[] : [], mentorInput,
          pricing: mentorPricing,
          runTurn: async (turnInput) => {
            const initialTwin = await mentorStore.getTwin(turnInput.learnerId) ?? await mentorStore.migrateLearningEvents(turnInput.learnerId, await learningStore.listEvents(turnInput.learnerId));
            const result = await runMentor(turnInput, { retriever: await getMentorRetriever(), ...(mentorModel ? { model: mentorModel } : {}), initialTwin, expectedFor: mentorExpectedFor, executeSubmission: ({ language, sourceCode, candidateInput }) => run({ language, sourceCode, stdin: candidateInput }) });
            await mentorStore.putSession(result.session);
            return mentorResponse(result);
          },
        });
      }
      if (input.kind === 'propose-edit') return requestEditApproval(mentorOSStore, osRun.id, { id: String(input.approvalId), expectedSequence: Number(input.expectedSequence), summary: String(input.detail ?? ''), diff: String(input.diff ?? ''), evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs.map(String) : [] });
      if (input.kind === 'approve') return resolveEditApproval(mentorOSStore, osRun.id, { approvalId: String(input.approvalId), expectedSequence: Number(input.expectedSequence), decision: input.decision === 'accept' ? 'accept' : 'reject', evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs.map(String) : [] });
      if (input.kind === 'contribute-context') {
        const compiled = compileMentorContext(Array.isArray(input.context) ? input.context : [], { maxItems: 16, maxCharacters: 12_000 });
        return mentorOSStore.commit(osRun.id, { idempotencyKey: String(input.idempotencyKey), expectedSequence: Number(input.expectedSequence), type: 'context-compiled', detail: `已编译 ${compiled.items.length} 项页面证据；省略 ${compiled.omitted.reduce((sum, item) => sum + item.count, 0)} 项。`, evidenceRefs: compiled.evidenceRefs });
      }
      const stopReason = typeof input.stopReason === 'string' ? input.stopReason as never : undefined;
      const type = input.kind === 'approve' ? 'approval-resolved' : input.kind === 'stop' ? 'stopped' : input.kind === 'act' ? 'tool-started' : 'context-compiled';
      return await mentorOSStore.commit(osRun.id, { idempotencyKey: String(input.idempotencyKey), expectedSequence: Number(input.expectedSequence), type, detail: typeof input.detail === 'string' ? input.detail : String(input.kind), evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs.map(String) : [], ...(stopReason ? { stopReason } : {}) });
    } catch (error) { return learningFailure(reply, error, 'Invalid Mentor OS command'); }
  });
  app.post('/mentor/sessions', learningRateLimit, async (request, reply) => {
    try {
      const input = validateMentorStartRequest(request.body);
      if (!await authorize(request, reply, input.learnerId)) return;
      const existingTwin = await mentorStore.getTwin(input.learnerId);
      const initialTwin = existingTwin ?? await mentorStore.migrateLearningEvents(input.learnerId, await learningStore.listEvents(input.learnerId));
      const result = await runMentor(input, {
        retriever: await getMentorRetriever(), ...(mentorModel ? { model: mentorModel } : {}), initialTwin,
        expectedFor: mentorExpectedFor,
        executeSubmission: ({ language, sourceCode, candidateInput }) => run({ language, sourceCode, stdin: candidateInput }),
        ...(process.env.JUDGE0_URL ? { executeInstrumented: ({ language, instrumentedSource, candidateInput }: Parameters<NonNullable<MentorRuntimeOptions['executeInstrumented']>>[0]) => run({ language, sourceCode: instrumentedSource, stdin: candidateInput }) } : {}),
      });
      await mentorStore.putSession(result.session);
      return reply.code(201).send(mentorResponse(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid Mentor request';
      if (/^(Invalid|Unsupported)|exceeds/.test(message)) return reply.code(400).send({ error: message });
      return reply.code(503).send({ error: 'Mentor service unavailable' });
    }
  });
  app.post<{ Params: { id: string } }>('/mentor/sessions/:id/turns', learningRateLimit, async (request, reply) => {
    try {
      const input = validateMentorTurnRequest(request.body);
      if (!await authorize(request, reply, input.learnerId)) return;
      const session = await mentorStore.getSession(request.params.id, input.learnerId);
      if (!session) return reply.code(404).send({ error: 'Mentor session not found' });
      const result = await runMentor({ ...input, session }, {
        retriever: await getMentorRetriever(), ...(mentorModel ? { model: mentorModel } : {}),
        expectedFor: mentorExpectedFor,
        executeSubmission: ({ language, sourceCode, candidateInput }) => run({ language, sourceCode, stdin: candidateInput }),
        ...(process.env.JUDGE0_URL ? { executeInstrumented: ({ language, instrumentedSource, candidateInput }: Parameters<NonNullable<MentorRuntimeOptions['executeInstrumented']>>[0]) => run({ language, sourceCode: instrumentedSource, stdin: candidateInput }) } : {}),
      });
      await mentorStore.putSession(result.session);
      return mentorResponse(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid Mentor request';
      if (/^(Invalid|Unsupported)|exceeds/.test(message)) return reply.code(400).send({ error: message });
      return reply.code(503).send({ error: 'Mentor service unavailable' });
    }
  });
  app.get<{ Params: { id: string }; Querystring: { learnerId?: string } }>('/mentor/sessions/:id', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.query.learnerId);
      if (!await authorize(request, reply, learnerId)) return;
      const session = await mentorStore.getSession(request.params.id, learnerId);
      return session ?? reply.code(404).send({ error: 'Mentor session not found' });
    } catch (error) { return learningFailure(reply, error, 'Invalid Mentor session request'); }
  });
  app.get<{ Params: { id: string } }>('/learners/:id/profile', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!await authorize(request, reply, learnerId)) return;
      const profile = await learningStore.getProfile(learnerId);
      return profile ?? reply.code(404).send({ error: 'Learner profile not found' });
    } catch (error) { return learningFailure(reply, error, 'Invalid learner profile'); }
  });
  app.put<{ Params: { id: string } }>('/learners/:id/profile', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!await authorize(request, reply, learnerId)) return;
      return await learningStore.putProfile(validateLearnerProfile(learnerId, request.body));
    }
    catch (error) { return learningFailure(reply, error, 'Invalid learner profile'); }
  });
  app.get<{ Params: { id: string } }>('/learners/:id/events', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!await authorize(request, reply, learnerId)) return;
      return await learningStore.listEvents(learnerId);
    }
    catch (error) { return learningFailure(reply, error, 'Invalid learning event'); }
  });
  app.post<{ Params: { id: string } }>('/learners/:id/events', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!await authorize(request, reply, learnerId)) return;
      const result = await learningStore.appendEvent(validateLearningEvent(learnerId, request.body));
      return reply.code(result.created ? 201 : 200).send(result.event);
    } catch (error) { return learningFailure(reply, error, 'Invalid learning event'); }
  });
  app.post<{ Params: { id: string } }>('/learners/:id/events/batch', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!await authorize(request, reply, learnerId)) return;
      return await learningStore.appendEvents(validateLearningEventsBatch(learnerId, request.body));
    }
    catch (error) { return learningFailure(reply, error, 'Invalid learning event batch'); }
  });
  app.post('/agent/plan', learningRateLimit, async (request, reply) => {
    try {
      const planRequest = validatePlanRequest(request.body);
      if (!await authorize(request, reply, planRequest.learnerId)) return;
      const profile = await learningStore.getProfile(planRequest.learnerId);
      if (!profile) return reply.code(404).send({ error: 'Learner profile not found' });
      return buildAgentPlan(profile, await learningStore.listEvents(planRequest.learnerId), planRequest);
    } catch (error) { return learningFailure(reply, error, 'Invalid plan request'); }
  });
  app.post('/agent/run', learningRateLimit, async (request, reply) => {
    try {
      const agentRequest = validateAgentRequest(request.body);
      return await runAgent({ ...agentRequest, evidence: resolveAgentEvidence(agentRequest) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid agent request';
      if (/^(Invalid|Unsupported|Tool|Agent step)/.test(message)) return reply.code(400).send({ error: message });
      return reply.code(503).send({ error: 'Learning Agent unavailable' });
    }
  });
  app.post('/run', async (request, reply) => {
    try {
      const runRequest = validateRunRequest(request.body);
      return await run(runRequest);
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法处理运行请求';
      if (/Invalid run request|Unsupported language|must be a string|exceeds/.test(message)) return reply.code(400).send({ error: message });
      return reply.code(503).send({ kind: 'unavailable', stdout: '', stderr: '运行服务暂不可用，请稍后再试。' });
    }
  });
  app.post('/coach/diagnose', async (request, reply) => {
    try {
      const diagnosis = await diagnoseCoach(validateCoachRequest(request.body));
      return {
        source: diagnosis.source, safetyVersion: diagnosis.safetyVersion, focus: diagnosis.focus, action: diagnosis.action,
        hintLevel: diagnosis.hintLevel, confidence: diagnosis.confidence, judgeOutcome: diagnosis.judgeOutcome,
        ...(diagnosis.suggestedCode !== undefined ? { suggestedCode: diagnosis.suggestedCode } : {}),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法处理教练请求';
      if (['Coach provider verdict conflict', 'Coach provider unsafe output'].includes(message)) return reply.code(422).send({ error: 'model-unsafe-output' });
      if (/Invalid|Unsupported|Unknown|forbidden|requires|exceeds/.test(message)) return reply.code(400).send({ error: message });
      return reply.code(503).send({ error: '模型教练暂不可用，请使用本地证据诊断。' });
    }
  });
  app.post('/submissions', async (request, reply) => {
    try {
      const submission = submissions.submit(request.body as never);
      return reply.code(202).header('location', `/submissions/${submission.id}`).send(submission);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid submission request';
      if (/Invalid|Unknown|Unsupported|must be|exceeds/.test(message)) return reply.code(400).send({ error: message });
      return reply.code(503).send({ error: '隐藏判题服务暂不可用。' });
    }
  });
  app.get<{ Params: { id: string } }>('/submissions/:id', async (request, reply) => {
    const submission = submissions.get(request.params.id);
    return submission ?? reply.code(404).send({ error: 'Submission not found' });
  });
  return app;
}
