import { buildCoachRequest, buildLocalDiagnosis } from '../lib/coach';
import type { ProblemRecord } from '../lib/catalog';
import type { SkillMastery } from '../lib/mastery';
import type { PracticeAttempt } from '../lib/practice';
import type { SampleSubmissionResult, SampleVerdict } from '../lib/sample-judge';

type Props = {
  submission: SampleSubmissionResult;
  attempt: PracticeAttempt;
  problem: ProblemRecord;
  mastery: SkillMastery[];
  onRetry: () => void;
  onHint: () => void;
  onReference: () => void;
};

const verdictLabels: Record<SampleVerdict, string> = {
  passed: '通过', 'wrong-answer': '答案错误', 'compile-error': '编译错误', 'runtime-error': '运行错误', timeout: '运行超时', unavailable: '服务不可用',
};

export function SubmissionFeedback({ submission, attempt, problem, mastery, onRetry, onHint, onReference }: Props) {
  const diagnosis = buildLocalDiagnosis(buildCoachRequest(problem, attempt, mastery, 1));
  return <div className={`submission-feedback ${submission.allPassed ? 'passed' : 'failed'}`}>
    <section className="verdict-summary">
      <div><span className="verdict-icon" aria-hidden="true">{submission.allPassed ? '✓' : '!'}</span><div><strong>{submission.allPassed ? '公开样例全部通过' : '公开样例未全部通过'}</strong><p>{submission.allPassed ? '结果可用于继续检查边界与复杂度，但不代表已通过隐藏测试。' : '先看第一个失败证据，再做最小修改。'}</p></div></div>
      <b>{submission.passedCount}<small> / {submission.totalCount}</small></b>
    </section>

    <div className="feedback-case-list">{submission.cases.map((caseResult) => <details className={`feedback-case ${caseResult.verdict}`} key={caseResult.caseId} open={caseResult.verdict !== 'passed'}>
      <summary><span>{caseResult.name}</span><b>{verdictLabels[caseResult.verdict]}</b>{caseResult.timeMs !== undefined && <em>{caseResult.timeMs} ms</em>}</summary>
      <div className="case-output-grid"><div><label>输入</label><pre>{caseResult.stdin}</pre></div><div><label>预期输出</label><pre>{caseResult.expectedOutput}</pre></div><div><label>实际输出</label><pre>{caseResult.actualOutput || '（无输出）'}</pre></div></div>
      {caseResult.stderr && <pre className="stderr">{caseResult.stderr}</pre>}
    </details>)}</div>

    <section className="inline-coach-card">
      <header><div><span className="ai-mark">AI</span><strong>教练诊断</strong></div><small>本地证据诊断 · 置信度 {Math.round(diagnosis.confidence * 100)}%</small></header>
      <h3>{diagnosis.diagnosis}</h3>
      <ul>{diagnosis.evidence.slice(0, 3).map((evidence) => <li key={evidence}>{evidence}</li>)}</ul>
      <p><strong>下一步：</strong>{diagnosis.nextAction}</p>
    </section>

    <div className="feedback-actions">
      <button type="button" className="primary-action" onClick={onRetry}>修正并重试</button>
      <button type="button" className="secondary-action" onClick={onHint}>给我一个提示</button>
      <button type="button" className="ghost-action" onClick={onReference}>查看参考答案</button>
    </div>
  </div>;
}
