import type { ExamSession } from '../lib/exam';

type Props = { exam: ExamSession | null; starting: boolean; onStart: () => void; onContinue: () => void };

export function ExamPage({ exam, starting, onStart, onContinue }: Props) {
  const running = exam?.status === 'running';
  const reported = exam?.status === 'submitted';
  return <div className="module-page exam-page">
    <header className="module-header"><div><span className="section-kicker">MOCK EXAM</span><h1>模拟考试</h1><p>用一次完整的 90 分钟机考验证稳定性，而不是只看会不会做。</p></div></header>
    <section className="exam-entry-card">
      <div className="exam-entry-copy"><span className="task-chip">OD 机考模式</span><h2>{running ? '你的考试仍在计时' : reported ? '上一场考试报告已生成' : '准备好，像正式考试一样完成它'}</h2><p>3 道可判定题目 · 90 分钟 · 自动保存 · 考试中隐藏参考答案与学习教练</p>
        <div className="exam-features"><span>固定截止时间</span><span>断点恢复</span><span>逐题结果</span><span>能力缺口报告</span></div>
      </div>
      <div className="exam-entry-action"><strong>90<small> 分钟</small></strong><button type="button" className="primary-action" disabled={starting} onClick={running || reported ? onContinue : onStart}>{starting ? '正在准备题目…' : running ? '继续考试 →' : reported ? '查看报告 →' : '开始模拟考试 →'}</button>{reported && <button type="button" className="secondary-action" onClick={onStart}>开始新考试</button>}</div>
    </section>
    <section className="exam-guidance"><h2>这场考试会检验什么</h2><div><article><span>01</span><strong>准确性</strong><p>公开样例逐题判定，错误会进入复盘。</p></article><article><span>02</span><strong>时间分配</strong><p>记录每题作答与整场剩余时间。</p></article><article><span>03</span><strong>压力下稳定性</strong><p>考试中不提供答案和 AI 提示。</p></article></div></section>
  </div>;
}
