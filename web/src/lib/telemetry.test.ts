import { describe, expect, it } from 'vitest';
import { loadTelemetry, recordTelemetry, TELEMETRY_STORAGE_KEY } from './telemetry';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('local telemetry', () => {
  it('keeps product signals but strips source, stdin and execution output', () => {
    const storage = new MemoryStorage();
    recordTelemetry(storage, {
      name: 'practice-submit', problemId: 'p1', language: 'python', outcome: 'failed', durationMs: 1_500,
      sourceCode: 'TOP_SECRET_CODE', stdin: 'PRIVATE_INPUT', stdout: 'PRIVATE_OUTPUT', stderr: 'PRIVATE_ERROR',
    });
    const raw = storage.getItem(TELEMETRY_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('TOP_SECRET');
    expect(raw).not.toContain('PRIVATE');
    expect(loadTelemetry(storage).events[0]).toMatchObject({ name: 'practice-submit', problemId: 'p1', outcome: 'failed', durationBucket: '1-3s' });
  });

  it('bounds history and safely recovers from malformed local data', () => {
    const storage = new MemoryStorage();
    for (let index = 0; index < 210; index += 1) recordTelemetry(storage, { name: 'exam-start', problemId: `p${index}` });
    expect(loadTelemetry(storage).events).toHaveLength(200);
    storage.setItem(TELEMETRY_STORAGE_KEY, '{bad');
    expect(loadTelemetry(storage).events).toEqual([]);
  });
});
