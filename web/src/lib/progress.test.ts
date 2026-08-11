import { describe, expect, it } from 'vitest';
import { emptyProgress, importProgress } from './progress';

describe('learning-progress backups', () => {
  it('keeps the newer local record when merging an older import', () => {
    const local = {
      version: 1 as const,
      problems: {
        'od-a': {
          status: 'mastered' as const,
          starred: true,
          note: 'local note',
          updatedAt: '2026-08-10T02:00:00.000Z',
        },
      },
    };
    const imported = {
      version: 1,
      problems: {
        'od-a': {
          status: 'in-progress',
          starred: false,
          note: 'older note',
          updatedAt: '2026-08-10T01:00:00.000Z',
        },
      },
    };

    expect(importProgress(JSON.stringify(imported), 'merge', local).problems['od-a']).toEqual(local.problems['od-a']);
  });

  it('accepts newer imported records during a merge', () => {
    const imported = {
      version: 1,
      problems: {
        'od-a': {
          status: 'mastered',
          starred: false,
          note: '',
          updatedAt: '2026-08-10T03:00:00.000Z',
        },
      },
    };

    expect(importProgress(JSON.stringify(imported), 'merge', emptyProgress()).problems['od-a'].status).toBe('mastered');
  });

  it('rejects an unsupported backup version', () => {
    expect(() => importProgress('{"version":99,"problems":{}}', 'merge', emptyProgress())).toThrow('Unsupported backup version');
  });
});
