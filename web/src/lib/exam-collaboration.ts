import { isCollaborationEvent, type ExamCollaborationEvent, type ExamSession } from './exam';

export function recordCollaborationEvent(exam: ExamSession, event: ExamCollaborationEvent): ExamSession {
  if (exam.status === 'submitted') throw new Error('submitted exam cannot record collaboration evidence');
  if (exam.mode !== 'ai-collaboration') throw new Error('independent exams do not allow AI collaboration evidence');
  if (!isCollaborationEvent(event, exam.problemIds)) throw new Error('invalid collaboration evidence');
  const verified = event.evidence.filter((item) => item.source && item.artifactRef?.startsWith('exam-agent:'));
  if (!verified.some((item) => item.source === 'agent-runtime')) throw new Error('collaboration evidence must include an Agent runtime artifact');
  if (event.type === 'review') {
    const hasRuntimeDiff = verified.some((item) => item.source === 'agent-runtime' && item.kind === 'diff');
    const hasLearnerDecision = verified.some((item) => item.source === 'learner-action' && item.kind === 'learner-decision');
    if (!hasRuntimeDiff || !hasLearnerDecision) throw new Error('review evidence must bind a runtime diff to a learner decision');
  }
  if (event.type === 'oral-explanation' && !verified.some((item) => item.source === 'learner-action' && item.kind === 'oral-response')) {
    throw new Error('oral evidence must bind the learner response to an Agent runtime artifact');
  }
  if (exam.collaborationEvents.some((item) => item.id === event.id)) throw new Error('duplicate collaboration evidence id');
  return { ...exam, collaborationEvents: [...exam.collaborationEvents, event] };
}
