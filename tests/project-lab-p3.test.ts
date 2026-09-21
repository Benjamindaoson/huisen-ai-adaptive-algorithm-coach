import { describe, expect, it } from 'vitest';
import type {
  ProjectLabCriterion,
  ProjectLabSubmission,
  ProjectOsAssessmentResult,
  ProjectOsAuditResult,
  ProjectOsImportResult,
} from '../contracts/project-lab';
import { InMemoryEvidenceStore } from '../packages/evidence/evidence-store';
import { LearnerModelUpdater } from '../packages/learner-model/learner-model-updater';
import { ProjectLabGateway } from '../services/project-lab/gateway';
import type { ProjectOsClient, ProjectOsFetch } from '../services/project-lab/project-os-client';
import { HttpProjectOsClient } from '../services/project-lab/project-os-client';

const criteria: readonly ProjectLabCriterion[] = [
  {
    criterion: 'Project tests are discoverable and pass collection',
    evidenceType: 'test',
    verificationMethod: 'project_test_discovery',
  },
];

const qualifiedSubmission: ProjectLabSubmission = {
  id: 'submission-1',
  learnerId: 'learner-1',
  learningTaskId: 'task-build-rag',
  skillIds: ['rag.hybrid-retrieval', 'agent.evaluation'],
  repositoryUrl: 'https://github.com/example/student-rag',
  submittedAt: '2026-09-22T02:30:00.000Z',
  attribution: {
    verified: true,
    independent: true,
    aiAssistance: 'limited',
    highestHintLevel: 1,
    source: 'activity-trace',
  },
};

function passingAssessment(): ProjectOsAssessmentResult {
  return {
    assessment_id: 'assessment-1',
    project_id: 'project-1',
    skill_ids: ['rag.hybrid-retrieval', 'agent.evaluation'],
    read_only: true,
    repository_mutated: false,
    source_snapshot: {
      snapshot_id: 'snapshot-1',
      commit_sha: 'abc123',
      branch: 'main',
    },
    verification: {
      task_id: 'readonly-task',
      overall_status: 'passed',
      verification_results: [
        {
          criterion: 'Project tests are discoverable and pass collection',
          status: 'passed',
          evidence: [{ type: 'test', test: 'pytest_collection', status: 'passed' }],
          details: 'Passed: 1, Failed: 0',
        },
      ],
      missing_evidence: [],
      recommendations: [],
    },
    summary: {
      total: 1,
      passed: 1,
      partial: 0,
      failed: 0,
      pass_rate: 1,
    },
  };
}

class FakeProjectOsClient implements ProjectOsClient {
  readonly calls: string[] = [];

  constructor(private readonly assessment: ProjectOsAssessmentResult = passingAssessment()) {}

  async importRepository(repositoryUrl: string): Promise<ProjectOsImportResult> {
    this.calls.push(`import:${repositoryUrl}`);
    return {
      project_id: 'project-1',
      name: 'student-rag',
      status: 'imported',
      commit_sha: 'abc123',
    };
  }

  async auditProject(projectId: string): Promise<ProjectOsAuditResult> {
    this.calls.push(`audit:${projectId}`);
    return {
      project_id: projectId,
      maturity_assessment: { overall_level: 'mvp' },
      gaps: [{ dimension: 'evaluation', description: 'needs stronger regression eval' }],
    };
  }

  async assessProject(
    projectId: string,
    skillIds: readonly string[],
    requestedCriteria: readonly ProjectLabCriterion[],
  ): Promise<ProjectOsAssessmentResult> {
    this.calls.push(`assess:${projectId}:${skillIds.join(',')}:${requestedCriteria.length}`);
    return this.assessment;
  }
}

describe('P3 Project Lab Gateway', () => {
  it('runs import -> audit -> read-only assess and converts verified project evidence into learning evidence', async () => {
    const store = new InMemoryEvidenceStore();
    const client = new FakeProjectOsClient();
    const gateway = new ProjectLabGateway(client, store);

    const result = await gateway.evaluateSubmission(qualifiedSubmission, criteria);

    expect(client.calls).toEqual([
      'import:https://github.com/example/student-rag',
      'audit:project-1',
      'assess:project-1:rag.hybrid-retrieval,agent.evaluation:1',
    ]);
    expect(result.engineeringEvidence.commitSha).toBe('abc123');
    expect(result.learningEvidenceWithheld).toBe(false);
    expect(result.learningEvidenceEventIds).toHaveLength(2);

    const capability = store.list({ learnerId: 'learner-1' })
      .filter((event) => event.evidenceType === 'project_verification');
    expect(capability).toHaveLength(2);
    expect(capability.every((event) => event.independent === true && event.score === 1)).toBe(true);

    const ragState = new LearnerModelUpdater().project(
      'learner-1',
      'rag.hybrid-retrieval',
      store.list(),
    );
    expect(ragState.evidenceCount).toBe(1);
    expect(ragState.implementationScore).toBe(1);
    expect(ragState.independentSuccess).toBe(1);
  });

  it('withholds mastery evidence when learner attribution is unknown', async () => {
    const store = new InMemoryEvidenceStore();
    const gateway = new ProjectLabGateway(new FakeProjectOsClient(), store);
    const submission: ProjectLabSubmission = {
      ...qualifiedSubmission,
      id: 'submission-unattributed',
      attribution: undefined,
    };

    const result = await gateway.evaluateSubmission(submission, criteria);

    expect(result.learningEvidenceWithheld).toBe(true);
    expect(result.withheldReasons).toContain('learner_attribution_not_verified');
    expect(store.list().filter((event) => event.evidenceType === 'project_verification')).toHaveLength(0);

    const state = new LearnerModelUpdater().project(
      'learner-1',
      'rag.hybrid-retrieval',
      store.list(),
    );
    expect(state.mastery).toBe(0);
    expect(state.evidenceCount).toBe(0);
    expect(state.uncertainty).toBe(1);
  });

  it('withholds mastery evidence for substantial AI assistance even when the project passes', async () => {
    const store = new InMemoryEvidenceStore();
    const gateway = new ProjectLabGateway(new FakeProjectOsClient(), store);
    const submission: ProjectLabSubmission = {
      ...qualifiedSubmission,
      id: 'submission-ai-heavy',
      attribution: {
        verified: true,
        independent: true,
        aiAssistance: 'substantial',
        highestHintLevel: 1,
        source: 'activity-trace',
      },
    };

    const result = await gateway.evaluateSubmission(submission, criteria);

    expect(result.learningEvidenceWithheld).toBe(true);
    expect(result.withheldReasons).toContain('ai_assistance_too_high_or_unknown');
  });

  it('withholds mastery evidence when Project OS verification fails', async () => {
    const failed = passingAssessment();
    const failedAssessment: ProjectOsAssessmentResult = {
      ...failed,
      verification: {
        ...failed.verification,
        overall_status: 'failed',
        verification_results: [
          {
            ...failed.verification.verification_results[0],
            status: 'failed',
          },
        ],
      },
      summary: {
        total: 1,
        passed: 0,
        partial: 0,
        failed: 1,
        pass_rate: 0,
      },
    };

    const store = new InMemoryEvidenceStore();
    const gateway = new ProjectLabGateway(new FakeProjectOsClient(failedAssessment), store);
    const result = await gateway.evaluateSubmission(
      { ...qualifiedSubmission, id: 'submission-failed' },
      criteria,
    );

    expect(result.learningEvidenceWithheld).toBe(true);
    expect(result.withheldReasons).toContain('engineering_verification_not_passed');
    expect(store.list().filter((event) => event.evidenceType === 'project_verification')).toHaveLength(0);
  });

  it('rejects any Project OS response that reports repository mutation', async () => {
    const mutated: ProjectOsAssessmentResult = {
      ...passingAssessment(),
      repository_mutated: true,
    };
    const gateway = new ProjectLabGateway(
      new FakeProjectOsClient(mutated),
      new InMemoryEvidenceStore(),
    );

    await expect(gateway.evaluateSubmission(qualifiedSubmission, criteria))
      .rejects.toThrow(/read-only Project Lab contract/);
  });

  it('rejects unattributed Project OS verification even if a forged event is marked independent', () => {
    const store = new InMemoryEvidenceStore();
    store.append({
      contractVersion: 1,
      id: 'forged-project-proof',
      learnerId: 'learner-1',
      skillId: 'rag.hybrid-retrieval',
      domain: 'rag',
      activityType: 'project',
      evidenceType: 'project_verification',
      score: 1,
      passed: true,
      independent: true,
      provenance: {
        source: 'ai-engineering-project-os',
        sourceId: 'assessment-forged',
        adapter: 'bad-adapter',
      },
      metadata: {
        learnerAttributionVerified: false,
      },
      createdAt: '2026-09-22T02:31:00.000Z',
    });

    const state = new LearnerModelUpdater().project(
      'learner-1',
      'rag.hybrid-retrieval',
      store.list(),
    );

    expect(state.mastery).toBe(0);
    expect(state.evidenceCount).toBe(0);
    expect(state.uncertainty).toBe(1);
  });

  it('uses only import, audit, and read-only assessment endpoints in the HTTP adapter', async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const fetcher: ProjectOsFetch = async (url, init) => {
      calls.push({ url, method: init?.method, body: init?.body });
      const payload = url.endsWith('/api/projects/import')
        ? { project_id: 'p1', name: 'repo', status: 'imported' }
        : url.endsWith('/audit')
          ? { project_id: 'p1', maturity_assessment: {} }
          : passingAssessment();
      return {
        ok: true,
        status: 200,
        async json() { return payload; },
        async text() { return JSON.stringify(payload); },
      };
    };

    const client = new HttpProjectOsClient('http://project-os:8000/', fetcher);
    const imported = await client.importRepository('https://github.com/example/repo');
    await client.auditProject(imported.project_id);
    await client.assessProject(imported.project_id, ['rag.hybrid-retrieval'], criteria);

    expect(calls.map((call) => call.url)).toEqual([
      'http://project-os:8000/api/projects/import',
      'http://project-os:8000/api/projects/p1/audit',
      'http://project-os:8000/api/project-lab/projects/p1/assess',
    ]);
    expect(calls.some((call) => call.url.includes('/execute'))).toBe(false);
  });
});
