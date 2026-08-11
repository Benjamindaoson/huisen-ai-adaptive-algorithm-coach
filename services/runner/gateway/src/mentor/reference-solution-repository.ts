import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ALLOWED_LANGUAGES, type AllowedLanguage } from '../validation.js';
import type { ReferenceSolutionRepository } from './reference-consensus-oracle.js';

export function createCorpusReferenceSolutionRepository(problemsDirectory: string): ReferenceSolutionRepository {
  return {
    async getSolutions(problemId) {
      if (!/^od-[a-zA-Z0-9]{4,64}$/.test(problemId)) return [];
      try {
        const value = JSON.parse(await readFile(join(problemsDirectory, `${problemId}.json`), 'utf8')) as { id?: unknown; solutions?: unknown };
        if (value.id !== problemId || !value.solutions || typeof value.solutions !== 'object' || Array.isArray(value.solutions)) return [];
        return ALLOWED_LANGUAGES.flatMap((language) => {
          const sourceCode = (value.solutions as Record<string, unknown>)[language];
          if (typeof sourceCode !== 'string' || !sourceCode.trim() || sourceCode.length > 50_000) return [];
          return [{
            problemId, language: language as AllowedLanguage, sourceCode,
            contentDigest: createHash('sha256').update(language).update('\0').update(sourceCode).digest('hex').slice(0, 16),
          }];
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw error;
      }
    },
  };
}
