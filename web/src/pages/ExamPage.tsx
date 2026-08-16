import { useState } from 'react';
import type { ExamMode, ExamSession } from '../lib/exam';

type Props = { exam: ExamSession | null; starting: boolean; hiddenJudging?: boolean; onStart: (mode: ExamMode) => void; onContinue: () => void };

export function ExamPage({ exam, starting, hiddenJudging = false, onStart, onContinue }: Props) {
  const [selectedMode, setSelectedMode] = useState<ExamMode>('independent');
  const running = exam?.status === 'running';
  const reported = exam?.status === 'submitted';
  return <div className="module-page exam-page">
    <header className="module-header"><div><span className="section-kicker">ASSESSMENT</span><h1>算法初试</h1><p>用一次完整的 90 分钟机考验证稳定性；无 AI 与 AI 协作能力分开评估，不混成一个总分。</p></div></header>
    <section className="exam-entry-card">
      <div className="exam-entry-copy"><span className="task-chip">OD 机考模式</span><h2>{running ? '你的考试仍在计时' : reported ? '上一场考试报告已生成' : '准备好，像正式考试一样完成它'}</h2><p>3 道可判定题目 · 90 分钟 · 自动保存 · 考试中隐藏参考答案与学习教练</p>
        <div className="exam-features"><span>固定截止时间</span><span>断点恢复</span><span>逐题结果</span><span>能力缺口报告</span></div>
      </div>
      <div className="exam-entry-action"><strong>90<small> 分钟</small></strong><button type="button" className="primary-action" disabled={starting} onClick={running || reported ? onContinue : () => onStart(selectedMode)}>{starting ? '正在准备题目…' : running ? '继续考试 →' : reported ? '查看报告 →' : selectedMode === 'independent' ? '开始无 AI 初试 →' : '开始 AI 协作初试 →'}</button>{reported && <button type="button" className="secondary-action" onClick={() => onStart(selectedMode)}>开始新考试</button>}</div>
    </section>
    {!running && <section className="exam-mode-policies" aria-label="Exam mode policies"><button type="button" className={selectedMode === 'independent' ? 'selected' : ''} onClick={() => setSelectedMode('independent')}><strong>无 AI 模式</strong><p>导师、参考答案和历史解法全部关闭；只评估算法能力与独立完成。</p></button><button type="button" className={selectedMode === 'ai-collaboration' ? 'selected' : ''} onClick={() => setSelectedMode('ai-collaboration')}><strong>AI 协作模式</strong><p>记录计划、委派、审查、测试、纠错和口述证据；AI 协作能力单独报告。</p></button></section>}
    <section className="exam-guidance"><h2>这场考试会检验什么</h2><div><article><span>01</span><strong>准确性</strong><p>{hiddenJudging ? '可信隐藏用例逐题判定，错误会进入复盘。' : '公开样例逐题判定，错误会进入复盘。'}</p></article><article><span>02</span><strong>时间分配</strong><p>记录每题作答与整场剩余时间。</p></article><article><span>03</span><strong>压力下稳定性</strong><p>考试中不提供答案和 AI 提示。</p></article></div></section>
  </div>;
}
