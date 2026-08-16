import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from './server.js';
import { createSubmissionService } from './submissions.js';
import { createLearningStore } from './learning-store.js';
import { createCorpusRetriever, type MentorRetrievalIndex } from './mentor/corpus-retrieval.js';
import { createMentorStore } from './mentor/mentor-store.js';
import { createLearnerIdentityService } from './learner-identity.js';
import { createQualityReviewStore } from './quality-review-store.js';

const servers: ReturnType<typeof buildServer>[] = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

function request() {
  return {
    version: 1, hintLevel: 1,
    problem: { id: 'p1', title: '题目', description: '描述', input: '', output: '' },
    attempt: { id: 'a1', language: 'python', outcome: 'wrong-answer', summary: '0/1', code: 'print(1)' },
    mastery: [],
  };
}

describe('coach route', () => {
  it('returns an injected structured diagnosis', async () => {
    const app = buildServer({ diagnoseCoach: async () => ({ source: 'model', safetyVersion: 1, focus: 'boundary', action: 'inspect-boundary', diagnosis: '边界错误', evidence: ['0/1'], hintLevel: 1, nextAction: '检查上界', confidence: 0.8, judgeOutcome: 'wrong-answer' }) });
    servers.push(app);
    const response = await app.inject({ method: 'POST', url: '/coach/diagnose', payload: request() });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ source: 'model', safetyVersion: 1, focus: 'boundary', action: 'inspect-boundary', judgeOutcome: 'wrong-answer' });
    expect(response.json()).not.toHaveProperty('diagnosis');
  });

  it('rejects hidden fields before invoking the provider', async () => {
    let called = false;
    const app = buildServer({ diagnoseCoach: async () => { called = true; throw new Error('unexpected'); } });
    servers.push(app);
    const response = await app.inject({ method: 'POST', url: '/coach/diagnose', payload: { ...request(), hiddenTests: [] } });
    expect(response.statusCode).toBe(400);
    expect(called).toBe(false);
  });

  it('returns a generic service error without leaking provider configuration', async () => {
    const app = buildServer({ diagnoseCoach: async () => { throw new Error('server-secret'); } });
    servers.push(app);
    const response = await app.inject({ method: 'POST', url: '/coach/diagnose', payload: request() });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('server-secret');
  });
});

describe('hidden submission routes', () => {
  it('accepts, polls and never returns private test contents', async () => {
    const submissions = createSubmissionService({
      lookupTests: () => [{ stdin: 'PRIVATE-INPUT', expectedOutput: 'PRIVATE-OUTPUT' }],
      execute: async () => ({ kind: 'success', stdout: 'PRIVATE-OUTPUT', stderr: '', timeMs: 7 }),
      createId: () => 'submission-1',
    });
    const app = buildServer({ submissions });
    servers.push(app);

    const accepted = await app.inject({ method: 'POST', url: '/submissions', payload: { problemId: 'p1', language: 'python', sourceCode: 'print(1)' } });
    expect(accepted.statusCode).toBe(202);
    expect(accepted.headers.location).toBe('/submissions/submission-1');
    await submissions.settle('submission-1');
    const polled = await app.inject({ method: 'GET', url: '/submissions/submission-1' });
    expect(polled.json()).toMatchObject({ status: 'passed', passedCount: 1, totalCount: 1 });
    expect(polled.body).not.toContain('PRIVATE-INPUT');
    expect(polled.body).not.toContain('PRIVATE-OUTPUT');
    expect(polled.body).not.toContain('print(1)');
  });

  it('rejects hidden fields and unknown submissions', async () => {
    const submissions = createSubmissionService({ lookupTests: () => [{ stdin: 'x', expectedOutput: 'y' }], execute: async () => ({ kind: 'success', stdout: 'y', stderr: '' }) });
    const app = buildServer({ submissions });
    servers.push(app);
    const rejected = await app.inject({ method: 'POST', url: '/submissions', payload: { problemId: 'p1', language: 'python', sourceCode: 'x', hiddenTests: [] } });
    expect(rejected.statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/submissions/missing' })).statusCode).toBe(404);
  });
});

describe('quality review routes', () => {
  it('loads server-backed comparisons and durably records a complete teacher review', async () => {
    const qualityReviewStore = createQualityReviewStore();
    const app = buildServer({ qualityReviewStore, qualityGate: { passed: false, eligibleRealCaseCount: 0, minimumEligibleRealCases: 100, failures: ['eligible-real-cases: 0/100'] } }); servers.push(app);
    const comparison = {
      id: 'cmp-1', datasetVersion: 'mentor-v2', caseId: 'case-1',
      evidence: {
        attempt: { id: 'attempt-1', sourceHash: 'a'.repeat(64), createdAt: '2026-08-12T00:00:00.000Z' },
        run: { outcome: 'wrong-answer', evidenceRefs: ['run:1'] },
        toolCalls: [{ name: 'run-sample', argumentsHash: 'b'.repeat(64), resultHash: 'c'.repeat(64) }],
        currentEditor: { sourceHash: 'd'.repeat(64) },
        diff: { stale: true, summary: 'changed', hunks: ['@@'] },
      },
      candidates: [
        { hash: 'e'.repeat(64), mentorVersion: 'a', text: '先预测。', evidenceRefs: ['run:1'] },
        { hash: 'f'.repeat(64), mentorVersion: 'b', text: '直接答案。', evidenceRefs: [] },
      ],
    };
    expect((await app.inject({ method: 'POST', url: '/quality/comparisons', payload: comparison })).statusCode).toBe(201);
    const listed = await app.inject({ method: 'GET', url: '/quality/workbench' });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toMatchObject({
      comparisons: [{ id: 'cmp-1', caseId: 'case-1' }], teacherReviews: [], adjudicationQueue: [], calibrations: [],
      qualityGate: { passed: false, eligibleRealCaseCount: 0, failures: ['eligible-real-cases: 0/100'] },
    });

    const submitted = await app.inject({ method: 'POST', url: '/quality/reviews', payload: {
      id: 'review-1', comparisonId: 'cmp-1', reviewerId: 'teacher-1', preferredHash: 'e'.repeat(64),
      rubric: { localization: true, cause: true, evidence: true, minimalHint: true, leakage: false },
      evidenceRefs: ['run:1'], notes: '', reviewedAt: '2026-08-12T01:00:00.000Z',
    } });
    expect(submitted.statusCode).toBe(201);
    expect((await app.inject({ method: 'GET', url: '/quality/workbench' })).json().teacherReviews).toHaveLength(1);
  });
});

  describe('AI collaboration exam route', () => {
  it('returns only server-executed agent evidence and reports unavailable without a configured model', async () => {
    const app = buildServer({ mentorModel: null }); servers.push(app);
    const response = await app.inject({ method: 'POST', url: '/exam-agent/turn', payload: {
      version: 1, sessionId: 'exam-1', phase: 'review',
      problem: { id: 'p1', title: '数组求和', description: '输出数组和', input: '整数', output: '总和' },
      answer: { language: 'python', sourceCode: 'print(0)' }, learnerPrompt: '检查代码',
    } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ mode: 'unavailable', executions: [], evidence: [] });
  });
  });

describe('generated content execution route', () => {
    it('executes every generated test on the server before validation', async () => {
      const executeRun = vi.fn(async (request: { stdin: string }) => ({ kind: 'success' as const, stdout: request.stdin, stderr: '', timeMs: 4 }));
      const app = buildServer({ executeRun: executeRun as never }); servers.push(app);
      const response = await app.inject({ method: 'POST', url: '/content/validate-execution', payload: {
        language: 'python', solution: 'print(input())', tests: [{ input: 'a\n', expectedOutput: 'a\n' }], constraints: { timeLimitMs: 1000, memoryLimitMb: 128 },
      } });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ passed: true, executedCount: 1 });
      expect(executeRun).toHaveBeenCalledOnce();
    });
  });

describe('Mentor OS routes', () => {
  it('starts, resumes, and idempotently commits an authenticated run', async () => {
    const learnerIdentity = createLearnerIdentityService({ secret: 'mentor-os-server-test-secret-32-bytes' });
    const app = buildServer({ learnerIdentity }); servers.push(app);
    const authorization = `Bearer ${learnerIdentity.issue('learner-os').token}`;
    const started = await app.inject({ method: 'POST', url: '/mentor-os/runs', headers: { authorization }, payload: { version: 1, learnerId: 'learner-os', goal: '掌握双指针', route: { kind: 'learn', ref: 'two-pointer' }, idempotencyKey: 'start-os' } });
    expect(started.statusCode).toBe(201);
    const run = started.json();
    const command = { version: 1, runId: run.id, idempotencyKey: 'cmd-os', kind: 'stop', expectedSequence: 1, stopReason: 'awaiting-learner', detail: '请预测指针状态' };
    const first = await app.inject({ method: 'POST', url: `/mentor-os/runs/${run.id}/commands`, headers: { authorization }, payload: command });
    const retry = await app.inject({ method: 'POST', url: `/mentor-os/runs/${run.id}/commands`, headers: { authorization }, payload: command });
    expect(first.json()).toEqual(retry.json());
    const resumed = await app.inject({ method: 'GET', url: `/mentor-os/runs/${run.id}?learnerId=learner-os&after=1`, headers: { authorization } });
    expect(resumed.json()).toMatchObject({ checkpoint: { stopReason: 'awaiting-learner' }, events: [{ sequence: 2 }] });
  });

  it('offers cursor-recoverable SSE lifecycle snapshots', async () => {
    const learnerIdentity = createLearnerIdentityService({ secret: 'mentor-os-sse-test-secret-32-bytes' });
    const app = buildServer({ learnerIdentity }); servers.push(app);
    const authorization = `Bearer ${learnerIdentity.issue('learner-sse').token}`;
    const started = await app.inject({ method: 'POST', url: '/mentor-os/runs', headers: { authorization }, payload: { version: 1, learnerId: 'learner-sse', goal: '完成今日学习', route: { kind: 'today', ref: 'daily' }, idempotencyKey: 'start-sse' } });
    const run = started.json();
    const response = await app.inject({ method: 'GET', url: `/mentor-os/runs/${run.id}/events?learnerId=learner-sse&after=0`, headers: { authorization } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.body).toContain('id: 1');
    expect(response.body).toContain('event: run-started');
  });
});

describe('learning and agent routes', () => {
  it('issues signed anonymous credentials and rejects missing or cross-learner ownership', async () => {
    const learnerIdentity = createLearnerIdentityService({ secret: 'a-secure-server-test-secret-32-bytes' });
    const learningStore = createLearningStore();
    const app = buildServer({ learnerIdentity, learningStore }); servers.push(app);
    const issued = await app.inject({ method: 'POST', url: '/auth/anonymous', payload: { version: 1, learnerId: 'learner-a' } });
    expect(issued.statusCode).toBe(201);
    expect(issued.json()).toMatchObject({ learnerId: 'learner-a', mode: 'signed' });
    const authorization = `Bearer ${issued.json().token}`;
    const body = { target: 'od-exam', examDate: null, dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-11T00:00:00Z' };
    expect((await app.inject({ method: 'PUT', url: '/learners/learner-a/profile', payload: body })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PUT', url: '/learners/learner-b/profile', headers: { authorization }, payload: body })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PUT', url: '/learners/learner-a/profile', headers: { authorization }, payload: body })).statusCode).toBe(200);
    const lessonEvent = { id: 'lesson-start-a', kind: 'lesson-started', data: { lessonId: 'input-output', stage: 'explain' }, createdAt: '2026-08-11T00:01:00Z' };
    expect((await app.inject({ method: 'POST', url: '/learners/learner-b/events', headers: { authorization }, payload: lessonEvent })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/learners/learner-a/events', headers: { authorization }, payload: lessonEvent })).statusCode).toBe(201);
    expect(await learningStore.listEvents('learner-a')).toMatchObject([{ kind: 'lesson-started', data: { lessonId: 'input-output' } }]);
  });
  it('runs the permissioned learning Agent and returns only executed tools', async () => {
    const app = buildServer({
      resolveAgentEvidence: () => [{
        ref: 'problem:od-array', kind: 'problem', title: '数组窗口', text: '连续数组窗口与输入边界',
        skillIds: ['array'], verification: 'candidate',
      }],
    });
    servers.push(app);
    const response = await app.inject({ method: 'POST', url: '/agent/run', payload: {
      version: 1, hintLevel: 1,
      problem: { id: 'od-array', title: '数组窗口', description: '连续数组', input: '第一行数量，第二行数组', output: '最大值', skillIds: ['array'] },
      attempt: { id: 'attempt-1', language: 'javascript', outcome: 'failed', summary: '0/2', code: "const a=require('fs').readFileSync(0,'utf8').split(' ');" },
      judge: { outcome: 'failed', passedCount: 0, totalCount: 2, evidenceRef: 'judge:od-array:public' },
      mastery: { prior: 0.25, observations: [{ kind: 'failure', evidenceRef: 'attempt:attempt-1' }] },
    } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ version: 1, mode: 'deterministic', judgeOutcome: 'failed' });
    expect(response.json().tools).toHaveLength(4);
    expect(response.json().tools.every((tool: { status: string }) => tool.status === 'completed')).toBe(true);
    expect(response.body).not.toContain("readFileSync(0,'utf8')");
  });

  it('rejects hidden evidence and malformed Agent requests before runtime execution', async () => {
    let called = false;
    const app = buildServer({ runAgent: async () => { called = true; throw new Error('unexpected'); } });
    servers.push(app);
    const response = await app.inject({ method: 'POST', url: '/agent/run', payload: {
      version: 1, hintLevel: 1, hiddenTests: [], problem: {}, attempt: {}, judge: {}, mastery: {},
    } });
    expect(response.statusCode).toBe(400);
    expect(called).toBe(false);
  });

  it('allows browser PUT preflights for profile synchronization', async () => {
    const previous = process.env.RUNNER_ALLOWED_ORIGIN;
    process.env.RUNNER_ALLOWED_ORIGIN = 'http://127.0.0.1:4173';
    const app = buildServer();
    servers.push(app);
    const response = await app.inject({
      method: 'OPTIONS', url: '/learners/learner-a/profile',
      headers: { origin: 'http://127.0.0.1:4173', 'access-control-request-method': 'PUT' },
    });
    if (previous === undefined) delete process.env.RUNNER_ALLOWED_ORIGIN; else process.env.RUNNER_ALLOWED_ORIGIN = previous;
    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('PUT');
  });

  it('accepts a comma-separated allowlist of local frontend origins', async () => {
    const previous = process.env.RUNNER_ALLOWED_ORIGIN;
    process.env.RUNNER_ALLOWED_ORIGIN = 'http://127.0.0.1:4173, http://127.0.0.1:4175';
    const app = buildServer();
    servers.push(app);
    const response = await app.inject({
      method: 'OPTIONS', url: '/mentor/sessions',
      headers: { origin: 'http://127.0.0.1:4175', 'access-control-request-method': 'POST' },
    });
    if (previous === undefined) delete process.env.RUNNER_ALLOWED_ORIGIN; else process.env.RUNNER_ALLOWED_ORIGIN = previous;
    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:4175');
  });

  it('returns 503 without leaking storage failures', async () => {
    const learningStore = createLearningStore();
    const app = buildServer({ learningStore: { ...learningStore, getProfile: async () => { throw new Error('disk-secret-path'); } } });
    servers.push(app);
    const response = await app.inject({ method: 'GET', url: '/learners/learner-a/profile' });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('disk-secret-path');
  });

  it('stores a learner profile and appends the same event once', async () => {
    const learningStore = createLearningStore();
    const app = buildServer({ learningStore });
    servers.push(app);
    const profile = await app.inject({ method: 'PUT', url: '/learners/learner-a/profile', payload: {
      target: 'od-exam', examDate: '2026-09-01', dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-11T00:00:00Z',
    } });
    expect(profile.statusCode).toBe(200);
    const event = { id: 'event-a', kind: 'hint-received', problemId: 'od-a', attemptId: 'attempt-a', data: { hintLevel: 2 }, createdAt: '2026-08-11T00:01:00Z' };
    expect((await app.inject({ method: 'POST', url: '/learners/learner-a/events', payload: event })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: '/learners/learner-a/events', payload: event })).statusCode).toBe(200);
    const events = await app.inject({ method: 'GET', url: '/learners/learner-a/events' });
    expect(events.json()).toHaveLength(1);
  });

  it('returns an auditable sprint plan and rejects hidden data', async () => {
    const learningStore = createLearningStore();
    await learningStore.putProfile({ learnerId: 'learner-a', target: 'od-exam', examDate: '2026-08-20', dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-11T00:00:00Z' });
    const app = buildServer({ learningStore });
    servers.push(app);
    const response = await app.inject({ method: 'POST', url: '/agent/plan', payload: {
      learnerId: 'learner-a', now: '2026-08-11T00:00:00Z',
      candidates: [{ problemId: 'od-a', title: '数组入门', skillId: 'array' }],
    } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ role: 'learning-orchestrator', strategy: 'sprint', mode: 'baseline' });
    expect(response.json().tools).toHaveLength(3);
    const rejected = await app.inject({ method: 'POST', url: '/agent/plan', payload: {
      learnerId: 'learner-a', candidates: [], hiddenTests: [],
    } });
    expect(rejected.statusCode).toBe(400);
  });

  it('syncs an idempotent event batch in one request', async () => {
    const learningStore = createLearningStore();
    const app = buildServer({ learningStore });
    servers.push(app);
    const event = { id: 'event-batch', kind: 'hint-received', problemId: 'od-a', attemptId: 'attempt-a', data: { hintLevel: 2 }, createdAt: '2026-08-11T00:01:00Z' };
    const first = await app.inject({ method: 'POST', url: '/learners/learner-a/events/batch', payload: { events: [event] } });
    const second = await app.inject({ method: 'POST', url: '/learners/learner-a/events/batch', payload: { events: [event] } });
    expect(first.json()).toMatchObject({ accepted: 1, created: 1 });
    expect(second.json()).toMatchObject({ accepted: 1, created: 0 });
    expect(await learningStore.listEvents('learner-a')).toHaveLength(1);
  });

  it('derives an assisted retry from stored events and selects a different same-skill check', async () => {
    const learningStore = createLearningStore();
    await learningStore.putProfile({ learnerId: 'learner-a', target: 'foundation', examDate: null, dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-11T00:00:00Z' });
    await learningStore.appendEvents([
      { id: 'hint-a', learnerId: 'learner-a', kind: 'hint-received', problemId: 'od-array-1', attemptId: 'attempt-failed', data: { hintLevel: 2 }, createdAt: '2026-08-11T00:01:00Z' },
      { id: 'pass-a', learnerId: 'learner-a', kind: 'attempt-recorded', problemId: 'od-array-1', attemptId: 'attempt-pass', data: { outcome: 'passed', skillIds: ['array'] }, createdAt: '2026-08-11T00:02:00Z' },
    ]);
    const app = buildServer({ learningStore });
    servers.push(app);
    const response = await app.inject({ method: 'POST', url: '/agent/plan', payload: {
      learnerId: 'learner-a',
      candidates: [
        { problemId: 'od-array-1', title: '原题', skillId: 'array' },
        { problemId: 'od-array-2', title: '迁移题', skillId: 'array' },
        { problemId: 'od-graph', title: '图题', skillId: 'graph' },
      ],
    } });
    const plan = response.json();
    expect(plan.mode).toBe('mastery-check');
    expect(plan.actions[0]).toMatchObject({ type: 'mastery-check', problemId: 'od-array-2', skillId: 'array' });
  });
});

describe('Mentor session routes', () => {
  const mentorIndex: MentorRetrievalIndex = {
    version: 1, problemCount: 1, documentCount: 1,
    documents: [{ ref: 'problem:p1', kind: 'problem', title: '数组边界', text: '边界与下标', skillIds: ['array'], verification: 'verified', authoritative: true, metadata: { problemId: 'p1' } }],
  };
  const mentorRequest = {
    version: 1, learnerId: 'learner-a',
    problem: { id: 'p1', title: '数组边界', description: '题目', input: '输入', output: '输出', skillIds: ['array'], publicInputs: ['1\n0'] },
    attempt: { id: 'a1', language: 'javascript', outcome: 'wrong-answer', summary: '0/1', sourceCode: 'for(let i=0;i<=a.length;i++){}', passedCount: 0, totalCount: 1 },
  };

  it('creates, continues, and reads an owner-scoped persistent Mentor session', async () => {
    const mentorStore = createMentorStore();
    const app = buildServer({ mentorStore, mentorRetriever: createCorpusRetriever(mentorIndex), mentorModel: null });
    servers.push(app);
    const created = await app.inject({ method: 'POST', url: '/mentor/sessions', payload: mentorRequest });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ version: 1, session: { phase: 'awaiting-prediction', mode: 'deterministic', learnerId: 'learner-a' } });
    const id = created.json().session.id as string;
    const continued = await app.inject({ method: 'POST', url: `/mentor/sessions/${id}/turns`, payload: { ...mentorRequest, learnerResponse: '会访问 length 下标并越界' } });
    expect(continued.statusCode).toBe(200);
    expect(continued.json().session.phase).toBe('awaiting-edit');
    const read = await app.inject({ method: 'GET', url: `/mentor/sessions/${id}?learnerId=learner-a` });
    expect(read.statusCode).toBe(200);
    expect(read.json().timeline.some((event: { type: string }) => event.type === 'learner-response')).toBe(true);
    expect((await app.inject({ method: 'GET', url: `/mentor/sessions/${id}?learnerId=learner-b` })).statusCode).toBe(404);
  });

  it('rejects hidden fields before Mentor execution and does not leak provider errors', async () => {
    let called = false;
    const app = buildServer({
      mentorStore: createMentorStore(), mentorRetriever: createCorpusRetriever(mentorIndex),
      runMentor: async () => { called = true; throw new Error('deepseek-secret-detail'); },
    });
    servers.push(app);
    const rejected = await app.inject({ method: 'POST', url: '/mentor/sessions', payload: { ...mentorRequest, hiddenTests: [] } });
    expect(rejected.statusCode).toBe(400);
    expect(called).toBe(false);
    const failed = await app.inject({ method: 'POST', url: '/mentor/sessions', payload: mentorRequest });
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain('deepseek-secret-detail');
  });
});
