import { createHash } from 'node:crypto';
import { lookupHiddenTests } from '../hidden-tests.js';
import type { JudgePack } from './durable-submission-service.js';

const VERSION_SUFFIX='@starter-v1';
const STARTER_PROBLEM_IDS=['od-71a5033ee94c','od-b53d53c3e9d3','od-f5d47011b9f8','od-5e34daac53f3'] as const;
export function starterProblemVersionId(problemId:string){return `${problemId}${VERSION_SUFFIX}`;}
export async function resolveStarterJudgePack(problemVersionId:string):Promise<JudgePack|undefined>{
  if(!problemVersionId.endsWith(VERSION_SUFFIX))return undefined;
  const problemId=problemVersionId.slice(0,-VERSION_SUFFIX.length);const tests=lookupHiddenTests(problemId);if(!tests?.length)return undefined;
  const contentHash=createHash('sha256').update(JSON.stringify({version:1,problemId,tests})).digest('hex');
  return{id:`starter:${contentHash}`,problemId,problemVersionId,contentHash,tests};
}
export async function listAvailableStarterJudgePacks(){return STARTER_PROBLEM_IDS.map((problemId)=>({problemId,problemVersionId:starterProblemVersionId(problemId),trustLevel:'starter' as const}));}
