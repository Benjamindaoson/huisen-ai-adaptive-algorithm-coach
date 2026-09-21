export const TUTOR_ROUTES = ['course', 'learning_path', 'code', 'error', 'faq', 'clarify'] as const;
export type TutorRoute = (typeof TUTOR_ROUTES)[number];

export type TutorRouteDecision = Readonly<{
  route: TutorRoute;
  confidence: number;
  reason: string;
  needsClarification: boolean;
}>;

export type TutorSourceAccess = Readonly<{
  visibility?: 'public' | 'private' | 'restricted';
  allowedUsers?: readonly string[];
}>;

export type TutorCourseDocument = TutorSourceAccess & Readonly<{
  id?: string;
  title?: string;
  text: string;
  sourcePath: string;
  sourceType?: string;
  tags?: readonly string[];
  startLine?: number;
  endLine?: number;
}>;

export type TutorCodeSymbol = TutorSourceAccess & Readonly<{
  sourcePath: string;
  symbolName: string;
  symbolType: string;
  startLine: number;
  endLine: number;
  text: string;
}>;

export type TutorFaqRecord = TutorSourceAccess & Readonly<{
  question: string;
  answer: string;
  sourcePath?: string;
}>;

export type TutorErrorRecipe = TutorSourceAccess & Readonly<{
  errorPattern: string;
  symptom?: string;
  cause: string;
  fixSteps: readonly string[];
  verifyCommand?: string;
  sourcePath?: string;
}>;

export type TutorEvidenceCandidate = TutorSourceAccess & Readonly<{
  id: string;
  text: string;
  sourcePath: string;
  sourceType: string;
  modality: 'text' | 'code';
  score: number;
  retrievalStrategy: 'course' | 'code' | 'faq' | 'error';
  title?: string;
  startLine?: number;
  endLine?: number;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type TutorBlockedEvidence = Readonly<{
  reason: 'missing_source' | 'acl_denied' | 'prompt_injection';
  id: string;
  sourcePath: string;
}>;

export type TutorCitation = Readonly<{
  sourcePath: string;
  sourceFile: string;
  sourceType: string;
  title: string;
  startLine?: number;
  endLine?: number;
  score: number;
  excerpt: string;
}>;

export type TutorGateAction = 'accept' | 'retry' | 'clarify_or_refuse' | 'clarify';

export type TutorGateDecision = Readonly<{
  action: TutorGateAction;
  reason: string;
  confidence: number;
}>;

export type TutorKnowledgeBase = Readonly<{
  courseDocuments?: readonly TutorCourseDocument[];
  codeSymbols?: readonly TutorCodeSymbol[];
  faqs?: readonly TutorFaqRecord[];
  errorRecipes?: readonly TutorErrorRecipe[];
}>;

export type TutorRequest = Readonly<{
  learnerId: string;
  skillId: string;
  query: string;
  sessionId?: string;
  userId?: string;
}>;

export type TutorTraceCandidate = Readonly<{
  id: string;
  sourcePath: string;
  sourceType: string;
  score: number;
  retrievalStrategy: string;
}>;

export type TutorTrace = Readonly<{
  traceId: string;
  sessionId: string;
  route: TutorRoute;
  routeReason: string;
  decision: TutorGateAction;
  decisionReason: string;
  candidates: readonly TutorTraceCandidate[];
  blockedEvidence: readonly TutorBlockedEvidence[];
  citationCount: number;
}>;

export type TutorResponse = Readonly<{
  answer: string;
  route: TutorRoute;
  citations: readonly TutorCitation[];
  decision: TutorGateDecision;
  needsClarification: boolean;
  trace: TutorTrace;
  evidenceEventId: string;
}>;
