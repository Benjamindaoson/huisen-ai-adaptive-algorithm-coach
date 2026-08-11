import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { fileURLToPath } from 'node:url';
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
};

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
  void app.register(cors, { origin: allowedOrigins?.length ? allowedOrigins : false, methods: ['POST', 'GET', 'PUT'] });
  void app.register(rateLimit, { max: 10, timeWindow: '1 minute' });

  const authorize = (request: FastifyRequest, reply: FastifyReply, learnerId: string): boolean => {
    if (learnerIdentity.verify(request.headers.authorization, learnerId)) return true;
    void reply.code(401).send({ error: 'Learner authorization required' });
    return false;
  };
  const mentorResponse = (result: MentorTurnResult) => ({ ...result, platform: { storage: mentorStore.mode, identity: learnerIdentity.mode } });

  app.get('/healthz', async () => ({ ok: true, mentor: { storage: mentorStore.mode, identity: learnerIdentity.mode, model: mentorModel?.model ?? 'deterministic' } }));
  app.post('/auth/anonymous', learningRateLimit, async (request, reply) => {
    try {
      if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) throw new Error('Invalid learner credential request');
      const value = request.body as Record<string, unknown>;
      if (value.version !== 1 || typeof value.learnerId !== 'string' || Object.keys(value).some((key) => !['version', 'learnerId'].includes(key))) throw new Error('Invalid learner credential request');
      return reply.code(201).send(learnerIdentity.issue(validateLearnerId(value.learnerId)));
    } catch (error) { return learningFailure(reply, error, 'Invalid learner credential request'); }
  });
  app.post('/mentor/sessions', learningRateLimit, async (request, reply) => {
    try {
      const input = validateMentorStartRequest(request.body);
      if (!authorize(request, reply, input.learnerId)) return;
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
      if (!authorize(request, reply, input.learnerId)) return;
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
      if (!authorize(request, reply, learnerId)) return;
      const session = await mentorStore.getSession(request.params.id, learnerId);
      return session ?? reply.code(404).send({ error: 'Mentor session not found' });
    } catch (error) { return learningFailure(reply, error, 'Invalid Mentor session request'); }
  });
  app.get<{ Params: { id: string } }>('/learners/:id/profile', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!authorize(request, reply, learnerId)) return;
      const profile = await learningStore.getProfile(learnerId);
      return profile ?? reply.code(404).send({ error: 'Learner profile not found' });
    } catch (error) { return learningFailure(reply, error, 'Invalid learner profile'); }
  });
  app.put<{ Params: { id: string } }>('/learners/:id/profile', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!authorize(request, reply, learnerId)) return;
      return await learningStore.putProfile(validateLearnerProfile(learnerId, request.body));
    }
    catch (error) { return learningFailure(reply, error, 'Invalid learner profile'); }
  });
  app.get<{ Params: { id: string } }>('/learners/:id/events', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!authorize(request, reply, learnerId)) return;
      return await learningStore.listEvents(learnerId);
    }
    catch (error) { return learningFailure(reply, error, 'Invalid learning event'); }
  });
  app.post<{ Params: { id: string } }>('/learners/:id/events', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!authorize(request, reply, learnerId)) return;
      const result = await learningStore.appendEvent(validateLearningEvent(learnerId, request.body));
      return reply.code(result.created ? 201 : 200).send(result.event);
    } catch (error) { return learningFailure(reply, error, 'Invalid learning event'); }
  });
  app.post<{ Params: { id: string } }>('/learners/:id/events/batch', learningRateLimit, async (request, reply) => {
    try {
      const learnerId = validateLearnerId(request.params.id);
      if (!authorize(request, reply, learnerId)) return;
      return await learningStore.appendEvents(validateLearningEventsBatch(learnerId, request.body));
    }
    catch (error) { return learningFailure(reply, error, 'Invalid learning event batch'); }
  });
  app.post('/agent/plan', learningRateLimit, async (request, reply) => {
    try {
      const planRequest = validatePlanRequest(request.body);
      if (!authorize(request, reply, planRequest.learnerId)) return;
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
