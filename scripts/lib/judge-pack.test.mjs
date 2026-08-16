import { describe,expect,it } from 'vitest';
import { canonicalHash, validateJudgePack, buildJudgeCoverage } from './judge-pack.mjs';

function gold(){
  const problemContent={id:'od-1',title:'A',sections:{description:'x'}};
  const manifest={version:1,id:'pack-1',problemId:'od-1',problemContentHash:canonicalHash(problemContent),trustLevel:'gold',hiddenCases:Array.from({length:10},(_,i)=>({id:`case-${i}`,category:i<2?'boundary':'general',inputHash:canonicalHash(`in-${i}`),expectedHash:canonicalHash(`out-${i}`)})),oracles:[{id:'oracle-a',kind:'reference-execution',artifactHash:'a'.repeat(64)},{id:'oracle-b',kind:'independent-reference',artifactHash:'b'.repeat(64)}],languageSmoke:{python:'passed',javascript:'passed',java:'passed',cpp:'passed'},mutation:{score:0.9,killed:9,total:10},review:{reviewerId:'teacher-1',decision:'approved',reviewedAt:'2026-08-13T00:00:00.000Z',receiptHash:'c'.repeat(64)}};
  return {problemContent,manifest:{...manifest,manifestHash:canonicalHash(manifest)}};
}
describe('trusted judge-pack promotion',()=>{
  it('accepts a fully reviewed immutable pack',()=>{const {manifest,problemContent}=gold();expect(validateJudgePack(manifest,{problemContent})).toEqual({ok:true,failures:[]});});
  it('rejects content tampering, duplicate cases and oracle disagreement',()=>{const {manifest,problemContent}=gold();const invalid={...manifest,hiddenCases:[...manifest.hiddenCases.slice(0,9),manifest.hiddenCases[0]],oracles:[manifest.oracles[0]],manifestHash:manifest.manifestHash};const result=validateJudgePack(invalid,{problemContent:{...problemContent,title:'changed'}});expect(result.ok).toBe(false);expect(result.failures).toEqual(expect.arrayContaining(['stale-problem-content','duplicate-hidden-case','insufficient-oracle-consensus','manifest-tampered']));});
  it('keeps catalog publication red until every current problem has a gold pack',()=>{const {manifest,problemContent}=gold();expect(buildJudgeCoverage([{id:'od-1'},{id:'od-2'}],[manifest],{'od-1':problemContent,'od-2':{id:'od-2'}})).toMatchObject({total:2,gold:1,passed:false,missing:['od-2']});});
});
