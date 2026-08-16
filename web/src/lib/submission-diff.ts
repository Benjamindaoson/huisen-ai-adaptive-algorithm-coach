export type SubmissionDiffLine = { kind: 'added'; value: string; newLine: number } | { kind: 'removed'; value: string; oldLine: number };
export type SubmissionDiffHunk = { oldStart: number; newStart: number; lines: SubmissionDiffLine[] };
export type SubmissionDiff = {
  freshness: 'current' | 'stale';
  added: number;
  removed: number;
  hunks: SubmissionDiffHunk[];
  truncated: boolean;
};

function linesOf(source: string): string[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

export function buildSubmissionDiff(snapshot: string, current: string, maxLines = 400): SubmissionDiff {
  if (snapshot === current) return { freshness: 'current', added: 0, removed: 0, hunks: [], truncated: false };
  const before = linesOf(snapshot);
  const after = linesOf(current);
  if (before.length > maxLines || after.length > maxLines) {
    return { freshness: 'stale', added: after.length, removed: before.length, hunks: [], truncated: true };
  }

  const table = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1));
  for (let oldIndex = before.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = after.length - 1; newIndex >= 0; newIndex -= 1) {
      table[oldIndex][newIndex] = before[oldIndex] === after[newIndex]
        ? table[oldIndex + 1][newIndex + 1] + 1
        : Math.max(table[oldIndex + 1][newIndex], table[oldIndex][newIndex + 1]);
    }
  }

  const hunks: SubmissionDiffHunk[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let currentHunk: SubmissionDiffHunk | null = null;
  let added = 0;
  let removed = 0;
  const append = (line: SubmissionDiffLine) => {
    if (!currentHunk) {
      currentHunk = { oldStart: oldIndex + 1, newStart: newIndex + 1, lines: [] };
      hunks.push(currentHunk);
    }
    currentHunk.lines.push(line);
  };

  while (oldIndex < before.length || newIndex < after.length) {
    if (oldIndex < before.length && newIndex < after.length && before[oldIndex] === after[newIndex]) {
      oldIndex += 1;
      newIndex += 1;
      currentHunk = null;
    } else if (newIndex < after.length && (oldIndex === before.length || table[oldIndex][newIndex + 1] > table[oldIndex + 1][newIndex])) {
      append({ kind: 'added', value: after[newIndex], newLine: newIndex + 1 });
      added += 1;
      newIndex += 1;
    } else {
      append({ kind: 'removed', value: before[oldIndex], oldLine: oldIndex + 1 });
      removed += 1;
      oldIndex += 1;
    }
  }
  return { freshness: 'stale', added, removed, hunks, truncated: false };
}
