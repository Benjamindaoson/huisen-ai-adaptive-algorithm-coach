export const SKILL_NODE_CONTRACT_VERSION = 1 as const;

export const AI_DOMAINS = ['llm', 'rag', 'agent', 'embodied-ai'] as const;
export type AIDomain = (typeof AI_DOMAINS)[number];

export const EVIDENCE_DIMENSIONS = [
  'concept',
  'implementation',
  'debugging',
  'independence',
  'transfer',
  'retention',
] as const;
export type EvidenceDimension = (typeof EVIDENCE_DIMENSIONS)[number];

export type EvidenceRequirement = Readonly<{
  dimension: EvidenceDimension;
  minimumCount: number;
  minimumScore?: number;
  mustBeIndependent?: boolean;
}>;

export type SkillNode = Readonly<{
  contractVersion: typeof SKILL_NODE_CONTRACT_VERSION;
  id: string;
  domain: AIDomain;
  name: string;
  description: string;
  prerequisites: readonly string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: readonly string[];
  evidenceRequirements: readonly EvidenceRequirement[];
}>;

export function validateSkillNode(node: SkillNode): SkillNode {
  if (node.contractVersion !== SKILL_NODE_CONTRACT_VERSION) throw new Error('Unsupported SkillNode contract version');
  if (!node.id.trim()) throw new Error('SkillNode.id is required');
  if (!AI_DOMAINS.includes(node.domain)) throw new Error(`Unsupported AI domain: ${node.domain}`);
  if (!node.name.trim()) throw new Error('SkillNode.name is required');
  if (!Number.isInteger(node.difficulty) || node.difficulty < 1 || node.difficulty > 5) {
    throw new Error('SkillNode.difficulty must be an integer from 1 to 5');
  }
  const seen = new Set<string>();
  for (const req of node.evidenceRequirements) {
    if (!Number.isInteger(req.minimumCount) || req.minimumCount < 1) {
      throw new Error('EvidenceRequirement.minimumCount must be >= 1');
    }
    if (req.minimumScore !== undefined && (req.minimumScore < 0 || req.minimumScore > 1)) {
      throw new Error('EvidenceRequirement.minimumScore must be between 0 and 1');
    }
    if (seen.has(req.dimension)) throw new Error(`Duplicate evidence requirement: ${req.dimension}`);
    seen.add(req.dimension);
  }
  return node;
}
