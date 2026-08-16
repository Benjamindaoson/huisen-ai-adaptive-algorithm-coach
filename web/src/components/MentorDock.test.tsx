// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MentorDock } from './MentorDock';

const client = {
  start: vi.fn(async () => ({ id: 'run-1', learnerId: 'l-1', sequence: 1, events: [{ id: 'e1', sequence: 1, type: 'run-started', detail: '通过算法初试', evidenceRefs: ['goal:1'], at: 'now' }], checkpoint: { sequence: 1, nextAction: '编译证据' } })),
  command: vi.fn(async () => ({ run: { id: 'run-1', learnerId: 'l-1', sequence: 2, events: [], checkpoint: { sequence: 2, nextAction: '只完成今天第一题' } } })),
  recover: vi.fn(async () => ({ events: [{ id: 'e2', sequence: 2, type: 'context-compiled', detail: '已编译今日证据', evidenceRefs: ['route:daily'], at: 'now' }], checkpoint: { sequence: 2, nextAction: '只完成今天第一题' } })),
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('global Mentor dock', () => {
  it('starts collapsed on a narrow viewport so it cannot cover the learning task', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    render(<MentorDock baseUrl="" learnerId="l-1" goal="学习" route={{ kind: 'practice', ref: 'p-1' }} contribution={{ version: 1, id: 'route-p1', kind: 'route', priority: 80, evidenceRefs: ['route:p-1'], data: {} }} client={client as never} />);
    expect(screen.getByRole('complementary', { name: '持续导师' }).className).toContain('collapsed');
    expect(screen.getByRole('button', { name: '展开持续导师' })).toBeTruthy();
  });

  it('starts and labels a route-scoped run instead of reusing another workspace cache', async () => {
    const scopedClient = {
      start: vi.fn(async (_url, input) => ({ id: `run-${input.route.ref}`, learnerId: 'l-1', sequence: 1, events: [{ id: 'fresh', sequence: 1, type: 'run-started', detail: '当前项目目标', evidenceRefs: [`route:${input.route.ref}`], at: 'now' }], checkpoint: { sequence: 1, nextAction: '读取当前项目' } })),
      command: vi.fn(async (_url, command) => ({ run: { id: command.runId, learnerId: 'l-1', sequence: 2, events: [], checkpoint: { sequence: 2, nextAction: '定位当前项目' } } })),
      recover: vi.fn(async (_url, runId) => ({ events: [{ id: `${runId}:2`, sequence: 2, type: 'context-compiled', detail: '只包含当前项目证据', evidenceRefs: ['route:repo-pagination'], at: 'now' }], checkpoint: { sequence: 2, nextAction: '定位当前项目' } })),
    };
    const staleState = { version: 1 as const, active: { runId: 'old-problem-run', learnerId: 'l-1', cursor: 8, checkpoint: { sequence: 8, nextAction: '旧问题假设' }, routeKey: 'practice:od-old' }, approvals: [], experiments: [], outcomeLinks: [] };
    render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="独立修复" route={{ kind: 'practice', ref: 'repo-pagination' }} contribution={{ version: 1, id: 'route-repo-pagination', kind: 'route', priority: 80, evidenceRefs: ['route:repo-pagination'], data: {} }} client={scopedClient as never} state={staleState} />);

    await waitFor(() => expect(screen.getByText('只包含当前项目证据')).toBeTruthy());
    expect(scopedClient.start).toHaveBeenCalledWith('http://localhost:8787', expect.objectContaining({ idempotencyKey: 'mentor-os-v2:l-1:practice:repo-pagination' }));
    expect(scopedClient.recover).not.toHaveBeenCalledWith(expect.anything(), 'old-problem-run', expect.anything(), expect.anything());
    expect(screen.getByText('当前工作空间 · practice / repo-pagination')).toBeTruthy();
    expect(screen.queryByText('旧问题假设')).toBeNull();
  });

  it('invalidates a matching legacy cache that predates workspace isolation', async () => {
    const legacyClient = {
      start: vi.fn(async () => ({ id: 'clean-v2-run', learnerId: 'l-1', sequence: 1, events: [], checkpoint: { sequence: 1, nextAction: '只分析当前项目' } })),
      command: vi.fn(async (_url, command) => ({ run: { id: command.runId, learnerId: 'l-1', sequence: 2, events: [], checkpoint: { sequence: 2, nextAction: '只分析当前项目' } } })),
      recover: vi.fn(async () => ({ events: [{ id: 'clean-event', sequence: 2, type: 'context-compiled', detail: '当前项目证据', evidenceRefs: ['route:repo-pagination'], at: 'now' }], checkpoint: { sequence: 2, nextAction: '只分析当前项目' } })),
    };
    const legacyState = { version: 1 as const, active: { runId: 'legacy-polluted-run', learnerId: 'l-1', cursor: 12, checkpoint: { sequence: 12, nextAction: '旧跨页面结论' }, routeKey: 'practice:repo-pagination' }, approvals: [], experiments: [], outcomeLinks: [] };
    render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="独立修复" route={{ kind: 'practice', ref: 'repo-pagination' }} contribution={{ version: 1, id: 'route-repo-pagination', kind: 'route', priority: 80, evidenceRefs: ['route:repo-pagination'], data: {} }} client={legacyClient as never} state={legacyState} />);

    await waitFor(() => expect(screen.getByText('当前项目证据')).toBeTruthy());
    expect(legacyClient.start).toHaveBeenCalledWith('http://localhost:8787', expect.objectContaining({ idempotencyKey: 'mentor-os-v2:l-1:practice:repo-pagination' }));
    expect(legacyClient.recover).not.toHaveBeenCalledWith(expect.anything(), 'legacy-polluted-run', expect.anything(), expect.anything());
    expect(screen.queryByText('旧跨页面结论')).toBeNull();
  });

  it('shows honest lifecycle, evidence, and one next action across a route', async () => {
    render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="通过算法初试" route={{ kind: 'today', ref: 'daily' }} contribution={{ version: 1, id: 'route-daily', kind: 'route', priority: 80, evidenceRefs: ['route:daily'], data: { nextAction: '完成第一题' } }} client={client as never} />);
    expect(screen.getByText('持续导师')).toBeTruthy();
    expect(screen.getByText('MENTOR TIMELINE')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('完成第一题')).toBeTruthy());
    expect(screen.getByText('已编译今日证据')).toBeTruthy();
    expect(screen.getByText('导师已就绪，等待当前任务的可验证证据')).toBeTruthy();
    expect(screen.getByText('查看分析依据')).toBeTruthy();
    expect(screen.getByText('route:daily').closest('details')).toBeTruthy();
  });

  it('collapses into a compact persistent launcher without ending the run', async () => {
    render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="通过算法初试" route={{ kind: 'today', ref: 'daily' }} contribution={{ version: 1, id: 'route-daily', kind: 'route', priority: 80, evidenceRefs: ['route:daily'], data: {} }} client={client as never} />);
    fireEvent.click(screen.getByRole('button', { name: '收起持续导师' }));
    expect(screen.getByRole('complementary', { name: '持续导师' }).className).toContain('collapsed');
    expect(client.start).toHaveBeenCalled();
  });

  it('is absent during independent assessment', () => {
    const { container } = render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="测评" route={{ kind: 'practice', ref: 'p-1' }} contribution={{ version: 1, id: 'r', kind: 'route', priority: 1, evidenceRefs: ['route:p-1'], data: {} }} suppressed client={client as never} />);
    expect(container.innerHTML).toBe('');
  });

  it('can establish a durable route run without rendering a second Mentor surface', async () => {
    const headlessClient = {
      start: vi.fn(async () => ({ id: 'run-headless', learnerId: 'l-1', sequence: 1, events: [], checkpoint: { sequence: 1, nextAction: '编译当前题目' } })),
      command: vi.fn(async () => ({ run: { id: 'run-headless', learnerId: 'l-1', sequence: 2, events: [], checkpoint: { sequence: 2, nextAction: '等待运行证据' } } })),
      recover: vi.fn(async () => ({ events: [], checkpoint: { sequence: 2, nextAction: '等待运行证据' } })),
    };
    const onStateChange = vi.fn();
    const { container } = render(<MentorDock headless baseUrl="http://localhost:8787" learnerId="l-1" goal="独立修复" route={{ kind: 'practice', ref: 'p-1' }} contribution={{ version: 1, id: 'route-p1', kind: 'route', priority: 80, evidenceRefs: ['route:p-1'], data: {} }} client={headlessClient as never} onStateChange={onStateChange} />);

    expect(container.innerHTML).toBe('');
    await waitFor(() => expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ active: expect.objectContaining({ runId: 'run-headless', routeKey: 'practice:p-1' }) })));
  });

  it('separates local evidence planning from an unconfigured deep Mentor', () => {
    const offlineClient = { start: vi.fn(), command: vi.fn(), recover: vi.fn() };
    render(<MentorDock baseUrl="" learnerId="l-1" goal="通过算法初试" route={{ kind: 'today', ref: 'daily' }} contribution={{ version: 1, id: 'route-daily', kind: 'route', priority: 80, evidenceRefs: ['route:daily'], data: { nextAction: '继续 10 分钟数组训练' } }} client={offlineClient as never} />);

    expect(screen.getByText('本地学习编排在线 · 深度代码导师未连接')).toBeTruthy();
    expect(screen.getByText('当前由本地学习证据编排')).toBeTruthy();
    expect(screen.getByText('系统仍会根据已验证的学习动作安排下一步；连接深度代码导师后，这里才会生成代码诊断与工具时间线。')).toBeTruthy();
    expect(screen.getByText('当前没有调用模型或动态工具')).toBeTruthy();
    expect(screen.getByText('继续 10 分钟数组训练')).toBeTruthy();
    expect(offlineClient.start).not.toHaveBeenCalled();
  });

  it('keeps local planning available when the configured deep Mentor connection fails', async () => {
    const failingClient = {
      start: vi.fn(async () => { throw new Error('offline'); }),
      command: vi.fn(),
      recover: vi.fn(),
    };
    render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="通过算法初试" route={{ kind: 'insights', ref: 'insights' }} contribution={{ version: 1, id: 'route-insights', kind: 'route', priority: 80, evidenceRefs: ['route:insights'], data: { nextAction: '继续当前能力短板训练' } }} client={failingClient as never} />);

    await waitFor(() => expect(screen.getByText('深度代码导师连接失败 · 本地学习编排仍可用')).toBeTruthy());
    expect(screen.getByText('当前没有调用模型或动态工具')).toBeTruthy();
    expect(screen.getByText('继续当前能力短板训练')).toBeTruthy();
    expect(screen.queryByText('导师已完成证据分析')).toBeNull();
  });

  it('requires an explicit learner decision for every proposed edit', async () => {
    const approvalClient = {
      ...client,
      recover: vi.fn(async () => ({ events: [{ id: 'e3', sequence: 3, type: 'approval-requested', detail: '{"approvalId":"edit-1","summary":"把 <= 改为 <","diff":"- <=\\n+ <"}', evidenceRefs: ['ast:8'], at: 'now', stopReason: 'awaiting-approval' }], checkpoint: { sequence: 3, nextAction: '等待你的审批' } })),
      command: vi.fn(async (_url, command) => command.kind === 'approve'
        ? { run: { id: 'run-1', learnerId: 'l-1', sequence: 4, events: [], checkpoint: { sequence: 4, nextAction: '继续验证' } } }
        : { run: { id: 'run-1', learnerId: 'l-1', sequence: 2, events: [], checkpoint: { sequence: 2, nextAction: 'ready' } } }),
    };
    render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="独立修复" route={{ kind: 'practice', ref: 'p-1' }} contribution={{ version: 1, id: 'route-p1', kind: 'route', priority: 80, evidenceRefs: ['route:p-1'], data: {} }} client={approvalClient as never} />);
    await waitFor(() => expect(screen.getByText('把 <= 改为 <')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '接受修改 edit-1' }));
    await waitFor(() => expect(approvalClient.command).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'approve', approvalId: 'edit-1', decision: 'accept' }), 'l-1'));
  });

  it('recovers new tool lifecycle after a problem Mentor advances the shared cursor', async () => {
    const recoveryClient = { ...client, command: vi.fn(), recover: vi.fn(async () => ({ events: [{ id: 'tool-9', sequence: 9, type: 'tool-completed', detail: 'verify_hypothesis · 12 ms', evidenceRefs: ['run:test-9'], at: 'now' }], checkpoint: { sequence: 9, nextAction: '先预测数组下标' } })) };
    const state = { version: 1 as const, active: { runId: 'run-1', learnerId: 'l-1', cursor: 9, checkpoint: { sequence: 9, nextAction: '先预测数组下标' }, routeKey: 'practice:p-1', scopeVersion: 2 as const }, approvals: [], experiments: [], outcomeLinks: [] };
    render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="独立修复" route={{ kind: 'practice', ref: 'p-1' }} contribution={{ version: 1, id: 'route-p1', kind: 'route', priority: 80, evidenceRefs: ['route:p-1'], data: {} }} client={recoveryClient as never} state={state} />);
    await waitFor(() => expect(screen.getByText('verify_hypothesis · 12 ms')).toBeTruthy());
    expect(screen.getByText('导师已完成证据分析')).toBeTruthy();
    expect(recoveryClient.command).not.toHaveBeenCalled();
  });

  it('replaces a stale local run when the durable server no longer has it', async () => {
    const recover = vi.fn()
      .mockRejectedValueOnce(new Error('Mentor event stream unavailable (404)'))
      .mockResolvedValueOnce({ events: [{ id: 'fresh-2', sequence: 2, type: 'context-compiled', detail: '新运行已恢复', evidenceRefs: ['route:p-1'], at: 'now' }], checkpoint: { sequence: 2, nextAction: '重新开始证据分析' } });
    const staleClient = { ...client, start: vi.fn(client.start), command: vi.fn(client.command), recover };
    const state = { version: 1 as const, active: { runId: 'missing-run', learnerId: 'l-1', cursor: 7, checkpoint: { sequence: 7, nextAction: '旧运行' }, routeKey: 'practice:p-1', scopeVersion: 2 as const }, approvals: [], experiments: [], outcomeLinks: [] };
    const onStateChange = vi.fn();
    render(<MentorDock baseUrl="http://localhost:8787" learnerId="l-1" goal="独立修复" route={{ kind: 'practice', ref: 'p-1' }} contribution={{ version: 1, id: 'route-p1', kind: 'route', priority: 80, evidenceRefs: ['route:p-1'], data: {} }} client={staleClient as never} state={state} onStateChange={onStateChange} />);
    await waitFor(() => expect(screen.getByText('重新开始证据分析')).toBeTruthy());
    expect(staleClient.start).toHaveBeenCalled();
    expect(staleClient.command).toHaveBeenCalled();
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ active: expect.objectContaining({ runId: 'run-1' }) }));
  });
});
