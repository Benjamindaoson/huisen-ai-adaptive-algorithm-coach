import { newDb } from 'pg-mem';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../server.js';
import { createAccountIdentityService } from '../identity/account-identity.js';
import { createInMemoryAccountStore } from '../identity/account-store.js';
import { createDurableSubmissionService } from './durable-submission-service.js';
import { createPostgresSubmissionStore } from './postgres-submission-store.js';

const apps: ReturnType<typeof buildServer>[]=[];
afterEach(async()=>Promise.all(apps.splice(0).map((app)=>app.close())));
function cookie(header:string|string[]|undefined){const match=/od_session=([^;]+)/.exec(Array.isArray(header)?header.join(';'):header??'');if(!match)throw new Error('cookie missing');return `od_session=${match[1]}`;}

async function fixture(){
  const deliveries:string[]=[];const accountStore=createInMemoryAccountStore();const identity=createAccountIdentityService({store:accountStore,notify:async(item)=>{deliveries.push(item.token);}});
  const memory=newDb({noAstCoverageCheck:true});const adapter=memory.adapters.createPg();const pool=new adapter.Pool();
  const durableSubmissions=createDurableSubmissionService({store:createPostgresSubmissionStore({pool,schema:'judging_routes'}),resolvePack:async(version)=>version==='od-1@v1'?{id:'pack',problemId:'od-1',problemVersionId:version,contentHash:'a'.repeat(64),tests:[{stdin:'secret',expectedOutput:'ok'}]}:undefined,listPacks:async()=>[{problemId:'od-1',problemVersionId:'od-1@v1',trustLevel:'starter'}],execute:vi.fn().mockResolvedValue({kind:'success',stdout:'ok',stderr:''}),createId:()=> 'submission-route'});
  const app=buildServer({accountIdentity:identity,durableSubmissions});apps.push(app);
  await app.inject({method:'POST',url:'/api/v1/auth/register',payload:{email:'judge@example.com',password:'correct horse battery staple'}});
  await app.inject({method:'POST',url:'/api/v1/auth/verify',payload:{token:deliveries[0]}});
  const login=await app.inject({method:'POST',url:'/api/v1/auth/sessions',payload:{email:'judge@example.com',password:'correct horse battery staple'}});
  return {app,pool,cookie:cookie(login.headers['set-cookie']),csrf:login.json().csrfToken as string,userId:login.json().account.id as string,durableSubmissions,accountStore};
}

describe('authenticated durable submission routes',()=>{
  it('creates, polls and protects an aggregate-only submission',async()=>{
    const {app,pool,cookie,csrf,durableSubmissions}=await fixture();
    expect((await app.inject({method:'POST',url:'/api/v1/submissions',payload:{problemVersionId:'od-1@v1',language:'python',sourceCode:'print(1)',idempotencyKey:'route-key'}})).statusCode).toBe(401);
    const created=await app.inject({method:'POST',url:'/api/v1/submissions',headers:{cookie,'x-csrf-token':csrf},payload:{problemVersionId:'od-1@v1',language:'python',sourceCode:'print(1)',idempotencyKey:'route-key'}});
    expect(created.statusCode,created.body).toBe(202);expect(created.headers.location).toBe('/api/v1/submissions/submission-route');expect(created.body).not.toContain('print(1)');expect(created.body).not.toContain('secret');
    await durableSubmissions.settle('submission-route');
    const result=await app.inject({method:'GET',url:'/api/v1/submissions/submission-route',headers:{cookie}});expect(result.json()).toMatchObject({status:'passed',passedCount:1,totalCount:1});
    await pool.end();
  });

  it('returns a stable conflict envelope without leaking internal database details', async () => {
    const { app, pool, cookie, csrf } = await fixture();
    const headers = { cookie, 'x-csrf-token': csrf };
    await app.inject({ method: 'POST', url: '/api/v1/submissions', headers, payload: { problemVersionId: 'od-1@v1', language: 'python', sourceCode: 'print(1)', idempotencyKey: 'same-key' } });
    const conflict = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers, payload: { problemVersionId: 'od-1@v1', language: 'python', sourceCode: 'print(2)', idempotencyKey: 'same-key' } });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: { code: 'idempotency-conflict', message: 'This idempotency key was already used for a different submission.' } });
    expect(conflict.body).not.toMatch(/SELECT|INSERT|judging_routes|request_hash/i);
    await pool.end();
  });

  it('exposes redacted judging telemetry only to administrators', async () => {
    const { app, pool, cookie, userId, accountStore } = await fixture();
    expect((await app.inject({ method: 'GET', url: '/api/v1/operations/judging/metrics', headers: { cookie } })).statusCode).toBe(403);
    const account = await accountStore.getAccount(userId);
    await accountStore.putAccount({ ...account!, roles: ['learner', 'admin'] });
    const response = await app.inject({ method: 'GET', url: '/api/v1/operations/judging/metrics', headers: { cookie } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ total: 0, queued: 0, running: 0, saturation: 0, oldestQueueAgeMs: 0 });
    expect(response.body).not.toMatch(/source|stdin|expectedOutput|hidden/i);
    await pool.end();
  });

  it('lists only judge-pack identifiers and trust levels for authenticated exam selection', async () => {
    const { app, pool, cookie } = await fixture();
    expect((await app.inject({ method: 'GET', url: '/api/v1/judge-packs/available' })).statusCode).toBe(401);
    const response = await app.inject({ method: 'GET', url: '/api/v1/judge-packs/available', headers: { cookie } });
    expect(response.json()).toEqual({ packs: [{ problemId: 'od-1', problemVersionId: 'od-1@v1', trustLevel: 'starter' }] });
    expect(response.body).not.toMatch(/stdin|expectedOutput|secret/i);
    await pool.end();
  });
});
