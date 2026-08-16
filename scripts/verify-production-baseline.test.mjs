import { describe, expect, it } from 'vitest';
import { buildProductionBaseline } from './lib/production-baseline.mjs';

describe('production baseline', () => {
  it('reports catalog, judge coverage, frontend wiring and Mentor release evidence without secrets', () => {
    const report = buildProductionBaseline({
      catalog: { problems: Array.from({ length: 754 }, (_, index) => ({ id: `od-${index}` })) },
      hiddenTestSource: "const TESTS = { 'od-a': [], 'od-b': [] };",
      mentorReport: { eligibleRealCaseCount: 0, releaseGate: { minimumEligibleRealCases: 100, passed: false, failures: ['eligible-real-cases: 0/100'] } },
      frontendEnv: { MODE: 'development' },
      gatewayHealth: { ok: true, mentor: { storage: 'file-local', identity: 'permissive-local', model: 'deepseek-v4-flash' } },
      gatewayCapabilities: { capabilities: { identity: { status: 'ready', mode: 'account-postgres' }, learning: { status: 'ready', storage: 'postgres' }, mentor: { status: 'experimental', model: 'deepseek-v4-flash' } } },
      generatedAt: '2026-08-13T00:00:00.000Z',
    });

    expect(report).toEqual(expect.objectContaining({
      version: 1,
      generatedAt: '2026-08-13T00:00:00.000Z',
      catalog: { problemCount: 754, hiddenJudgePackCount: 2, hiddenJudgeCoverage: 0.0027 },
      frontend: { apiConfigured: false, runnerConfigured: false, coachConfigured: false },
      gateway: { reachable: true, storage: 'postgres', identity: 'account-postgres', model: 'deepseek-v4-flash' },
      mentorQuality: { eligibleRealCases: 0, minimumRealCases: 100, passed: false, failures: ['eligible-real-cases: 0/100'] },
    }));
    expect(JSON.stringify(report)).not.toContain('API_KEY');
  });
});
