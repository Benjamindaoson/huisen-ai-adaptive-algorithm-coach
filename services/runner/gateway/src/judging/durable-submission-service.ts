import { createHash, randomUUID } from 'node:crypto';
import type { RunResult } from '../judge0.js';
import { ALLOWED_LANGUAGES, type AllowedLanguage, type RunRequest } from '../validation.js';
import type { PostgresSubmissionStore, StoredSubmission } from './postgres-submission-store.js';

export type JudgePack = { id: string; problemId: string; problemVersionId: string; contentHash: string; tests: Array<{ stdin: string; expectedOutput: string }> };
export type DurableSubmissionRequest = { learnerId: string; problemVersionId: string; language: AllowedLanguage; sourceCode: string; idempotencyKey: string };
export type PublicDurableSubmission = Omit<StoredSubmission, 'learnerId'|'idempotencyKey'|'requestHash'|'contentHash'|'sourceCode'|'sourceHash'|'leaseId'|'leaseExpiresAt'>;
const MAX_SOURCE = 50_000; const LEASE_MS = 30_000;
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function normalize(value: string) { return value.replace(/\r\n?/g,'\n').split('\n').map((line)=>line.replace(/[\t ]+$/g,'')).join('\n').replace(/\n+$/g,''); }
function publicRecord(record: StoredSubmission): PublicDurableSubmission { const { learnerId:_a,idempotencyKey:_b,requestHash:_c,contentHash:_d,sourceCode:_e,sourceHash:_f,leaseId:_g,leaseExpiresAt:_h,...safe }=record; return safe; }
function validate(input: DurableSubmissionRequest) {
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(input.learnerId) || !/^[A-Za-z0-9._:@-]{1,240}$/.test(input.problemVersionId) || !/^[A-Za-z0-9._:-]{1,200}$/.test(input.idempotencyKey)) throw new Error('Invalid durable submission request');
  if (!ALLOWED_LANGUAGES.includes(input.language) || typeof input.sourceCode !== 'string' || !input.sourceCode.trim() || input.sourceCode.length > MAX_SOURCE) throw new Error('Invalid durable submission request');
}

export type AvailableJudgePack = { problemId:string;problemVersionId:string;trustLevel:'starter'|'gold' };
export function createDurableSubmissionService(options: { store: PostgresSubmissionStore; resolvePack: (problemVersionId: string) => Promise<JudgePack|undefined>; listPacks?:()=>Promise<AvailableJudgePack[]>; execute: (request: RunRequest) => Promise<RunResult>; createId?:()=>string; now?:()=>number; autoDispatch?:boolean; costMicrosPerSecond?:number }) {
  const jobs=new Map<string,Promise<void>>(); const now=options.now??Date.now; const createId=options.createId??randomUUID; const autoDispatch=options.autoDispatch!==false;
  async function run(id:string) {
    const record=await options.store.get(id); if(!record) return;
    const leaseId=`${id}:lease:${now()}:${randomUUID()}`; const claimed=await options.store.claim(id,leaseId,now(),LEASE_MS); if(!claimed) return;
    let passed=0,timeMs=0;
    try {
      const pack=await options.resolvePack(claimed.problemVersionId); if(!pack||pack.contentHash!==claimed.contentHash) throw new Error('Trusted judge pack unavailable or stale');
      for(const [ordinal,test] of pack.tests.entries()){
        if (!await options.store.renewLease(id, leaseId, now(), LEASE_MS)) return;
        const result=await options.execute({language:claimed.language,sourceCode:claimed.sourceCode,stdin:test.stdin});timeMs+=result.timeMs??0;const matched=result.kind==='success'&&normalize(result.stdout)===normalize(test.expectedOutput);await options.store.recordAttempt({submissionId:id,ordinal,status:result.kind,timeMs:result.timeMs,safeVerdict:{kind:result.kind,matched}});if(result.kind!=='success'){await options.store.complete(id,leaseId,{status:'error',completedAt:now(),passedCount:passed,timeMs,error:result.kind==='timeout'?'程序运行超时。':'程序未能完成隐藏用例。'});return;}if(matched)passed+=1;
      }
      await options.store.complete(id,leaseId,{status:passed===claimed.totalCount?'passed':'failed',completedAt:now(),passedCount:passed,timeMs});
    } catch { await options.store.complete(id,leaseId,{status:'error',completedAt:now(),passedCount:passed,timeMs,error:'隐藏判题服务暂不可用。'}); }
  }
  function dispatch(id:string){if(jobs.has(id))return;const job=Promise.resolve().then(()=>run(id));jobs.set(id,job);void job.finally(()=>jobs.delete(id));}
  return {
    async submit(input:DurableSubmissionRequest){validate(input);const pack=await options.resolvePack(input.problemVersionId);if(!pack?.tests.length)throw new Error('Unknown problem version or trusted judge pack unavailable');const sourceHash=hash(input.sourceCode);const requestHash=hash(JSON.stringify({learnerId:input.learnerId,problemVersionId:input.problemVersionId,language:input.language,sourceHash}));const created=await options.store.create({id:createId(),learnerId:input.learnerId,idempotencyKey:input.idempotencyKey,requestHash,problemId:pack.problemId,problemVersionId:pack.problemVersionId,contentHash:pack.contentHash,language:input.language,sourceCode:input.sourceCode,sourceHash,submittedAt:now(),totalCount:pack.tests.length});if(autoDispatch&&created.created)dispatch(created.record.id);return publicRecord(created.record);},
    async get(id:string,learnerId:string){const record=await options.store.get(id);return record?.learnerId===learnerId?publicRecord(record):undefined;},
    async cancel(id:string,learnerId:string){const record=await options.store.cancel(id,learnerId,now());return record?publicRecord(record):undefined;},
    async reconcile(){const records=await options.store.recoverable(now());for(const record of records)dispatch(record.id);return records.length;},
    async settle(id:string){await jobs.get(id);},
    history:(id:string)=>options.store.history(id),
    attempts:(id:string)=>options.store.attempts(id),
    async metrics(){const metrics=await options.store.metrics(now());const rate=Number.isFinite(options.costMicrosPerSecond)&&Number(options.costMicrosPerSecond)>=0?Number(options.costMicrosPerSecond):0;return{...metrics,estimatedCostMicros:Math.ceil(metrics.executionTimeMs*rate/1_000)};},
    async availablePacks(){return options.listPacks ? options.listPacks() : [];},
  };
}

export type DurableSubmissionService = ReturnType<typeof createDurableSubmissionService>;
