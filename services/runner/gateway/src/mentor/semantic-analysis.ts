import type { ParsedNodeEvidence, ParsedProgramEvidence, SourceRange } from './code-parser.js';
import type { CodeIntelligenceReport } from './code-intelligence.js';

export type FunctionScopeEvidence = { id: string; name: string; range: SourceRange; evidenceRef: string };
export type CallGraphEdge = { caller: string; callee: string; line: number; evidenceRef: string };
export type ReachingDefinitionEvidence = { symbol: string; useLine: number; definitionLines: number[]; evidenceRef: string };
export type SemanticPathRisk = { id: string; kind: 'possibly-uninitialized' | 'unresolved-call'; message: string; status: 'unverified'; evidenceRefs: string[] };
export type SemanticReport = {
  version: 1;
  precision: 'structural-interprocedural';
  functions: FunctionScopeEvidence[];
  callGraph: CallGraphEdge[];
  dominators: Record<string, string[]>;
  reachingDefinitions: ReachingDefinitionEvidence[];
  pathRisks: SemanticPathRisk[];
};

function functionName(text: string): string | null {
  return text.match(/\b(?:function|def)\s+([A-Za-z_$][\w$]*)/)?.[1]
    ?? text.match(/(?:^|[;{}\s])(?:public\s+|private\s+|protected\s+|static\s+|final\s+|inline\s+|virtual\s+|constexpr\s+)*(?:[\w:<>,\[\]*&?]+\s+)+([A-Za-z_$][\w$]*)\s*\(/)?.[1]
    ?? null;
}

function calleeName(text: string): string | null {
  const match = text.match(/([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\(/);
  return match ? match[1].replace(/\s+/g, '').split('.').at(-1) ?? null : null;
}

function nearestFunction(node: ParsedNodeEvidence, byId: Map<string, ParsedNodeEvidence>, names: Map<string, string>): string {
  let current: ParsedNodeEvidence | undefined = node;
  for (let depth = 0; current && depth < 24; depth += 1) {
    const name = names.get(current.id);
    if (name) return name;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return '<module>';
}

function computeDominators(report: CodeIntelligenceReport): Record<string, string[]> {
  const nodes = report.controlFlow.nodes.map((node) => node.id);
  if (!nodes.length) return {};
  const predecessors = new Map(nodes.map((id) => [id, [] as string[]]));
  for (const edge of report.controlFlow.edges) predecessors.get(edge.to)?.push(edge.from);
  const all = new Set(nodes);
  const dom = new Map<string, Set<string>>(nodes.map((id, index) => [id, index === 0 ? new Set([id]) : new Set(all)]));
  for (let pass = 0; pass < nodes.length * 2; pass += 1) {
    let changed = false;
    for (const id of nodes.slice(1)) {
      const preds = predecessors.get(id) ?? [];
      const intersection = preds.length
        ? preds.map((pred) => dom.get(pred) ?? new Set<string>()).reduce((left, right) => new Set([...left].filter((item) => right.has(item))))
        : new Set<string>();
      intersection.add(id);
      const before = dom.get(id) ?? new Set<string>();
      if (before.size !== intersection.size || [...before].some((item) => !intersection.has(item))) { dom.set(id, intersection); changed = true; }
    }
    if (!changed) break;
  }
  return Object.fromEntries(nodes.map((id) => [id, [...(dom.get(id) ?? [])].sort()]));
}

export function analyzeSemantics(input: { parsed: ParsedProgramEvidence; report: CodeIntelligenceReport; sourceCode: string }): SemanticReport {
  const byId = new Map(input.parsed.nodes.map((node) => [node.id, node]));
  const functionNodes = input.parsed.nodes.filter((node) => node.kind === 'function');
  const names = new Map<string, string>();
  const functions = functionNodes.flatMap((node) => {
    const name = node.symbolName ?? functionName(node.text);
    if (!name) return [];
    names.set(node.id, name);
    return [{ id: node.id, name, range: node.range, evidenceRef: node.id }];
  });
  const knownNames = new Set(functions.map((item) => item.name));
  const callGraph: CallGraphEdge[] = [];
  const pathRisks: SemanticPathRisk[] = [];
  for (const node of input.parsed.nodes.filter((item) => item.kind === 'call')) {
    const callee = node.calleeName ?? calleeName(node.text);
    if (!callee) continue;
    const caller = nearestFunction(node, byId, names);
    callGraph.push({ caller, callee, line: node.range.startLine, evidenceRef: node.id });
    if (!knownNames.has(callee) && !['main', 'print', 'println', 'log', 'readLine', 'range', 'len', 'input'].includes(callee)) {
      pathRisks.push({ id: `risk:unresolved-call:${callee}:${node.range.startLine}`, kind: 'unresolved-call', message: `调用 ${callee} 未解析到当前文件中的函数定义。`, status: 'unverified', evidenceRefs: [node.id] });
    }
  }
  const reachingDefinitions = input.report.symbols.flatMap((symbol) => symbol.uses.map((useLine) => ({
    symbol: symbol.name,
    useLine,
    definitionLines: symbol.definitions.filter((line) => line <= useLine),
    evidenceRef: `dataflow:${symbol.name}:use:${useLine}`,
  })));
  for (const item of reachingDefinitions) {
    const conditionalOnly = item.definitionLines.length > 0 && item.definitionLines.every((line) => input.report.controlFlow.nodes.some((node) => node.kind === 'branch' && line >= node.range.startLine && line <= node.range.endLine && item.useLine > node.range.endLine));
    if (!item.definitionLines.length || conditionalOnly) pathRisks.push({
      id: `risk:possibly-uninitialized:${item.symbol}:${item.useLine}`, kind: 'possibly-uninitialized',
      message: `${item.symbol} 在第 ${item.useLine} 行的使用并非所有结构路径都有先行定义。`, status: 'unverified',
      evidenceRefs: [item.evidenceRef, ...item.definitionLines.map((line) => `code:line:${line}`)],
    });
  }
  return { version: 1, precision: 'structural-interprocedural', functions, callGraph, dominators: computeDominators(input.report), reachingDefinitions, pathRisks: pathRisks.slice(0, 20) };
}
