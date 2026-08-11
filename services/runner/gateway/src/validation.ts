export const ALLOWED_LANGUAGES = ['java', 'python', 'javascript', 'cpp'] as const;
export type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number];
export type RunRequest = { language: AllowedLanguage; sourceCode: string; stdin: string };

const MAX_SOURCE_CHARACTERS = 50_000;
const MAX_STDIN_CHARACTERS = 10_000;

export function validateRunRequest(body: unknown): RunRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid run request');
  const request = body as Partial<RunRequest>;
  if (!ALLOWED_LANGUAGES.includes(request.language as AllowedLanguage)) throw new Error('Unsupported language');
  if (typeof request.sourceCode !== 'string') throw new Error('Source code must be a string');
  if (request.sourceCode.length > MAX_SOURCE_CHARACTERS) throw new Error(`Source code exceeds ${MAX_SOURCE_CHARACTERS} characters`);
  if (typeof request.stdin !== 'string') throw new Error('Standard input must be a string');
  if (request.stdin.length > MAX_STDIN_CHARACTERS) throw new Error(`Standard input exceeds ${MAX_STDIN_CHARACTERS} characters`);
  return { language: request.language as AllowedLanguage, sourceCode: request.sourceCode, stdin: request.stdin };
}
