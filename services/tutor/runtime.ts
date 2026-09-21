import { EVIDENCE_EVENT_CONTRACT_VERSION, type EvidenceDomain, type EvidenceEvent } from '../../contracts/evidence-event';
import { AI_DOMAINS } from '../../contracts/skill-node';
import { InMemoryEvidenceStore, type EvidenceStore } from '../../packages/evidence/evidence-store';
import { buildTutorCitations } from './citations';
import type {
  TutorEvidenceCandidate,
  TutorGateDecision,
  TutorKnowledgeBase,
  TutorRequest,
  TutorResponse,
  TutorRouteDecision,
} from './contracts';
import { decideTutorEvidence } from './evidence-gate';
import { matchErrorRecipe, matchFaq, searchCodeSymbols, searchCourseDocuments } from './retrievers';
import { routeTutorQuery } from './router';
import { filterTutorEvidence } from './safety';

export type TutorRuntimeOptions = Readonly<{
  knowledge?: TutorKnowledgeBase;
  evidenceStore?: EvidenceStore;
  createTraceId?: () => string;
  now?: () => string;
}>;

function domainFromSkillId(skillId: string): EvidenceDomain {
  const prefix = skillId.split('.')[0];
  if (AI_DOMAINS.includes(prefix as (typeof AI_DOMAINS)[number])) {
    return prefix as EvidenceDomain;
  }
  if (prefix === 'embodied') return 'embodied-ai';
  return 'legacy';
}

function candidateSummary(candidate: TutorEvidenceCandidate) {
  return {
    id: candidate.id,
    sourcePath: candidate.sourcePath,
    sourceType: candidate.sourceType,
    score: candidate.score,
    retrievalStrategy: candidate.retrievalStrategy,
  };
}

function groundedAnswer(route: TutorRouteDecision['route'], candidates: readonly TutorEvidenceCandidate[]): string {
  const first = candidates[0];
  if (!first) return 'I found no usable evidence.';

  if (route === 'code') {
    const symbolName = String(first.metadata?.symbolName ?? 'The symbol');
    return `${symbolName} is defined in ${first.sourcePath}:${first.startLine ?? '?'}. Check the cited source before changing the code.`;
  }

  if (route === 'faq') return first.text;

  if (route === 'error') {
    const cause = String(first.metadata?.cause ?? '');
    const rawSteps = first.metadata?.fixSteps;
    const steps = Array.isArray(rawSteps) ? rawSteps.map(String).join('; ') : '';
    const verify = String(first.metadata?.verifyCommand ?? '');
    return [
      cause ? `Likely cause: ${cause}.` : '',
      steps ? `Fix: ${steps}.` : '',
      verify ? `Verify with: ${verify}.` : '',
    ].filter(Boolean).join(' ');
  }

  const lines = candidates.slice(0, 3).map((candidate) => {
    const title = candidate.title || candidate.sourcePath || 'course evidence';
    const compact = candidate.text.replace(/\s+/g, ' ').trim();
    const excerpt = compact.length <= 420 ? compact : `${compact.slice(0, 419)}…`;
    return `- ${title}: ${excerpt}`;
  });
  return `Based on the cited learning evidence:\n${lines.join('\n')}`;
}

export class TutorRuntime {
  readonly evidenceStore: EvidenceStore;
  private readonly knowledge: TutorKnowledgeBase;
  private readonly createTraceId: () => string;
  private readonly now: () => string;
  private sequence = 0;

  constructor(options: TutorRuntimeOptions = {}) {
    this.knowledge = options.knowledge ?? {};
    this.evidenceStore = options.evidenceStore ?? new InMemoryEvidenceStore();
    this.createTraceId = options.createTraceId ?? (() => `tutor-${Date.now()}-${++this.sequence}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  answer(request: TutorRequest): TutorResponse {
    if (!request.learnerId.trim()) throw new Error('TutorRequest.learnerId is required');
    if (!request.skillId.trim()) throw new Error('TutorRequest.skillId is required');
    if (!request.query.trim()) throw new Error('TutorRequest.query is required');

    const startedRoute = routeTutorQuery(request.query);
    const prefetchedError = matchErrorRecipe(request.query, this.knowledge.errorRecipes ?? []);
    const prefetchedFaq = matchFaq(request.query, this.knowledge.faqs ?? [], 0.58);

    let route: TutorRouteDecision = startedRoute;
    if (prefetchedError) {
      route = { route: 'error', confidence: 0.95, reason: 'matched_error_recipe', needsClarification: false };
    } else if (prefetchedFaq && route.route === 'course') {
      route = { route: 'faq', confidence: 0.9, reason: 'matched_faq_record', needsClarification: false };
    }

    const rawCandidates = route.needsClarification
      ? []
      : this.retrieve(request.query, route.route, prefetchedFaq, prefetchedError);
    const filtered = filterTutorEvidence(rawCandidates, request.userId);
    const gate: TutorGateDecision = route.needsClarification
      ? { action: 'clarify', reason: route.reason, confidence: route.confidence }
      : decideTutorEvidence(filtered.allowed, filtered.blocked);

    const citations = buildTutorCitations(filtered.allowed);
    const needsClarification = gate.action !== 'accept';
    const answer = route.needsClarification
      ? 'Please add the AI topic, code file, full error, or concept you want explained.'
      : gate.action === 'accept'
        ? groundedAnswer(route.route, filtered.allowed)
        : 'I do not have enough safe, cited evidence to answer this reliably. Add a course note, code file, full error, or more runtime context.';

    const traceId = this.createTraceId();
    const trace = {
      traceId,
      sessionId: request.sessionId ?? '',
      route: route.route,
      routeReason: route.reason,
      decision: gate.action,
      decisionReason: gate.reason,
      candidates: filtered.allowed.map(candidateSummary),
      blockedEvidence: filtered.blocked,
      citationCount: citations.length,
    } as const;

    const evidenceEvent: EvidenceEvent = {
      contractVersion: EVIDENCE_EVENT_CONTRACT_VERSION,
      id: `${traceId}:evidence`,
      learnerId: request.learnerId,
      skillId: request.skillId,
      sessionId: request.sessionId,
      domain: domainFromSkillId(request.skillId),
      activityType: 'learn',
      evidenceType: 'retrieval_trace',
      score: gate.confidence,
      passed: gate.action === 'accept',
      traceRef: traceId,
      result: `${route.route}:${gate.action}`,
      provenance: {
        source: 'tutor-runtime',
        sourceId: traceId,
        adapter: 'stuck-to-ship-p2',
      },
      metadata: {
        route: route.route,
        routeReason: route.reason,
        decision: gate.action,
        decisionReason: gate.reason,
        candidateCount: filtered.allowed.length,
        citationCount: citations.length,
        blockedReasons: filtered.blocked.map((item) => item.reason),
        needsClarification,
      },
      createdAt: this.now(),
    };
    this.evidenceStore.append(evidenceEvent);

    return {
      answer,
      route: route.route,
      citations,
      decision: gate,
      needsClarification,
      trace,
      evidenceEventId: evidenceEvent.id,
    };
  }

  private retrieve(
    query: string,
    route: TutorRouteDecision['route'],
    prefetchedFaq?: TutorEvidenceCandidate,
    prefetchedError?: TutorEvidenceCandidate,
  ): TutorEvidenceCandidate[] {
    if (route === 'code') return searchCodeSymbols(query, this.knowledge.codeSymbols ?? []);
    if (route === 'faq') {
      const item = prefetchedFaq ?? matchFaq(query, this.knowledge.faqs ?? [], 0.58);
      return item ? [item] : [];
    }
    if (route === 'error') {
      const item = prefetchedError ?? matchErrorRecipe(query, this.knowledge.errorRecipes ?? []);
      return item ? [item] : [];
    }
    if (route === 'course' || route === 'learning_path') {
      return searchCourseDocuments(query, this.knowledge.courseDocuments ?? [], route);
    }
    return [];
  }
}
