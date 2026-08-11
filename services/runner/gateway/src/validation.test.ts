import { describe, expect, it } from 'vitest';
import { validateRunRequest } from './validation.js';

describe('run request validation', () => {
  it('rejects an unapproved language before it reaches Judge0', () => {
    expect(() => validateRunRequest({ language: 'bash', sourceCode: 'id', stdin: '' })).toThrow('Unsupported language');
  });

  it('rejects source exceeding the configured limit', () => {
    expect(() => validateRunRequest({ language: 'python', sourceCode: 'x'.repeat(50_001), stdin: '' })).toThrow('Source code exceeds 50000 characters');
  });

  it('accepts one of the four constrained language requests', () => {
    expect(validateRunRequest({ language: 'python', sourceCode: 'print("ok")', stdin: '' })).toEqual({ language: 'python', sourceCode: 'print("ok")', stdin: '' });
  });
});
