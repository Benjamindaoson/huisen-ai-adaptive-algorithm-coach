import { useState, type FormEvent } from 'react';
import type { PlatformSession } from '../lib/platform-client';
import type { SyncIssue, SyncRetryResult } from '../lib/sync-recovery';

type Props = {
  session: PlatformSession;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  syncIssue?: SyncIssue | null;
  onRetrySync?: () => Promise<SyncRetryResult>;
  onSignIn: (input: { email: string; password: string }) => Promise<void>;
  onRegister: (input: { email: string; password: string }) => Promise<string | undefined | void>;
  onVerify: (token: string) => Promise<void>;
  onSignOut: () => Promise<void>;
};

const syncLabels = { local: '仅保存在本机', syncing: '正在同步', synced: '云端已同步', error: '同步待重试' } as const;

export function AccountPanel({ session, syncStatus, syncIssue, onRetrySync, onSignIn, onRegister, onVerify, onSignOut }: Props) {
  const visibleSyncStatus = session.authenticated ? syncStatus : 'local';
  const [open, setOpen] = useState(false); const [mode, setMode] = useState<'signin' | 'register' | 'verify'>('signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [retrying, setRetrying] = useState(false); const [retryMessage, setRetryMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'signin') { await onSignIn({ email, password }); setOpen(false); }
      else if (mode === 'register') { const developmentToken = await onRegister({ email, password }); if (developmentToken) setVerificationToken(developmentToken); setMessage(developmentToken ? '本地开发验证令牌已自动填入。' : '验证邮件已发送。请输入邮件中的一次性验证令牌。'); setMode('verify'); }
      else { await onVerify(verificationToken); setMessage('邮箱验证成功，现在可以登录。'); setMode('signin'); setVerificationToken(''); }
      setPassword('');
    } catch (error) { setMessage(error instanceof Error ? error.message : '账户服务暂时不可用'); }
    finally { setBusy(false); }
  }
  async function retrySync() {
    if (!onRetrySync || retrying) return;
    setRetrying(true); setRetryMessage('');
    try {
      const result = await onRetrySync();
      setRetryMessage(result.status === 'synced'
        ? '云端同步已经恢复。'
        : `仍有 ${result.issue.pendingCount} 项等待同步，本机记录不会丢失。`);
    } catch {
      setRetryMessage('重试尚未完成，本机记录仍然安全。');
    } finally { setRetrying(false); }
  }
  const visibleIssue = syncIssue ?? { pendingCount: 1, categoryLabel: '同步服务' as const, reasonLabel: '原因正在确认' as const };
  return <div className="account-control">
    {session.authenticated && visibleSyncStatus === 'error'
      ? <button type="button" className="account-sync error" aria-label="查看同步问题" onClick={() => setOpen(true)}><i />{syncLabels.error}</button>
      : <span className={`account-sync ${visibleSyncStatus}`}><i />{syncLabels[visibleSyncStatus]}</span>}
    <button type="button" className="account-trigger" onClick={() => setOpen((value) => !value)}>
      {session.authenticated ? `账户 ${session.account?.id.slice(0, 8)}` : '登录'}
    </button>
    {open && <div className="account-popover" role="dialog" aria-label="学习账户">
      {session.authenticated ? <>
        <span className="account-kicker">SERVER IDENTITY</span>
        <strong>{session.account?.id}</strong>
        <p>进度由服务端保存；离线草稿会在恢复连接后继续同步。</p>
        {visibleSyncStatus === 'error' && <section className="account-sync-recovery" aria-label="同步恢复">
          <span>本机保护已开启</span>
          <strong>最近的学习记录仍安全保存在这台设备上</strong>
          <p>云端暂未确认完成，不会把“待同步”说成“已保存”。恢复连接后系统会继续尝试。</p>
          <small>{visibleIssue.pendingCount} 项等待同步 · 当前阻塞：{visibleIssue.categoryLabel}</small>
          <small>处理建议：{visibleIssue.reasonLabel}</small>
          <button type="button" onClick={() => void retrySync()} disabled={retrying || !onRetrySync}>{retrying ? '正在重试…' : '立即重试'}</button>
          {retryMessage && <p className="account-retry-message" role="status">{retryMessage}</p>}
        </section>}
        <button type="button" className="account-secondary" onClick={() => void onSignOut().then(() => setOpen(false))}>退出登录</button>
      </> : <>
        <div className="account-tabs">
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>登录</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          {mode === 'verify' ? <label>验证令牌<input aria-label="验证令牌" type="text" autoComplete="one-time-code" value={verificationToken} onChange={(event) => setVerificationToken(event.target.value)} required /></label> : <>
            <label>邮箱<input aria-label="邮箱" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>密码<input aria-label="密码" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          </>}
          <button type="submit" className="account-primary" disabled={busy}>{busy ? '请稍候…' : mode === 'signin' ? '进入学习空间' : mode === 'register' ? '创建学习账户' : '完成验证'}</button>
        </form>
        {message && <p className="account-message" role="status">{message}</p>}
      </>}
    </div>}
  </div>;
}
