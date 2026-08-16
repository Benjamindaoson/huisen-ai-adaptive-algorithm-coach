import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';
import Java from 'tree-sitter-java';
import Cpp from 'tree-sitter-cpp';
import type { AllowedLanguage } from '../validation.js';

export type StructuralKind = 'function' | 'loop' | 'branch' | 'declaration' | 'return' | 'call' | 'other';
export type SourceRange = { startLine: number; startColumn: number; endLine: number; endColumn: number };
export type ParsedNodeEvidence = {
  id: string; grammarType: string; kind: StructuralKind; range: SourceRange; text: string;
  parentId?: string; scopeId?: string; symbolName?: string; calleeName?: string; callTarget?: 'bare' | 'member';
};
export type ParseErrorEvidence = { evidenceRef: string; message: string; range: SourceRange };
export type ParsedProgramEvidence = {
  version: 1;
  language: AllowedLanguage;
  parser: string;
  degraded: boolean;
  rootType: string;
  nodes: ParsedNodeEvidence[];
  errors: ParseErrorEvidence[];
};

const LANGUAGES: Record<AllowedLanguage, { name: string; grammar: unknown }> = {
  javascript: { name: 'javascript@0.23', grammar: JavaScript },
  python: { name: 'python@0.21', grammar: Python },
  java: { name: 'java@0.23', grammar: Java },
  cpp: { name: 'cpp@0.23', grammar: Cpp },
};

const FUNCTION_TYPES = new Set(['function_declaration', 'function_definition', 'method_declaration', 'method_definition', 'arrow_function', 'lambda']);
const LOOP_TYPES = new Set(['for_statement', 'for_in_statement', 'for_range_loop', 'while_statement', 'do_statement', 'enhanced_for_statement']);
const BRANCH_TYPES = new Set(['if_statement', 'switch_statement', 'conditional_expression', 'match_statement', 'switch_expression']);
const DECLARATION_TYPES = new Set(['lexical_declaration', 'variable_declaration', 'local_variable_declaration', 'assignment', 'assignment_expression']);
const RETURN_TYPES = new Set(['return_statement']);
const CALL_TYPES = new Set(['call', 'call_expression', 'method_invocation']);

function range(node: Parser.SyntaxNode): SourceRange {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function kind(type: string): StructuralKind {
  if (FUNCTION_TYPES.has(type)) return 'function';
  if (LOOP_TYPES.has(type)) return 'loop';
  if (BRANCH_TYPES.has(type)) return 'branch';
  if (DECLARATION_TYPES.has(type)) return 'declaration';
  if (RETURN_TYPES.has(type)) return 'return';
  if (CALL_TYPES.has(type)) return 'call';
  return 'other';
}

function compact(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}…`;
}

function semanticName(node: Parser.SyntaxNode, structuralKind: StructuralKind): string | undefined {
  const field = node.childForFieldName('name')?.text;
  if (field && /^[A-Za-z_$][\w$]*$/.test(field)) return field;
  if (structuralKind === 'function') return node.text.match(/\b(?:function|def)\s+([A-Za-z_$][\w$]*)/)?.[1]
    ?? node.text.match(/(?:[\w:<>,\[\]*&?]+\s+)+([A-Za-z_$][\w$]*)\s*\(/)?.[1];
  if (structuralKind === 'call') return node.text.match(/([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\(/)?.[1]?.replace(/\s+/g, '').split('.').at(-1);
  return undefined;
}

function callTarget(node: Parser.SyntaxNode): { name: string; kind: 'bare' | 'member' } | undefined {
  const target = node.childForFieldName('function') ?? node.childForFieldName('name');
  const object = node.childForFieldName('object');
  const text = target?.text ?? '';
  if (!text) return undefined;
  if (/^[A-Za-z_$][\w$]*$/.test(text) && !object) return { name: text, kind: 'bare' };
  const name = text.match(/(?:\.|::|->)\s*([A-Za-z_$][\w$]*)$/)?.[1]
    ?? text.match(/([A-Za-z_$][\w$]*)$/)?.[1];
  return name ? { name, kind: 'member' } : undefined;
}

export async function parseSource(input: { language: AllowedLanguage; sourceCode: string }): Promise<ParsedProgramEvidence> {
  const selected = LANGUAGES[input.language];
  const parser = new Parser();
  parser.setLanguage(selected.grammar);
  const tree = parser.parse(input.sourceCode.slice(0, 50_000));
  const nodes: ParsedNodeEvidence[] = [];
  const errors: ParseErrorEvidence[] = [];

  function visit(node: Parser.SyntaxNode, parentId?: string, scopeId?: string): void {
    if (nodes.length >= 160) return;
    const nodeId = `ast:${input.language}:${node.startIndex}:${node.endIndex}:${node.type}`;
    const structuralKind = kind(node.type);
    if (structuralKind !== 'other') {
      const nextScopeId = structuralKind === 'function' ? nodeId : scopeId;
      const call = structuralKind === 'call' ? callTarget(node) : undefined;
      const name = call?.name ?? semanticName(node, structuralKind);
      nodes.push({
        id: nodeId, grammarType: node.type, kind: structuralKind, range: range(node), text: compact(node.text),
        ...(parentId ? { parentId } : {}), ...(nextScopeId ? { scopeId: nextScopeId } : {}),
        ...(structuralKind === 'function' && name ? { symbolName: name } : {}),
        ...(structuralKind === 'call' && name ? { calleeName: name } : {}),
        ...(structuralKind === 'call' && call ? { callTarget: call.kind } : {}),
      });
      parentId = nodeId;
      scopeId = nextScopeId;
    }
    if (node.isError || node.isMissing) {
      const sourceRange = range(node);
      errors.push({ evidenceRef: `ast:error:${sourceRange.startLine}:${sourceRange.startColumn}`, message: node.isMissing ? `Missing ${node.type}` : `Unexpected ${node.type}`, range: sourceRange });
    }
    for (const child of node.namedChildren) visit(child, parentId, scopeId);
  }

  visit(tree.rootNode);
  if (tree.rootNode.hasError && !errors.length) {
    errors.push({ evidenceRef: 'ast:error:root', message: 'Tree-sitter reported an incomplete parse', range: range(tree.rootNode) });
  }
  return {
    version: 1,
    language: input.language,
    parser: `tree-sitter:${selected.name}`,
    degraded: tree.rootNode.hasError,
    rootType: tree.rootNode.type,
    nodes,
    errors: errors.slice(0, 20),
  };
}
