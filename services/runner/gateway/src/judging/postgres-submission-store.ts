export type SubmissionStatus = 'queued' | 'running' | 'cancelled' | 'passed' | 'failed' | 'error';
export type StoredSubmission = {
  id: string; learnerId: string; idempotencyKey: string; requestHash: string; problemId: string; problemVersionId: string;
  contentHash: string; language: 'python' | 'javascript' | 'java' | 'cpp'; sourceCode: string; sourceHash: string;
  status: SubmissionStatus; submittedAt: number; completedAt?: number; passedCount: number; totalCount: number;
  timeMs?: number; error?: string; leaseId?: string; leaseExpiresAt?: number; revision: number;
};
export type SubmissionTransition = { sequence: number; submissionId: string; fromStatus?: SubmissionStatus; toStatus: SubmissionStatus; occurredAt: number; detail: Record<string, unknown> };
export type StoredJudgePack = { id:string;problemId:string;problemVersionId:string;contentHash:string;manifestHash:string;trustLevel:string;reviewedAt?:number;reviewerReceipt?:Record<string,unknown>;manifest:Record<string,unknown> };
export type ExecutionArtifact = { id:string;submissionId:string;kind:string;objectKey:string;sha256:string;sizeBytes:number;createdAt:number };
type QueryResult = { rows: Array<Record<string, unknown>> };
type Client = { query(text: string, values?: unknown[]): Promise<QueryResult>; release(): void };
export type SubmissionPool = { query(text: string, values?: unknown[]): Promise<QueryResult>; connect(): Promise<Client> };

function safeSchema(value: string) { if (!/^[a-z_][a-z0-9_]{0,62}$/.test(value)) throw new Error('Invalid judging schema'); return value; }
function map(row: Record<string, unknown>): StoredSubmission {
  return {
    id: String(row.id), learnerId: String(row.learner_id), idempotencyKey: String(row.idempotency_key), requestHash: String(row.request_hash),
    problemId: String(row.problem_id), problemVersionId: String(row.problem_version_id), contentHash: String(row.content_hash), language: row.language as StoredSubmission['language'],
    sourceCode: String(row.source_code), sourceHash: String(row.source_hash), status: row.status as SubmissionStatus, submittedAt: Number(row.submitted_at),
    ...(row.completed_at !== null && row.completed_at !== undefined ? { completedAt: Number(row.completed_at) } : {}), passedCount: Number(row.passed_count), totalCount: Number(row.total_count),
    ...(row.time_ms !== null && row.time_ms !== undefined ? { timeMs: Number(row.time_ms) } : {}), ...(row.error ? { error: String(row.error) } : {}),
    ...(row.lease_id ? { leaseId: String(row.lease_id) } : {}), ...(row.lease_expires_at !== null && row.lease_expires_at !== undefined ? { leaseExpiresAt: Number(row.lease_expires_at) } : {}), revision: Number(row.revision),
  };
}
function jsonRecord(value:unknown):Record<string,unknown>{if(typeof value==='string')return JSON.parse(value) as Record<string,unknown>;return structuredClone((value??{}) as Record<string,unknown>);}
function mapJudgePack(row:Record<string,unknown>):StoredJudgePack{return{id:String(row.id),problemId:String(row.problem_id),problemVersionId:String(row.problem_version_id),contentHash:String(row.content_hash),manifestHash:String(row.manifest_hash),trustLevel:String(row.trust_level),...(row.reviewed_at!==null&&row.reviewed_at!==undefined?{reviewedAt:Number(row.reviewed_at)}:{}),...(row.reviewer_receipt?{reviewerReceipt:jsonRecord(row.reviewer_receipt)}:{}),manifest:jsonRecord(row.manifest)};}
function mapArtifact(row:Record<string,unknown>):ExecutionArtifact{return{id:String(row.id),submissionId:String(row.submission_id),kind:String(row.kind),objectKey:String(row.object_key),sha256:String(row.sha256),sizeBytes:Number(row.size_bytes),createdAt:Number(row.created_at)};}

export function createPostgresSubmissionStore(options: { pool: SubmissionPool; schema?: string }) {
  const schema = safeSchema(options.schema ?? 'judging'); const table = (name: string) => `"${schema}"."${name}"`;
  const initialized = (async () => {
    await options.pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('submissions')} (
      id text PRIMARY KEY, learner_id text NOT NULL, idempotency_key text NOT NULL, request_hash text NOT NULL, problem_id text NOT NULL,
      problem_version_id text NOT NULL, content_hash text NOT NULL, language text NOT NULL, source_code text NOT NULL, source_hash text NOT NULL,
      status text NOT NULL, submitted_at bigint NOT NULL, completed_at bigint, passed_count integer NOT NULL DEFAULT 0, total_count integer NOT NULL,
      time_ms integer, error text, lease_id text, lease_expires_at bigint, revision integer NOT NULL DEFAULT 1,
      UNIQUE (learner_id, idempotency_key))`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('submission_transitions')} (sequence bigserial PRIMARY KEY, submission_id text NOT NULL, from_status text, to_status text NOT NULL, occurred_at bigint NOT NULL, detail jsonb NOT NULL)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('submission_attempts')} (id bigserial PRIMARY KEY, submission_id text NOT NULL, ordinal integer NOT NULL, status text NOT NULL, time_ms integer, safe_verdict jsonb NOT NULL, UNIQUE(submission_id,ordinal))`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('execution_artifacts')} (id text PRIMARY KEY, submission_id text NOT NULL, kind text NOT NULL, object_key text NOT NULL, sha256 text NOT NULL, size_bytes bigint NOT NULL, created_at bigint NOT NULL)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('judge_packs')} (id text PRIMARY KEY, problem_id text NOT NULL, problem_version_id text NOT NULL UNIQUE, content_hash text NOT NULL, manifest_hash text NOT NULL, trust_level text NOT NULL, reviewed_at bigint, reviewer_receipt jsonb, manifest jsonb NOT NULL)`);
    await options.pool.query(`CREATE INDEX IF NOT EXISTS "${schema}_submission_recovery" ON ${table('submissions')} (status, lease_expires_at)`);
  })();
  async function transaction<T>(operation: (client: Client) => Promise<T>) { await initialized; const client = await options.pool.connect(); try { await client.query('BEGIN'); const value = await operation(client); await client.query('COMMIT'); return value; } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; } finally { client.release(); } }
  async function transition(client: Client, id: string, from: SubmissionStatus | undefined, to: SubmissionStatus, occurredAt: number, detail: Record<string, unknown> = {}) {
    await client.query(`INSERT INTO ${table('submission_transitions')} (submission_id,from_status,to_status,occurred_at,detail) VALUES ($1,$2,$3,$4,$5::jsonb)`, [id, from ?? null, to, occurredAt, JSON.stringify(detail)]);
  }
  return {
    mode: 'postgres' as const,
    async create(input: Omit<StoredSubmission, 'status' | 'passedCount' | 'completedAt' | 'timeMs' | 'error' | 'leaseId' | 'leaseExpiresAt' | 'revision'>) {
      return transaction(async (client) => {
        await client.query(`INSERT INTO ${table('submissions')} (id,learner_id,idempotency_key,request_hash,problem_id,problem_version_id,content_hash,language,source_code,source_hash,status,submitted_at,passed_count,total_count,revision)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'queued',$11,0,$12,1) ON CONFLICT (learner_id,idempotency_key) DO NOTHING RETURNING *`,
        [input.id,input.learnerId,input.idempotencyKey,input.requestHash,input.problemId,input.problemVersionId,input.contentHash,input.language,input.sourceCode,input.sourceHash,input.submittedAt,input.totalCount]);
        const prior = await client.query(`SELECT * FROM ${table('submissions')} WHERE learner_id=$1 AND idempotency_key=$2`, [input.learnerId,input.idempotencyKey]);
        if (!prior.rows[0] || String(prior.rows[0].request_hash) !== input.requestHash) throw new Error('Submission idempotency conflict');
        const created = String(prior.rows[0].id) === input.id;
        if (created) await transition(client, input.id, undefined, 'queued', input.submittedAt);
        return { record: map(prior.rows[0]), created };
      });
    },
    async get(id: string) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('submissions')} WHERE id=$1`, [id]); return result.rows[0] ? map(result.rows[0]) : undefined; },
    async recoverable(now: number) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('submissions')} WHERE status='queued' OR (status='running' AND (lease_expires_at IS NULL OR lease_expires_at <= $1)) ORDER BY submitted_at`, [now]); return result.rows.map(map); },
    async claim(id: string, leaseId: string, now: number, leaseMs: number) {
      return transaction(async (client) => {
        const current = await client.query(`SELECT * FROM ${table('submissions')} WHERE id=$1 FOR UPDATE`, [id]); if (!current.rows[0]) return undefined;
        const record = map(current.rows[0]); if (record.status !== 'queued' && !(record.status === 'running' && (record.leaseExpiresAt ?? 0) <= now)) return undefined;
        const result = await client.query(`UPDATE ${table('submissions')} SET status='running',lease_id=$2,lease_expires_at=$3,revision=revision+1 WHERE id=$1 RETURNING *`, [id,leaseId,now+leaseMs]);
        await transition(client,id,record.status,'running',now,{ leaseId }); return map(result.rows[0]);
      });
    },
    async renewLease(id: string, leaseId: string, now: number, leaseMs: number) {
      return transaction(async (client) => {
        const result = await client.query(`UPDATE ${table('submissions')} SET lease_expires_at=$3 WHERE id=$1 AND status='running' AND lease_id=$2 RETURNING *`, [id, leaseId, now + leaseMs]);
        if (!result.rows[0]) return undefined;
        await transition(client, id, 'running', 'running', now, { leaseRenewed: true });
        return map(result.rows[0]);
      });
    },
    async complete(id: string, leaseId: string, input: { status: 'passed' | 'failed' | 'error'; completedAt: number; passedCount: number; timeMs: number; error?: string }) {
      return transaction(async (client) => {
        const current = await client.query(`SELECT * FROM ${table('submissions')} WHERE id=$1 FOR UPDATE`, [id]); if (!current.rows[0]) return undefined;
        const record = map(current.rows[0]); if (record.status !== 'running' || record.leaseId !== leaseId) return record;
        const result = await client.query(`UPDATE ${table('submissions')} SET status=$2,completed_at=$3,passed_count=$4,time_ms=$5,error=$6,lease_id=NULL,lease_expires_at=NULL,revision=revision+1 WHERE id=$1 RETURNING *`, [id,input.status,input.completedAt,input.passedCount,input.timeMs,input.error ?? null]);
        await transition(client,id,'running',input.status,input.completedAt,{ passedCount: input.passedCount, totalCount: record.totalCount, timeMs: input.timeMs }); return map(result.rows[0]);
      });
    },
    async cancel(id: string, learnerId: string, now: number) {
      return transaction(async (client) => {
        const current = await client.query(`SELECT * FROM ${table('submissions')} WHERE id=$1 AND learner_id=$2 FOR UPDATE`, [id,learnerId]); if (!current.rows[0]) return undefined;
        const record = map(current.rows[0]); if (!['queued','running'].includes(record.status)) return record;
        const result = await client.query(`UPDATE ${table('submissions')} SET status='cancelled',completed_at=$2,lease_id=NULL,lease_expires_at=NULL,revision=revision+1 WHERE id=$1 RETURNING *`, [id,now]);
        await transition(client,id,record.status,'cancelled',now); return map(result.rows[0]);
      });
    },
    async recordAttempt(input:{submissionId:string;ordinal:number;status:string;timeMs?:number;safeVerdict:Record<string,unknown>}){await initialized;await options.pool.query(`INSERT INTO ${table('submission_attempts')} (submission_id,ordinal,status,time_ms,safe_verdict) VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (submission_id,ordinal) DO UPDATE SET status=excluded.status,time_ms=excluded.time_ms,safe_verdict=excluded.safe_verdict`,[input.submissionId,input.ordinal,input.status,input.timeMs??null,JSON.stringify(input.safeVerdict)]);},
    async attempts(id:string){await initialized;const result=await options.pool.query(`SELECT ordinal,status,time_ms,safe_verdict FROM ${table('submission_attempts')} WHERE submission_id=$1 ORDER BY ordinal`,[id]);return result.rows.map((row)=>({ordinal:Number(row.ordinal),status:String(row.status),...(row.time_ms!==null&&row.time_ms!==undefined?{timeMs:Number(row.time_ms)}:{}),safeVerdict:typeof row.safe_verdict==='string'?JSON.parse(row.safe_verdict):structuredClone(row.safe_verdict as Record<string,unknown>)}));},
    async metrics(now:number){await initialized;const result=await options.pool.query(`SELECT status,submitted_at,time_ms,revision FROM ${table('submissions')}`);const counts={queued:0,running:0,cancelled:0,passed:0,failed:0,error:0};let runtimeTotal=0,runtimeCount=0,oldest:number|undefined,retries=0;for(const row of result.rows){const status=row.status as keyof typeof counts;counts[status]+=1;if(status==='queued'){const age=Math.max(0,now-Number(row.submitted_at));oldest=oldest===undefined?age:Math.max(oldest,age);}if(row.time_ms!==null&&row.time_ms!==undefined){runtimeTotal+=Number(row.time_ms);runtimeCount+=1;}retries+=Math.max(0,Number(row.revision)-3);}return{total:result.rows.length,...counts,saturation:counts.queued+counts.running,oldestQueueAgeMs:oldest??0,averageRuntimeMs:runtimeCount?Math.round(runtimeTotal/runtimeCount):0,executionTimeMs:runtimeTotal,retries};},
    async history(id: string): Promise<SubmissionTransition[]> { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('submission_transitions')} WHERE submission_id=$1 ORDER BY sequence`, [id]); return result.rows.map((row) => ({ sequence:Number(row.sequence),submissionId:String(row.submission_id),...(row.from_status?{fromStatus:row.from_status as SubmissionStatus}:{}),toStatus:row.to_status as SubmissionStatus,occurredAt:Number(row.occurred_at),detail:typeof row.detail==='string'?JSON.parse(row.detail):structuredClone(row.detail as Record<string,unknown>) })); },
    async putJudgePack(input:StoredJudgePack){await initialized;const prior=(await options.pool.query(`SELECT * FROM ${table('judge_packs')} WHERE problem_version_id=$1`,[input.problemVersionId])).rows[0];const inserted=prior?{rows:[]} : await options.pool.query(`INSERT INTO ${table('judge_packs')} (id,problem_id,problem_version_id,content_hash,manifest_hash,trust_level,reviewed_at,reviewer_receipt,manifest) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) ON CONFLICT DO NOTHING RETURNING *`,[input.id,input.problemId,input.problemVersionId,input.contentHash,input.manifestHash,input.trustLevel,input.reviewedAt??null,input.reviewerReceipt?JSON.stringify(input.reviewerReceipt):null,JSON.stringify(input.manifest)]);const selected=prior??inserted.rows[0]??(await options.pool.query(`SELECT * FROM ${table('judge_packs')} WHERE problem_version_id=$1`,[input.problemVersionId])).rows[0];if(!selected)throw new Error('Judge pack persistence failed');const stored=mapJudgePack(selected);if(stored.id!==input.id||stored.contentHash!==input.contentHash||stored.manifestHash!==input.manifestHash||JSON.stringify(stored.manifest)!==JSON.stringify(input.manifest))throw new Error('Judge pack version conflict');return{...stored,created:!prior&&Boolean(inserted.rows[0])};},
    async getJudgePack(problemVersionId:string){await initialized;const result=await options.pool.query(`SELECT * FROM ${table('judge_packs')} WHERE problem_version_id=$1`,[problemVersionId]);return result.rows[0]?mapJudgePack(result.rows[0]):undefined;},
    async putExecutionArtifact(input:ExecutionArtifact){await initialized;const prior=(await options.pool.query(`SELECT * FROM ${table('execution_artifacts')} WHERE id=$1`,[input.id])).rows[0];const inserted=prior?{rows:[]} : await options.pool.query(`INSERT INTO ${table('execution_artifacts')} (id,submission_id,kind,object_key,sha256,size_bytes,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING RETURNING *`,[input.id,input.submissionId,input.kind,input.objectKey,input.sha256,input.sizeBytes,input.createdAt]);const selected=prior??inserted.rows[0]??(await options.pool.query(`SELECT * FROM ${table('execution_artifacts')} WHERE id=$1`,[input.id])).rows[0];if(!selected)throw new Error('Execution artifact persistence failed');const stored=mapArtifact(selected);if(stored.submissionId!==input.submissionId||stored.kind!==input.kind||stored.objectKey!==input.objectKey||stored.sha256!==input.sha256||stored.sizeBytes!==input.sizeBytes)throw new Error('Execution artifact conflict');return{...stored,created:!prior&&Boolean(inserted.rows[0])};},
    async listExecutionArtifacts(submissionId:string){await initialized;const result=await options.pool.query(`SELECT * FROM ${table('execution_artifacts')} WHERE submission_id=$1 ORDER BY created_at,id`,[submissionId]);return result.rows.map(mapArtifact);},
  };
}

export type PostgresSubmissionStore = ReturnType<typeof createPostgresSubmissionStore>;
