import type {
  ProjectLabCriterion,
  ProjectOsAssessmentResult,
  ProjectOsAuditResult,
  ProjectOsImportResult,
} from '../../contracts/project-lab';

export interface ProjectOsClient {
  importRepository(repositoryUrl: string): Promise<ProjectOsImportResult>;
  auditProject(projectId: string): Promise<ProjectOsAuditResult>;
  assessProject(
    projectId: string,
    skillIds: readonly string[],
    criteria: readonly ProjectLabCriterion[],
  ): Promise<ProjectOsAssessmentResult>;
}

type FetchResponse = Readonly<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export type ProjectOsFetch = (
  url: string,
  init?: Readonly<{
    method?: string;
    headers?: Readonly<Record<string, string>>;
    body?: string;
  }>,
) => Promise<FetchResponse>;

function trimSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export class HttpProjectOsClient implements ProjectOsClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly fetcher: ProjectOsFetch = globalThis.fetch as unknown as ProjectOsFetch,
  ) {
    if (!baseUrl.trim()) throw new Error('Project OS base URL is required');
    this.baseUrl = trimSlash(baseUrl.trim());
  }

  importRepository(repositoryUrl: string): Promise<ProjectOsImportResult> {
    return this.request<ProjectOsImportResult>('/api/projects/import', {
      method: 'POST',
      body: JSON.stringify({ github_url: repositoryUrl }),
    });
  }

  auditProject(projectId: string): Promise<ProjectOsAuditResult> {
    return this.request<ProjectOsAuditResult>(`/api/projects/${encodeURIComponent(projectId)}/audit`, {
      method: 'POST',
    });
  }

  assessProject(
    projectId: string,
    skillIds: readonly string[],
    criteria: readonly ProjectLabCriterion[],
  ): Promise<ProjectOsAssessmentResult> {
    return this.request<ProjectOsAssessmentResult>(
      `/api/project-lab/projects/${encodeURIComponent(projectId)}/assess`,
      {
        method: 'POST',
        body: JSON.stringify({
          skill_ids: [...skillIds],
          criteria: criteria.map((criterion) => ({
            criterion: criterion.criterion,
            evidence_type: criterion.evidenceType,
            verification_method: criterion.verificationMethod,
          })),
        }),
      },
    );
  }

  private async request<T>(
    path: string,
    init: Readonly<{ method?: string; body?: string }> = {},
  ): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: { 'content-type': 'application/json' },
      body: init.body,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Project OS request failed (${response.status}) for ${path}: ${body.slice(0, 500)}`);
    }

    return await response.json() as T;
  }
}
