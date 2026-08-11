import { expect, it } from 'vitest';
import { initialEditorCode, starterCode } from './starter-code';

it('hides a legacy draft that is exactly the old prefilled reference answer', () => {
  expect(initialEditorCode('python', 'print("answer")', 'print("answer")')).toBe(starterCode('python'));
});

it('preserves a genuinely edited learner draft', () => {
  expect(initialEditorCode('python', 'print("my work")', 'print("answer")')).toBe('print("my work")');
});

it('uses a clean starter when no draft exists', () => {
  expect(initialEditorCode('python', undefined, 'print("answer")')).toBe(starterCode('python'));
});
