export type RuntimeTraceEvent = { version: 1; probeId: string; line: number; state: Record<string, string>; evidenceRef: string };

export function parseRuntimeTrace(stderr: string, options: { maxEvents?: number; maxLineLength?: number } = {}): RuntimeTraceEvent[] {
  const maxEvents = Math.max(0, Math.min(options.maxEvents ?? 24, 100));
  const maxLineLength = Math.max(256, Math.min(options.maxLineLength ?? 4_096, 16_384));
  const events: RuntimeTraceEvent[] = [];
  for (const line of stderr.replace(/\r\n?/g, '\n').split('\n')) {
    if (events.length >= maxEvents || !line.startsWith('__mentorTrace:') || line.length > maxLineLength) continue;
    try {
      const value = JSON.parse(line.slice('__mentorTrace:'.length)) as Record<string, unknown>;
      if (value.version !== 1 || typeof value.probeId !== 'string' || !/^[a-zA-Z0-9._:-]{1,100}$/.test(value.probeId) || !Number.isInteger(value.line) || (value.line as number) < 1 || !value.state || typeof value.state !== 'object' || Array.isArray(value.state)) continue;
      const entries = Object.entries(value.state as Record<string, unknown>);
      if (entries.length > 3 || entries.some(([key, item]) => !/^[A-Za-z_$][\w$]{0,79}$/.test(key) || typeof item !== 'string' || item.length > 500)) continue;
      events.push({ version: 1, probeId: value.probeId, line: value.line as number, state: Object.fromEntries(entries) as Record<string, string>, evidenceRef: `runtime:${value.probeId}:${value.line}` });
    } catch { /* ordinary learner stderr is not Mentor evidence */ }
  }
  return events;
}
