import { useEffect, useRef, useState } from 'react';
import { mentorWorkspaceKey, type MentorContextContribution, type MentorRouteKind } from '../lib/mentor-context';
import { contributionCommand, createMentorOSClient, type MentorOSClient, type MentorOSEvent } from '../lib/mentor-os-client';
import { emptyMentorOSState, type MentorOSBackupState, type MentorOSCheckpoint } from '../lib/mentor-os-state';

type Props = {
  baseUrl: string;
  learnerId: string;
  goal: string;
  route: { kind: MentorRouteKind; ref: string };
  contribution: MentorContextContribution;
  suppressed?: boolean;
  headless?: boolean;
  client?: MentorOSClient;
  state?: MentorOSBackupState;
  onStateChange?: (state: MentorOSBackupState) => void;
};

const labels: Record<string, string> = { 'run-started': '目标', 'context-compiled': '观察', hypothesis: '当前假设', 'missing-evidence': '证据缺口', 'tool-started': '正在调用工具', 'tool-completed': '工具结果', 'approval-requested': '等待审批', 'approval-resolved': '审批结果', verified: '验证', stopped: '下一步', 'policy-denied': '策略拦截' };
const defaultMentorOSClient = createMentorOSClient();

function approvalFrom(event: MentorOSEvent): { approvalId: string; summary: string; diff: string } | null {
  if (event.type !== 'approval-requested') return null;
  try {
    const value = JSON.parse(event.detail) as { approvalId?: unknown; summary?: unknown; diff?: unknown };
    return typeof value.approvalId === 'string' && typeof value.summary === 'string' && typeof value.diff === 'string' ? value as { approvalId: string; summary: string; diff: string } : null;
  } catch { return null; }
}

export function MentorDock({ baseUrl, learnerId, goal, route, contribution, suppressed = false, headless = false, client = defaultMentorOSClient, state = emptyMentorOSState(), onStateChange }: Props) {
  const [events, setEvents] = useState<MentorOSEvent[]>([]);
  const [checkpoint, setCheckpoint] = useState<MentorOSCheckpoint | null>(state.active?.checkpoint ?? null);
  const [status, setStatus] = useState<'local' | 'connecting' | 'compiled' | 'agent' | 'degraded'>(baseUrl ? 'connecting' : 'local');
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches);
  const [resolving, setResolving] = useState('');
  const routeKey = mentorWorkspaceKey(route);
  const latestRef = useRef({ client, state, onStateChange, route, contribution });
  latestRef.current = { client, state, onStateChange, route, contribution };

  useEffect(() => {
    if (suppressed) return;
    if (!baseUrl) { setStatus('local'); return; }
    const controller = new AbortController();
    setEvents([]);
    setCheckpoint(null);
    setStatus('connecting');
    void (async () => {
      try {
        const latest = latestRef.current;
        const cached = latest.state.active?.scopeVersion === 2 && latest.state.active.learnerId === learnerId && latest.state.active.routeKey === routeKey ? latest.state.active : null;
        const startKey = `mentor-os-v2:${learnerId}:${routeKey}`;
        let run = cached
          ? { id: cached.runId, learnerId, sequence: cached.cursor, events: [] as MentorOSEvent[], checkpoint: cached.checkpoint }
          : await latest.client.start(baseUrl, { learnerId, goal, route: latest.route, idempotencyKey: startKey });
        let recovered;
        try {
          if (!cached || cached.routeKey !== routeKey) {
            const committed = await latest.client.command(baseUrl, contributionCommand(run, latest.contribution), learnerId);
            run = committed.run;
          }
          recovered = await latest.client.recover(baseUrl, run.id, learnerId, Math.max(0, run.sequence - 20));
        } catch (error) {
          if (!cached) throw error;
          run = await latest.client.start(baseUrl, { learnerId, goal, route: latest.route, idempotencyKey: startKey });
          const committed = await latest.client.command(baseUrl, contributionCommand(run, latest.contribution), learnerId);
          run = committed.run;
          recovered = await latest.client.recover(baseUrl, run.id, learnerId, Math.max(0, run.sequence - 20));
        }
        if (controller.signal.aborted) return;
        const nextEvents = [...run.events, ...recovered.events].reduce<MentorOSEvent[]>((items, event) => items.some((item) => item.id === event.id) ? items : [...items, event], []).slice(-12);
        const nextCheckpoint = recovered.checkpoint ?? run.checkpoint;
        setEvents(nextEvents);
        setCheckpoint(nextCheckpoint);
        setStatus(nextEvents.some((event) => ['tool-started', 'tool-completed', 'hypothesis', 'verified'].includes(event.type)) ? 'agent' : 'compiled');
        latest.onStateChange?.({ ...latest.state, active: { runId: run.id, learnerId, cursor: nextCheckpoint.sequence, checkpoint: nextCheckpoint, routeKey, scopeVersion: 2 } });
      } catch { if (!controller.signal.aborted) setStatus('degraded'); }
    })();
    return () => controller.abort();
  }, [baseUrl, contribution.id, goal, learnerId, route.kind, route.ref, routeKey, state.active?.cursor, suppressed]);

  if (suppressed || headless) return null;
  async function resolveApproval(event: MentorOSEvent, decision: 'accept' | 'reject') {
    const approval = approvalFrom(event);
    if (!approval || !checkpoint || resolving) return;
    setResolving(approval.approvalId);
    try {
      const response = await client.command(baseUrl, { version: 1, runId: state.active?.runId ?? event.id.split(':')[0], idempotencyKey: `approval:${approval.approvalId}:${decision}`, kind: 'approve', expectedSequence: checkpoint.sequence, approvalId: approval.approvalId, decision, evidenceRefs: [`learner-decision:${approval.approvalId}:${decision}`] }, learnerId);
      setCheckpoint(response.run.checkpoint);
      setEvents((current) => [...current, ...(response.event ? [response.event] : [])].filter((item) => item.id !== event.id));
      onStateChange?.({ ...state, active: { runId: response.run.id, learnerId, cursor: response.run.checkpoint.sequence, checkpoint: response.run.checkpoint, routeKey, scopeVersion: 2 }, approvals: [...state.approvals.filter((item) => item.id !== approval.approvalId), { id: approval.approvalId, decision, decidedAt: new Date().toISOString() }] });
    } catch { setStatus('degraded'); }
    finally { setResolving(''); }
  }
  const statusText = status === 'agent' ? '导师已完成证据分析'
    : status === 'compiled' ? '导师已就绪，等待当前任务的可验证证据'
      : status === 'degraded' ? '深度代码导师连接失败 · 本地学习编排仍可用'
        : status === 'local' ? '本地学习编排在线 · 深度代码导师未连接'
          : '正在连接深度代码导师';
  const localOnly = status === 'local' || status === 'degraded';
  const contributedNextAction = typeof contribution.data.nextAction === 'string' ? contribution.data.nextAction.trim() : '';
  const hasContributionNextAction = Boolean(contributedNextAction);
  const contributionNextAction = contributedNextAction || '完成当前页面的下一步';
  const hasAgentCheckpoint = Boolean(checkpoint?.stopReason) || events.some((event) => ['hypothesis', 'missing-evidence', 'tool-started', 'tool-completed', 'approval-requested', 'approval-resolved', 'verified', 'stopped', 'policy-denied'].includes(event.type));
  const visibleNextAction = (hasAgentCheckpoint || !hasContributionNextAction) && checkpoint?.nextAction ? checkpoint.nextAction : contributionNextAction;
  return <aside className={`mentor-dock ${collapsed ? 'collapsed' : ''}`} aria-label="持续导师">
    <header><div><span><i /></span><div><em>MENTOR TIMELINE</em><strong>持续导师</strong><small>{statusText}</small></div></div><button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? '展开持续导师' : '收起持续导师'}>{collapsed ? '‹' : '›'}</button></header>
    {!collapsed && <div className="mentor-dock-body">
      <section className="mentor-goal"><small>ACTIVE LEARNING GOAL</small><strong>{goal}</strong><span>当前工作空间 · {route.kind} / {route.ref}</span></section>
      <div className="mentor-dock-events">{events.length === 0 && <article className="mentor-empty-event"><span>{localOnly ? '当前由本地学习证据编排' : '尚未执行工具'}</span><p>{localOnly ? '系统仍会根据已验证的学习动作安排下一步；连接深度代码导师后，这里才会生成代码诊断与工具时间线。' : '完成一次可分析提交后，导师会在这里生成可验证时间线。'}</p><small>{localOnly ? '当前没有调用模型或动态工具' : '等待运行证据'}</small></article>}{events.slice(-5).map((event) => {
        const approval = approvalFrom(event);
        return <article key={event.id}><span>{labels[event.type] ?? event.type}</span>{approval ? <><p>{approval.summary}</p><pre>{approval.diff}</pre><div className="mentor-approval-actions"><button type="button" disabled={Boolean(resolving)} aria-label={`拒绝修改 ${approval.approvalId}`} onClick={() => void resolveApproval(event, 'reject')}>拒绝</button><button type="button" disabled={Boolean(resolving)} aria-label={`接受修改 ${approval.approvalId}`} onClick={() => void resolveApproval(event, 'accept')}>接受后再应用</button></div></> : <p>{event.detail}</p>}{event.evidenceRefs.length > 0 && <details className="mentor-evidence"><summary>查看分析依据</summary><small>{event.evidenceRefs.slice(0, 2).join(' · ')}</small></details>}</article>;
      })}</div>
      <section className="mentor-next-action"><small>现在只做一步</small><strong>{visibleNextAction}</strong></section>
    </div>}
  </aside>;
}
