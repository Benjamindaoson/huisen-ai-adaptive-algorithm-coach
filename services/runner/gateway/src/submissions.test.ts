import { describe, expect, it, vi } from 'vitest';
import { createSubmissionService, validateSubmissionRequest } from './submissions.js';

describe('validateSubmissionRequest', () => {
  it('accepts only a problem id, approved language and bounded source', () => {
    expect(validateSubmissionRequest({ problemId: 'p1', language: 'python', sourceCode: 'print(1)' })).toEqual({ problemId: 'p1', language: 'python', sourceCode: 'print(1)' });
    expect(() => validateSubmissionRequest({ problemId: '../secret', language: 'python', sourceCode: 'x' })).toThrow('problem');
    expect(() => validateSubmissionRequest({ problemId: 'p1', language: 'ruby', sourceCode: 'x' })).toThrow('language');
    expect(() => validateSubmissionRequest({ problemId: 'p1', language: 'python', sourceCode: 'x', hiddenTests: [] })).toThrow('Unknown');
  });
});

describe('submission service', () => {
  it('runs private cases asynchronously and exposes only aggregate results', async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ kind: 'success', stdout: 'ok\n', stderr: '', timeMs: 4 })
      .mockResolvedValueOnce({ kind: 'success', stdout: 'bad', stderr: '', timeMs: 6 });
    const service = createSubmissionService({
      lookupTests: () => [{ stdin: 'SECRET-A', expectedOutput: 'ok' }, { stdin: 'SECRET-B', expectedOutput: 'expected' }],
      execute,
      createId: () => 'submission-1',
      now: () => 1_000,
    });

    const queued = service.submit({ problemId: 'p1', language: 'python', sourceCode: 'user code' });
    expect(queued).toMatchObject({ id: 'submission-1', status: 'queued', problemId: 'p1' });
    expect(JSON.stringify(queued)).not.toContain('SECRET');

    await service.settle('submission-1');
    const result = service.get('submission-1');
    expect(result).toMatchObject({ status: 'failed', passedCount: 1, totalCount: 2, timeMs: 10 });
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect(JSON.stringify(result)).not.toContain('expected');
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('rejects an unknown problem before any execution', () => {
    const execute = vi.fn();
    const service = createSubmissionService({ lookupTests: () => undefined, execute });
    expect(() => service.submit({ problemId: 'unknown', language: 'python', sourceCode: 'x' })).toThrow('Unknown problem');
    expect(execute).not.toHaveBeenCalled();
  });
});
