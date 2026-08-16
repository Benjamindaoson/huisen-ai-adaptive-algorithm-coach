import { describe,expect,it,vi } from 'vitest';
import { submitAndPoll } from './durable-submission-client';

describe('durable submission polling',()=>{
  it('waits for an authoritative terminal verdict without fabricating a client result',async()=>{
    const client={createSubmission:vi.fn().mockResolvedValue({id:'s1',status:'queued'}),getSubmission:vi.fn().mockResolvedValueOnce({id:'s1',status:'running'}).mockResolvedValueOnce({id:'s1',status:'passed',passedCount:2,totalCount:2})};
    const result=await submitAndPoll(client as never,{problemVersionId:'od-1@starter-v1',language:'python',sourceCode:'print(1)',idempotencyKey:'key'}, {delay:async()=>undefined,maxPolls:3});
    expect(result).toMatchObject({status:'passed',passedCount:2,totalCount:2});expect(client.getSubmission).toHaveBeenCalledTimes(2);
  });
  it('returns the last queued state when the bounded polling window expires',async()=>{
    const client={createSubmission:vi.fn().mockResolvedValue({id:'s1',status:'queued'}),getSubmission:vi.fn().mockResolvedValue({id:'s1',status:'running'})};
    await expect(submitAndPoll(client as never,{problemVersionId:'od-1@starter-v1',language:'python',sourceCode:'x',idempotencyKey:'key'},{delay:async()=>undefined,maxPolls:2})).resolves.toMatchObject({status:'running'});
  });
});
