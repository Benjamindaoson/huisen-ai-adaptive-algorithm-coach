import { describe, expect, it } from 'vitest';
import { resolveStarterJudgePack, starterProblemVersionId } from './starter-pack-resolver.js';

describe('starter judge-pack resolver',()=>{
  it('binds server-only cases to an immutable problem version and content hash',async()=>{
    const version=starterProblemVersionId('od-71a5033ee94c');
    const pack=await resolveStarterJudgePack(version);
    expect(version).toBe('od-71a5033ee94c@starter-v1');
    expect(pack).toMatchObject({problemId:'od-71a5033ee94c',problemVersionId:version});
    expect(pack?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(await resolveStarterJudgePack('od-unknown@starter-v1')).toBeUndefined();
  });
});
