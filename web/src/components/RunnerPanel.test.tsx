// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe,expect,it,vi } from 'vitest';
import { RunnerPanel } from './RunnerPanel';

const problem={id:'od-1',title:'题',sourcePaths:[],sourceKinds:[],score:100,collection:'OD',sections:{examples:[]},solutions:{python:'print(1)'},tags:[],completeness:'complete' as const};
const base={problem,language:'python' as const,sourceCode:'print(1)',sampleCases:[],attempts:[],mastery:[],onAttempt:vi.fn(),onReference:vi.fn()};

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('RunnerPanel durable submission action',()=>{
  it('shows authenticated hidden judging separately from public sample checks',()=>{
    const html=renderToStaticMarkup(<RunnerPanel {...base} onHiddenSubmit={vi.fn()} />);
    expect(html).toContain('隐藏提交');expect(html).toContain('样例提交');
  });
  it('explains that hidden judging requires a signed-in backend',()=>{
    const html=renderToStaticMarkup(<RunnerPanel {...base} />);
    expect(html).toContain('登录后可用隐藏判题');
  });

  it('keeps an unavailable run recoverable without pretending it is a code failure', async () => {
    vi.stubEnv('VITE_RUNNER_URL', 'http://127.0.0.1:8787');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    render(<RunnerPanel {...base} />);

    fireEvent.click(screen.getByRole('button', { name: '▶ 运行' }));

    await waitFor(() => expect(screen.queryByText('代码已保留，没有判定你的算法对错。')).not.toBeNull());
    expect(screen.queryByRole('button', { name: '重新连接并运行' })).not.toBeNull();
    expect(screen.queryByText('运行服务暂时无法连接')).not.toBeNull();
    expect(screen.queryByText('答案错误')).toBeNull();
  });
});
