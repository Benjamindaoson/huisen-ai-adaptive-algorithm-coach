// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountPanel } from './AccountPanel';

afterEach(cleanup);

describe('AccountPanel', () => {
  it('keeps anonymous storage truth local when optional cloud session restore fails', () => {
    const { container } = render(<AccountPanel session={{ authenticated: false }} onSignIn={vi.fn()} onRegister={vi.fn()} onVerify={vi.fn()} onSignOut={vi.fn()} syncStatus="error" />);

    expect(screen.getByText('仅保存在本机')).toBeTruthy();
    expect(screen.queryByText('同步待重试')).toBeNull();
    expect(container.querySelector('.account-sync.local')).toBeTruthy();
  });

  it('continues to disclose a real sync failure for an authenticated account', () => {
    const { container } = render(<AccountPanel session={{ authenticated: true, account: { id: 'user-1', roles: ['learner'] } }} onSignIn={vi.fn()} onRegister={vi.fn()} onVerify={vi.fn()} onSignOut={vi.fn()} syncStatus="error" />);

    expect(screen.getByText('同步待重试')).toBeTruthy();
    expect(container.querySelector('.account-sync.error')).toBeTruthy();
  });

  it('opens a safe recovery explanation from the error status and reports a successful retry', async () => {
    const onRetrySync = vi.fn(async () => ({ status: 'synced' as const }));
    render(<AccountPanel
      session={{ authenticated: true, account: { id: 'user-1', roles: ['learner'] } }}
      syncStatus="error"
      syncIssue={{ pendingCount: 3, categoryLabel: '学习记录', reasonLabel: '记录格式需要升级' }}
      onRetrySync={onRetrySync}
      onSignIn={vi.fn()} onRegister={vi.fn()} onVerify={vi.fn()} onSignOut={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('button', { name: '查看同步问题' }));
    expect(screen.getByText('最近的学习记录仍安全保存在这台设备上')).toBeTruthy();
    expect(screen.getByText('3 项等待同步 · 当前阻塞：学习记录')).toBeTruthy();
    expect(screen.getByText('处理建议：记录格式需要升级')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '立即重试' }));
    await waitFor(() => expect(onRetrySync).toHaveBeenCalledOnce());
    expect(await screen.findByText('云端同步已经恢复。')).toBeTruthy();
  });

  it('keeps an honest pending result after retry without exposing raw errors', async () => {
    render(<AccountPanel
      session={{ authenticated: true, account: { id: 'user-1', roles: ['learner'] } }}
      syncStatus="error"
      syncIssue={{ pendingCount: 2, categoryLabel: '进度快照', reasonLabel: '服务暂时不可用' }}
      onRetrySync={vi.fn(async () => ({ status: 'pending' as const, issue: { pendingCount: 2, categoryLabel: '进度快照' as const, reasonLabel: '服务暂时不可用' as const } }))}
      onSignIn={vi.fn()} onRegister={vi.fn()} onVerify={vi.fn()} onSignOut={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('button', { name: '查看同步问题' }));
    fireEvent.click(screen.getByRole('button', { name: '立即重试' }));
    expect(await screen.findByText('仍有 2 项等待同步，本机记录不会丢失。')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/http|stack|operation/i);
  });

  it('signs in without storing credentials in the component', async () => {
    const onSignIn = vi.fn(async () => undefined);
    render(<AccountPanel session={{ authenticated: false }} onSignIn={onSignIn} onRegister={vi.fn()} onVerify={vi.fn()} onSignOut={vi.fn()} syncStatus="local" />);
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'learner@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'correct horse battery staple' } });
    fireEvent.click(screen.getByRole('button', { name: '进入学习空间' }));
    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith({ email: 'learner@example.com', password: 'correct horse battery staple' }));
  });

  it('shows server sync state and signs out an authenticated account', async () => {
    const onSignOut = vi.fn(async () => undefined);
    render(<AccountPanel session={{ authenticated: true, account: { id: 'user-1', roles: ['learner'] } }} onSignIn={vi.fn()} onRegister={vi.fn()} onVerify={vi.fn()} onSignOut={onSignOut} syncStatus="synced" />);
    expect(screen.getByText('云端已同步')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '账户 user-1' }));
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }));
    await waitFor(() => expect(onSignOut).toHaveBeenCalledOnce());
  });

  it('continues registration through explicit email verification', async () => {
    const onVerify = vi.fn(async () => undefined);
    render(<AccountPanel session={{ authenticated: false }} onSignIn={vi.fn()} onRegister={vi.fn(async () => undefined)} onVerify={onVerify} onSignOut={vi.fn()} syncStatus="local" />);
    fireEvent.click(screen.getByRole('button', { name: '登录' })); fireEvent.click(screen.getByRole('button', { name: '注册' }));
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'learner@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'correct horse battery staple' } });
    fireEvent.click(screen.getByRole('button', { name: '创建学习账户' }));
    await screen.findByLabelText('验证令牌');
    fireEvent.change(screen.getByLabelText('验证令牌'), { target: { value: 'mail-token' } });
    fireEvent.click(screen.getByRole('button', { name: '完成验证' }));
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith('mail-token'));
  });
});
