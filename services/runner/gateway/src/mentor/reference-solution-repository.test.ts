import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCorpusReferenceSolutionRepository } from './reference-solution-repository.js';

describe('corpus reference solution repository', () => {
  it('loads only supported non-empty solutions and returns no source for invalid ids', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mentor-solutions-'));
    await writeFile(join(directory, 'od-safe.json'), JSON.stringify({ id: 'od-safe', solutions: { javascript: 'console.log(1)', python: 'print(1)', ruby: 'puts 1', java: '' } }));
    const repository = createCorpusReferenceSolutionRepository(directory);
    const solutions = await repository.getSolutions('od-safe');
    expect(solutions.map((item) => item.language)).toEqual(expect.arrayContaining(['javascript', 'python']));
    expect(solutions).toHaveLength(2);
    expect(solutions.every((item) => /^[a-f0-9]{16}$/.test(item.contentDigest))).toBe(true);
    expect(await repository.getSolutions('../secret')).toEqual([]);
  });
});
