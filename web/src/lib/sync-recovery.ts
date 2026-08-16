export type SyncBlockedKind = 'profile' | 'event' | 'state' | 'attempt';
export type SyncReasonLabel = '记录格式需要升级' | '登录状态需要刷新' | '服务暂时不可用' | '网络连接中断' | '本机队列需要更新' | '原因正在确认';
export type SyncIssue = {
  pendingCount: number;
  categoryLabel: '账户设置' | '学习记录' | '进度快照' | '提交记录' | '同步服务';
  reasonLabel: SyncReasonLabel;
};
export type SyncRetryResult = { status: 'synced' } | { status: 'pending'; issue: SyncIssue };

const CATEGORY_LABELS: Record<SyncBlockedKind, SyncIssue['categoryLabel']> = {
  profile: '账户设置',
  event: '学习记录',
  state: '进度快照',
  attempt: '提交记录',
};

function reasonLabel(error: unknown): SyncReasonLabel {
  const message = (error instanceof Error ? error.message : typeof error === 'string' ? error : '').toLowerCase();
  if (/\binvalid(?: learning| request| learner| state| attempt)|unsupported/.test(message)) return '记录格式需要升级';
  if (/invalid-session|csrf|authentication-required|\bunauthori[sz]ed\b|\bforbidden\b/.test(message)) return '登录状态需要刷新';
  if (/learning-service-unavailable|service-unavailable|http-5\d\d/.test(message)) return '服务暂时不可用';
  if (/failed to fetch|network|offline|connection/.test(message)) return '网络连接中断';
  if (/outbox idempotency conflict|invalid state outbox/.test(message)) return '本机队列需要更新';
  return '原因正在确认';
}

export function projectSyncIssue(evidence: { remaining: number; blockedKind?: SyncBlockedKind; error?: unknown }): SyncIssue {
  const pendingCount = Number.isFinite(evidence.remaining) && Number.isInteger(evidence.remaining) && evidence.remaining > 0
    ? Math.min(evidence.remaining, 1_000)
    : 1;
  return {
    pendingCount,
    categoryLabel: evidence.blockedKind ? CATEGORY_LABELS[evidence.blockedKind] : '同步服务',
    reasonLabel: reasonLabel(evidence.error),
  };
}
