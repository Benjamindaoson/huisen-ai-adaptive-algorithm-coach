import { describe, expect, it } from 'vitest';
import { projectSyncIssue } from './sync-recovery';

describe('safe sync recovery projection', () => {
  it.each([
    ['event', '学习记录'],
    ['state', '进度快照'],
    ['profile', '账户设置'],
    ['attempt', '提交记录'],
    [undefined, '同步服务'],
  ] as const)('maps %s to a bounded category', (blockedKind, categoryLabel) => {
    expect(projectSyncIssue({ remaining: 3, blockedKind, error: 'POST https://private.internal/token secret stack' })).toEqual({
      pendingCount: 3,
      categoryLabel,
      reasonLabel: '原因正在确认',
    });
  });

  it('drops hostile raw failure detail and bounds invalid counts', () => {
    const issue = projectSyncIssue({ remaining: Number.POSITIVE_INFINITY, blockedKind: 'event', error: 'https://private.internal Authorization: bearer-secret' });
    expect(issue).toEqual({ pendingCount: 1, categoryLabel: '学习记录', reasonLabel: '原因正在确认' });
    expect(JSON.stringify(issue)).not.toMatch(/private|Authorization|secret|https/);
  });

  it.each([
    ['Invalid learning event data at https://private.internal', '记录格式需要升级'],
    ['invalid-session-or-csrf bearer-secret', '登录状态需要刷新'],
    ['learning-service-unavailable stack trace', '服务暂时不可用'],
    ['Failed to fetch private.internal', '网络连接中断'],
    ['Outbox idempotency conflict secret payload', '本机队列需要更新'],
  ] as const)('maps raw failure to bounded reason: %s', (error, reasonLabel) => {
    const issue = projectSyncIssue({ remaining: 2, blockedKind: 'event', error });
    expect(issue.reasonLabel).toBe(reasonLabel);
    expect(JSON.stringify(issue)).not.toContain(error);
  });
});
