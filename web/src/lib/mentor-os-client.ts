import { learnerIdentityClient, type LearnerIdentityClient } from './learner-identity-client';
import type { MentorContextContribution, MentorRouteKind } from './mentor-context';
import type { MentorOSCheckpoint } from './mentor-os-state';

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type MentorOSEvent = { id: string; sequence: number; type: string; detail: string; evidenceRefs: string[]; at: string; stopReason?: string };
export type MentorOSRun = { id: string; learnerId: string; sequence: number; events: MentorOSEvent[]; checkpoint: MentorOSCheckpoint };
export type MentorOSActResult = MentorOSRun & { mentorResult?: { session: { id: string; mode: string; [key: string]: unknown }; executions: unknown[]; [key: string]: unknown } };
export type MentorOSCommand = { version: 1; runId: string; idempotencyKey: string; kind: string; expectedSequence: number; detail?: string; evidenceRefs?: string[]; [key: string]: unknown };
export type MentorOSClient = ReturnType<typeof createMentorOSClient>;

function ensureOk(response: Response, label: string): Response {
  if (!response.ok) throw new Error(`${label} unavailable (${response.status})`);
  return response;
}

export function parseMentorSSE(body: string): { events: MentorOSEvent[]; checkpoint?: MentorOSCheckpoint } {
  const events: MentorOSEvent[] = [];
  let checkpoint: MentorOSCheckpoint | undefined;
  for (const block of body.split(/\r?\n\r?\n/)) {
    const type = block.match(/^event:\s*(.+)$/m)?.[1];
    const data = block.match(/^data:\s*(.+)$/m)?.[1];
    if (!type || !data) continue;
    try {
      const parsed = JSON.parse(data) as unknown;
      if (type === 'checkpoint') checkpoint = parsed as MentorOSCheckpoint;
      else events.push(parsed as MentorOSEvent);
    } catch { /* ignore an incomplete stream frame and recover from the cursor */ }
  }
  return { events, ...(checkpoint ? { checkpoint } : {}) };
}

export function createMentorOSClient(options: { fetcher?: Fetcher; identity?: LearnerIdentityClient } = {}) {
  const fetcher = options.fetcher ?? ((input: string | URL | Request, init?: RequestInit) => fetch(input, init));
  const identity = options.identity ?? learnerIdentityClient;
  const base = (url: string) => url.replace(/\/$/, '');
  return {
    async start(baseUrl: string, input: { learnerId: string; goal: string; route: { kind: MentorRouteKind; ref: string }; idempotencyKey: string }): Promise<MentorOSRun> {
      const authorization = await identity.headers(baseUrl, input.learnerId);
      const response = ensureOk(await fetcher(`${base(baseUrl)}/mentor-os/runs`, { method: 'POST', headers: { 'content-type': 'application/json', ...authorization }, body: JSON.stringify({ version: 1, ...input }) }), 'Mentor OS');
      return response.json() as Promise<MentorOSRun>;
    },
    async command(baseUrl: string, command: MentorOSCommand, learnerId: string): Promise<{ run: MentorOSRun; event?: MentorOSEvent }> {
      const authorization = await identity.headers(baseUrl, learnerId);
      const response = ensureOk(await fetcher(`${base(baseUrl)}/mentor-os/runs/${encodeURIComponent(command.runId)}/commands`, { method: 'POST', headers: { 'content-type': 'application/json', ...authorization }, body: JSON.stringify(command) }), 'Mentor command');
      return response.json() as Promise<{ run: MentorOSRun; event?: MentorOSEvent }>;
    },
    async act(baseUrl: string, input: { runId: string; learnerId: string; expectedSequence: number; idempotencyKey: string; assessment: string; mentorInput: unknown; context: unknown[]; mentorSessionId?: string }): Promise<MentorOSActResult> {
      const authorization = await identity.headers(baseUrl, input.learnerId);
      const response = ensureOk(await fetcher(`${base(baseUrl)}/mentor-os/runs/${encodeURIComponent(input.runId)}/commands`, { method: 'POST', headers: { 'content-type': 'application/json', ...authorization }, body: JSON.stringify({ version: 1, kind: 'act', ...input }) }), 'Mentor action');
      return response.json() as Promise<MentorOSActResult>;
    },
    async recover(baseUrl: string, runId: string, learnerId: string, after: number): Promise<{ events: MentorOSEvent[]; checkpoint?: MentorOSCheckpoint }> {
      const authorization = await identity.headers(baseUrl, learnerId);
      const response = ensureOk(await fetcher(`${base(baseUrl)}/mentor-os/runs/${encodeURIComponent(runId)}/events?learnerId=${encodeURIComponent(learnerId)}&after=${after}`, { headers: authorization }), 'Mentor event stream');
      return parseMentorSSE(await response.text());
    },
  };
}

export function contributionCommand(run: MentorOSRun, contribution: MentorContextContribution): MentorOSCommand {
  return { version: 1, runId: run.id, kind: 'contribute-context', expectedSequence: run.sequence, idempotencyKey: `context:${contribution.id}`, detail: `同步 ${String(contribution.data.routeKind)} 页面证据`, evidenceRefs: contribution.evidenceRefs, context: [contribution] };
}
