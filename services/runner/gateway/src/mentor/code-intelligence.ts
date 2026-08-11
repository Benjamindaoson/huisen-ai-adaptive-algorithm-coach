import type { ParsedProgramEvidence, SourceRange, StructuralKind } from './code-parser.js';

export type ControlFlowNode = { id: string; kind: StructuralKind; range: SourceRange; label: string };
export type ControlFlowEdge = { from: string; to: string; label: 'next' | 'true' | 'false' | 'repeat' | 'exit' };
export type SymbolEvidence = { name: string; definitions: number[]; uses: number[]; evidenceRefs: string[] };
export type StructuralHypothesis = { id: string; message: string; status: 'unverified'; evidenceRefs: string[] };
export type CodeIntelligenceReport = {
  version: 1;
  parser: string;
  degraded: boolean;
  controlFlow: { nodes: ControlFlowNode[]; edges: ControlFlowEdge[] };
  symbols: SymbolEvidence[];
  hypotheses: StructuralHypothesis[];
};
export type CounterexampleCandidate = { id: string; input: string; rationale: string; authority: 'candidate' };
export type ExecutionObservation = { kind: 'success' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable'; stdout: string; stderr?: string };
export type ExpectedAuthority = 'human-reviewed' | 'reference-consensus' | 'candidate' | 'unverified';
export type ExpectedObservation = {
  output: string;
  evidenceRef: string;
  authority: ExpectedAuthority;
  provenance?: { digest: string; attemptedLanguages: string[]; successfulLanguages: string[] };
};
export type VerifiedHypothesis = {
  hypothesisId: string;
  status: 'supported' | 'unverified';
  evidenceRefs: string[];
  candidateRef?: string;
  expected?: string;
  expectedAuthority?: ExpectedAuthority;
  actual?: string;
  missingEvidence?: string;
};
export type RuntimeProbe = { id: string; line: number; purpose: string; evidenceRef: string; expressions: string[] };
export type InstrumentedSource = {
  originalSource: string;
  instrumentedSource: string;
  traceRefs: string[];
  authority: 'diagnostic-only';
};

const KEYWORDS = new Set(['function', 'return', 'const', 'let', 'var', 'for', 'while', 'if', 'else', 'class', 'static', 'int', 'long', 'double', 'float', 'bool', 'boolean', 'String', 'def', 'in', 'range', 'public', 'private', 'void', 'auto', 'std']);

function uniqueLines(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function symbols(sourceCode: string): SymbolEvidence[] {
  const state = new Map<string, { definitions: number[]; uses: number[] }>();
  sourceCode.replace(/\r\n?/g, '\n').split('\n').forEach((line, index) => {
    const lineNumber = index + 1;
    const definitions = new Set<string>();
    const definitionOffsets = new Set<number>();
    const declaration = /\b(?:let|const|var|int|long|double|float|bool|boolean|String|auto)\s+([A-Za-z_$][\w$]*)/g;
    for (const match of line.matchAll(declaration)) {
      definitions.add(match[1]);
      definitionOffsets.add((match.index ?? 0) + match[0].lastIndexOf(match[1]));
    }
    const python = line.match(/^\s*([A-Za-z_]\w*)\s*=(?!=)/);
    if (python) { definitions.add(python[1]); definitionOffsets.add(line.indexOf(python[1])); }
    for (const match of line.matchAll(/\b([A-Za-z_$][\w$]*)\s*=(?!=)/g)) {
      definitions.add(match[1]); definitionOffsets.add(match.index ?? line.indexOf(match[1]));
    }
    for (const name of definitions) {
      const current = state.get(name) ?? { definitions: [], uses: [] };
      current.definitions.push(lineNumber);
      state.set(name, current);
    }
    for (const match of line.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const name = match[0];
      if (KEYWORDS.has(name) || definitionOffsets.has(match.index ?? -1)) continue;
      const current = state.get(name) ?? { definitions: [], uses: [] };
      current.uses.push(lineNumber);
      state.set(name, current);
    }
  });
  return [...state.entries()]
    .filter(([, value]) => value.definitions.length > 0)
    .map(([name, value]) => ({
      name, definitions: uniqueLines(value.definitions), uses: uniqueLines(value.uses),
      evidenceRefs: uniqueLines([...value.definitions, ...value.uses]).map((line) => `code:line:${line}`),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function analyzeProgram(input: { parsed: ParsedProgramEvidence; sourceCode: string }): CodeIntelligenceReport {
  const nodes = input.parsed.nodes
    .filter((node) => ['function', 'loop', 'branch', 'return'].includes(node.kind))
    .map((node) => ({ id: node.id, kind: node.kind, range: node.range, label: node.text }))
    .sort((left, right) => left.range.startLine - right.range.startLine || left.range.startColumn - right.range.startColumn)
    .slice(0, 100);
  const edges: ControlFlowEdge[] = [];
  nodes.forEach((node, index) => {
    const next = nodes[index + 1];
    const afterNext = nodes[index + 2];
    if (next && node.kind !== 'return') edges.push({ from: node.id, to: next.id, label: node.kind === 'branch' ? 'true' : node.kind === 'loop' ? 'exit' : 'next' });
    if (node.kind === 'branch' && afterNext) edges.push({ from: node.id, to: afterNext.id, label: 'false' });
    if (node.kind === 'loop') edges.push({ from: node.id, to: node.id, label: 'repeat' });
  });
  const hypotheses: StructuralHypothesis[] = [];
  if (input.parsed.degraded) hypotheses.push({ id: 'hypothesis:parse-degraded', message: '代码包含不完整语法，需要编译结果进一步确认。', status: 'unverified', evidenceRefs: input.parsed.errors.map((item) => item.evidenceRef) });
  const loops = nodes.filter((node) => node.kind === 'loop');
  if (loops.length >= 2) hypotheses.push({ id: 'hypothesis:nested-loop-cost', message: '多个循环区域可能形成高开销路径；还需要输入规模与运行时证据。', status: 'unverified', evidenceRefs: loops.map((node) => node.id) });
  const branches = nodes.filter((node) => node.kind === 'branch');
  if (branches.length) hypotheses.push({ id: 'hypothesis:branch-boundary', message: '分支边界需要用零值、单元素和极值输入验证。', status: 'unverified', evidenceRefs: branches.map((node) => node.id) });
  return { version: 1, parser: input.parsed.parser, degraded: input.parsed.degraded, controlFlow: { nodes, edges }, symbols: symbols(input.sourceCode), hypotheses };
}

export function planRuntimeProbes(report: CodeIntelligenceReport): RuntimeProbe[] {
  return report.controlFlow.nodes
    .filter((node) => node.kind === 'loop' || node.kind === 'branch' || node.kind === 'return')
    .slice(0, 8)
    .map((node, index) => ({
      id: `probe:${index + 1}`, line: node.range.startLine, purpose: `observe-${node.kind}-state`, evidenceRef: node.id,
      expressions: report.symbols.filter((symbol) => symbol.definitions.some((line) => line < node.range.startLine)).map((symbol) => symbol.name).slice(0, 3),
    }));
}

function traceStatement(language: 'javascript' | 'python' | 'java' | 'cpp', probe: RuntimeProbe): string {
  const base = { version: 1, probeId: probe.id, line: probe.line };
  if (language === 'javascript') {
    const state = probe.expressions.map((name) => `${JSON.stringify(name)}:String(${name})`).join(',');
    return `console.error("__mentorTrace:"+JSON.stringify({...${JSON.stringify(base)},state:{${state}}}));`;
  }
  if (language === 'python') {
    const state = probe.expressions.map((name) => `${JSON.stringify(name)}:repr(${name})`).join(',');
    return `print("__mentorTrace:"+__mentor_json.dumps({**${JSON.stringify(base)},"state":{${state}}}, ensure_ascii=False), file=__mentor_sys.stderr)`;
  }
  if (language === 'java') {
    const state = probe.expressions.map((name) => `\\"${name}\\":\\"" + String.valueOf(${name}).replace("\\\\", "\\\\\\\\").replace("\\\"", "\\\\\\\"") + "\\"`).join(',');
    return `System.err.println("__mentorTrace:{\\"version\\":1,\\"probeId\\":\\"${probe.id}\\",\\"line\\":${probe.line},\\"state\\":{${state}}}");`;
  }
  const state = probe.expressions.map((name) => `"\\"${name}\\":\\"" << ${name} << "\\""`).join(' << "," << ');
  return `std::cerr << "__mentorTrace:{\\"version\\":1,\\"probeId\\":\\"${probe.id}\\",\\"line\\":${probe.line},\\"state\\":{" << ${state || '""'} << "}}" << std::endl;`;
}

function methodBodyOffset(sourceCode: string): number | null {
  const match = /\b(?:main|solve)\s*\([^)]*\)(?:\s*throws\s+[\w.,\s]+)?\s*\{/m.exec(sourceCode);
  if (!match) return null;
  return (match.index ?? 0) + match[0].lastIndexOf('{') + 1;
}

/**
 * Creates a disposable diagnostic copy. The learner's original source is retained
 * verbatim and remains the only source used for verdicts.
 */
export function instrumentSource(input: {
  language: 'javascript' | 'python' | 'java' | 'cpp';
  sourceCode: string;
  probes: RuntimeProbe[];
}): InstrumentedSource {
  const probes = input.probes.slice(0, 8);
  if (!probes.length) return { originalSource: input.sourceCode, instrumentedSource: input.sourceCode, traceRefs: [], authority: 'diagnostic-only' };
  let source = input.sourceCode.replace(/\r\n?/g, '\n');
  const statements = probes.map((probe) => traceStatement(input.language, probe));
  if (input.language === 'python') {
    const lines = source.split('\n');
    const insertions = new Map<number, string[]>();
    probes.forEach((probe, index) => {
      const targetIndex = Math.max(0, Math.min(lines.length - 1, probe.line - 1));
      const indent = lines[targetIndex]?.match(/^\s*/)?.[0] ?? '';
      const current = insertions.get(targetIndex) ?? [];
      current.push(`${indent}${statements[index]}`);
      insertions.set(targetIndex, current);
    });
    const output: string[] = ['import sys as __mentor_sys', 'import json as __mentor_json'];
    for (let index = 0; index < lines.length; index += 1) {
      for (const statement of insertions.get(index) ?? []) output.push(statement);
      output.push(lines[index]);
    }
    source = output.join('\n');
  } else {
    const lines = source.split('\n');
    const bodyOffset = input.language === 'java' || input.language === 'cpp' ? methodBodyOffset(source) : null;
    const bodyLine = bodyOffset === null ? -1 : source.slice(0, bodyOffset).split('\n').length;
    const bodyProbes = probes.filter((probe) => probe.line <= bodyLine);
    probes.filter((probe) => probe.line > bodyLine).slice().sort((left, right) => right.line - left.line).forEach((probe) => {
      const targetIndex = Math.max(0, Math.min(lines.length, probe.line - 1));
      const indent = lines[targetIndex]?.match(/^\s*/)?.[0] ?? '';
      lines.splice(targetIndex, 0, `${indent}${traceStatement(input.language, probe)}`);
    });
    source = lines.join('\n');
    if (bodyProbes.length) {
      const offset = methodBodyOffset(source);
      if (offset !== null) source = `${source.slice(0, offset)}\n${bodyProbes.map((probe) => traceStatement(input.language, probe)).join('\n')}\n${source.slice(offset)}`;
    }
    if (input.language === 'cpp' && !/#include\s*[<"]iostream[>"]/.test(source)) source = `#include <iostream>\n${source}`;
  }
  return { originalSource: input.sourceCode, instrumentedSource: source, traceRefs: probes.map((probe) => probe.id), authority: 'diagnostic-only' };
}

function candidatesFrom(input: string): string[] {
  const lines = input.replace(/\r\n?/g, '\n').trim().split('\n');
  const numeric = /^-?\d+(?:\s+-?\d+)*$/;
  const variants = [
    lines.join('\n'),
    lines.map((line) => numeric.test(line.trim()) ? line.trim().split(/\s+/).map(() => '0').join(' ') : line).join('\n'),
    lines.map((line, index) => index === 0 && /^\d+$/.test(line.trim()) ? '1' : index === 1 && numeric.test(line.trim()) ? line.trim().split(/\s+/)[0] : line).join('\n'),
    lines.map((line) => numeric.test(line.trim()) ? line.trim().split(/\s+/).reverse().join(' ') : line).join('\n'),
    lines.map((line) => numeric.test(line.trim()) ? line.trim().split(/\s+/).map((token, index, all) => index ? all[0] : token).join(' ') : line).join('\n'),
  ];
  return variants.map((value) => value.slice(0, 2_000));
}

export function planCounterexamples(input: { inputDescription: string; publicInputs: string[] }): CounterexampleCandidate[] {
  const seed = input.publicInputs.find((value) => value.trim()) ?? (/数字|整数|n\b/i.test(input.inputDescription) ? '1\n0' : 'a');
  const values = [...new Set(candidatesFrom(seed).filter((value) => value.trim()))].slice(0, 5);
  const rationales = ['reviewed public shape', 'zero boundary', 'singleton shape', 'reversed ordering', 'duplicate values', 'small derived case'];
  return values.map((value, index) => ({ id: `candidate:${index + 1}`, input: value, rationale: rationales[index] ?? 'derived public shape', authority: 'candidate' }));
}

function output(value: string): string {
  return value.replace(/\r\n?/g, '\n').trimEnd();
}

export async function verifyHypothesis(input: {
  hypothesis: { id: string; message: string; evidenceRefs: string[] };
  candidates: CounterexampleCandidate[];
  expectedFor: (candidate: CounterexampleCandidate) => Promise<ExpectedObservation | null>;
  executeSubmission: (candidateInput: string) => Promise<ExecutionObservation>;
}): Promise<VerifiedHypothesis> {
  let hasTrustedExpected = false;
  for (const candidate of input.candidates.slice(0, 5)) {
    const expected = await input.expectedFor(candidate);
    if (!expected || !['human-reviewed', 'reference-consensus'].includes(expected.authority)) continue;
    hasTrustedExpected = true;
    const actual = await input.executeSubmission(candidate.input);
    if (actual.kind !== 'success') continue;
    if (output(actual.stdout) !== output(expected.output)) {
      return {
        hypothesisId: input.hypothesis.id, status: 'supported', candidateRef: candidate.id,
        expected: output(expected.output), actual: output(actual.stdout),
        expectedAuthority: expected.authority,
        evidenceRefs: [...input.hypothesis.evidenceRefs, expected.evidenceRef, `execution:${candidate.id}`],
      };
    }
  }
  return {
    hypothesisId: input.hypothesis.id,
    status: 'unverified',
    evidenceRefs: [...input.hypothesis.evidenceRefs],
    missingEvidence: hasTrustedExpected ? 'No bounded candidate reproduced the hypothesis.' : 'No trusted expected output was available.',
  };
}
