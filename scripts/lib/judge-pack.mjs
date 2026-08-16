import { createHash } from 'node:crypto';

function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='manifestHash').sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));return value;}
export function canonicalHash(value){return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(canonical(value))).digest('hex');}
const sha=(value)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function validateJudgePack(manifest,{problemContent}){
  const failures=[];if(!manifest||typeof manifest!=='object'||manifest.version!==1)failures.push('invalid-manifest');
  if(!problemContent||canonicalHash(problemContent)!==manifest?.problemContentHash)failures.push('stale-problem-content');
  const cases=Array.isArray(manifest?.hiddenCases)?manifest.hiddenCases:[];if(manifest?.trustLevel==='gold'&&cases.length<10)failures.push('insufficient-hidden-cases');
  const identities=new Set();for(const item of cases){const identity=`${item?.inputHash}:${item?.expectedHash}`;if(identities.has(identity))failures.push('duplicate-hidden-case');identities.add(identity);if(!sha(item?.inputHash)||!sha(item?.expectedHash))failures.push('invalid-hidden-case-hash');}
  const oracles=Array.isArray(manifest?.oracles)?manifest.oracles:[];if(manifest?.trustLevel==='gold'&&new Set(oracles.map((item)=>item?.artifactHash)).size<2)failures.push('insufficient-oracle-consensus');
  if(manifest?.trustLevel==='gold'&&!['python','javascript','java','cpp'].every((language)=>manifest?.languageSmoke?.[language]==='passed'))failures.push('language-smoke-incomplete');
  if(manifest?.trustLevel==='gold'&&(!Number.isFinite(manifest?.mutation?.score)||manifest.mutation.score<0.8||manifest.mutation.total<1))failures.push('mutation-score-low');
  if(manifest?.trustLevel==='gold'&&(!manifest?.review||manifest.review.decision!=='approved'||!sha(manifest.review.receiptHash)||Number.isNaN(Date.parse(manifest.review.reviewedAt))))failures.push('review-receipt-missing');
  if(!sha(manifest?.manifestHash)||canonicalHash(manifest)!==manifest.manifestHash)failures.push('manifest-tampered');
  return {ok:failures.length===0,failures:[...new Set(failures)]};
}
export function buildJudgeCoverage(catalog,manifests,problemContentById){
  const goldIds=new Set();for(const manifest of manifests){if(manifest?.trustLevel==='gold'&&validateJudgePack(manifest,{problemContent:problemContentById[manifest.problemId]}).ok)goldIds.add(manifest.problemId);}
  const ids=catalog.map((item)=>item.id);const missing=ids.filter((id)=>!goldIds.has(id));return{version:1,total:ids.length,gold:ids.length-missing.length,coverage:ids.length?Number(((ids.length-missing.length)/ids.length).toFixed(4)):0,passed:ids.length>0&&missing.length===0,missing};
}
