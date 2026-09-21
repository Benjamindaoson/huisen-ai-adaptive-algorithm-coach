export const TUTOR_ROUTES = ['course', 'learning_path', 'code', 'error', 'faq', 'clarify'] as const;
export type TutorRoute = (typeof TUTOR_ROUTES)[number];

export const TUTOR_ACTIONS = ['explain', 'point_to_code', 'diagnose_error', 'clarify', 'refuse'] as const;
export type TutorAction = (typeof TUTOR_ACTIONS)[number];

export type TutorSourceAccess = Readonly<{\n  visibility?: 'public' | 'private' | 'restricted';\n  allowedUsers?: readonly string[];\n}>;\n\nexport type TutorCitation = Readonly<{
  sourcePath: string;
  sourceType: string;
  title?: string;
  startLine?: number;
  endLine?: number;
  score: number;
  excerpt: string;
}>;

export type TutorCandidate = TutorSourceAccess & Readonly<{
  id: string;
  text: string;
  sourcePath: string;
  sourceType: string;
  score: number;
  title?: string;
  symbolName?: string;
  startLine?: number;
  endLine?: number;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type TutorRequest = Readonly<{
  learnerId: string;
  skillId: string;
  query: string;
  sessionId?: string;
  taskId?: string;
}>;

export type TutorResponse = Readonly<{
  route: TutorRoute;
  action: TutorAction;
  answer: string;
  citations: readonly TutorCitation[];
  needsClarification: boolean;
  evidenceDecision: 'accept' | 'clarify_or_refuse';
  traceId: string;
}>;
