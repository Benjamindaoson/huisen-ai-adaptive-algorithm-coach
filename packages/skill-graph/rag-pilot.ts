import { SKILL_NODE_CONTRACT_VERSION, validateSkillNode, type SkillNode } from '../../contracts/skill-node';

export const RAG_PILOT_SKILLS: readonly SkillNode[] = [
  validateSkillNode({
    contractVersion: SKILL_NODE_CONTRACT_VERSION,
    id: 'rag.dense-retrieval',
    domain: 'rag',
    name: 'Dense Retrieval',
    description: 'Retrieve relevant passages with semantic embeddings.',
    prerequisites: [],
    difficulty: 2,
    tags: ['rag', 'retrieval', 'embedding'],
    evidenceRequirements: [
      { dimension: 'concept', minimumCount: 1, minimumScore: 0.7 },
      { dimension: 'implementation', minimumCount: 1, minimumScore: 0.7, mustBeIndependent: true },
    ],
  }),
  validateSkillNode({
    contractVersion: SKILL_NODE_CONTRACT_VERSION,
    id: 'rag.bm25',
    domain: 'rag',
    name: 'BM25 Retrieval',
    description: 'Use lexical retrieval for exact terms, identifiers, and sparse matching.',
    prerequisites: [],
    difficulty: 2,
    tags: ['rag', 'retrieval', 'bm25'],
    evidenceRequirements: [
      { dimension: 'concept', minimumCount: 1, minimumScore: 0.7 },
      { dimension: 'implementation', minimumCount: 1, minimumScore: 0.7, mustBeIndependent: true },
    ],
  }),
  validateSkillNode({
    contractVersion: SKILL_NODE_CONTRACT_VERSION,
    id: 'rag.hybrid-retrieval',
    domain: 'rag',
    name: 'Hybrid Retrieval',
    description: 'Combine dense and lexical retrieval and verify improvement with retrieval evidence.',
    prerequisites: ['rag.dense-retrieval', 'rag.bm25'],
    difficulty: 3,
    tags: ['rag', 'hybrid-retrieval', 'rrf'],
    evidenceRequirements: [
      { dimension: 'concept', minimumCount: 1, minimumScore: 0.7 },
      { dimension: 'implementation', minimumCount: 1, minimumScore: 0.7, mustBeIndependent: true },
      { dimension: 'transfer', minimumCount: 1, minimumScore: 0.7, mustBeIndependent: true },
      { dimension: 'retention', minimumCount: 1, minimumScore: 0.7, mustBeIndependent: true },
    ],
  }),
];

export function ragPilotSkill(skillId: string): SkillNode {
  const skill = RAG_PILOT_SKILLS.find((candidate) => candidate.id === skillId);
  if (!skill) throw new Error(`Unknown RAG pilot skill: ${skillId}`);
  return skill;
}
