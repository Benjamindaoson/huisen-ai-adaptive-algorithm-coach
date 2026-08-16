import { useEffect, useState, type FormEvent } from 'react';
import type { LearnerProfile } from '../lib/learner-memory';

type GoalPatch = Pick<LearnerProfile, 'target' | 'examDate' | 'dailyMinutes' | 'preferredLanguage'>;
type Props = { profile: LearnerProfile; onSave: (patch: GoalPatch) => void };

const targetLabels: Record<LearnerProfile['target'], string> = {
  'od-exam': '通过算法初试', interview: '准备技术面试', foundation: '系统补基础',
};

export function LearnerGoalCard({ profile, onSave }: Props) {
  const [draft, setDraft] = useState<GoalPatch>(() => ({ target: profile.target, examDate: profile.examDate, dailyMinutes: profile.dailyMinutes, preferredLanguage: profile.preferredLanguage }));
  const [editing, setEditing] = useState(false);
  useEffect(() => setDraft({ target: profile.target, examDate: profile.examDate, dailyMinutes: profile.dailyMinutes, preferredLanguage: profile.preferredLanguage }), [profile]);

  function submit(event: FormEvent) { event.preventDefault(); onSave(draft); setEditing(false); }
  function changeExamDate(value: string) { setDraft((current) => ({ ...current, examDate: value || null })); }

  if (!editing) return <section className="learner-goal-card" aria-labelledby="learner-goal-title">
    <div><span className="section-kicker">学习目标</span><h2 id="learner-goal-title">{targetLabels[profile.target]}</h2><p>{profile.examDate ? `目标日期 ${profile.examDate}` : '暂未设置目标日期'} · 每天 {profile.dailyMinutes} 分钟 · {profile.preferredLanguage}</p></div>
    <button type="button" className="ghost-action" onClick={() => setEditing(true)}>调整目标</button>
  </section>;

  return <form className="learner-goal-form" onSubmit={submit} aria-label="编辑学习目标">
    <div className="goal-form-heading"><div><span className="section-kicker">学习目标</span><h2>告诉总教练你要去哪里</h2></div><button type="button" className="ghost-action" onClick={() => setEditing(false)}>取消</button></div>
    <div className="goal-fields">
      <label>目标场景<select value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value as LearnerProfile['target'] })}><option value="od-exam">通过算法初试</option><option value="interview">准备技术面试</option><option value="foundation">系统补基础</option></select></label>
      <label>目标日期<input type="date" value={draft.examDate ?? ''} onInput={(event) => changeExamDate(event.currentTarget.value)} onChange={(event) => changeExamDate(event.currentTarget.value)} /></label>
      <label>每天投入<select value={draft.dailyMinutes} onChange={(event) => setDraft({ ...draft, dailyMinutes: Number(event.target.value) })}><option value={30}>30 分钟</option><option value={45}>45 分钟</option><option value={60}>60 分钟</option><option value={90}>90 分钟</option><option value={120}>120 分钟</option></select></label>
      <label>首选语言<select value={draft.preferredLanguage} onChange={(event) => setDraft({ ...draft, preferredLanguage: event.target.value as LearnerProfile['preferredLanguage'] })}><option value="python">Python</option><option value="java">Java</option><option value="javascript">JavaScript</option><option value="cpp">C++</option></select></label>
    </div>
    <button type="submit" className="primary-action">保存目标</button>
  </form>;
}
