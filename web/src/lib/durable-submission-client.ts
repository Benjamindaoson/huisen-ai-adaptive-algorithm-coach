import type { DurableSubmission, PlatformClient } from './platform-client';
const terminal=new Set<DurableSubmission['status']>(['cancelled','passed','failed','error']);
type Input=Parameters<PlatformClient['createSubmission']>[0];
export async function submitAndPoll(client:Pick<PlatformClient,'createSubmission'|'getSubmission'>,input:Input,options:{delay?:(ms:number)=>Promise<void>;maxPolls?:number;intervalMs?:number}={}):Promise<DurableSubmission>{
  const delay=options.delay??((ms)=>new Promise((resolve)=>window.setTimeout(resolve,ms)));const maxPolls=options.maxPolls??60;const intervalMs=options.intervalMs??500;
  let current=await client.createSubmission(input);if(terminal.has(current.status))return current;
  for(let poll=0;poll<maxPolls;poll+=1){await delay(intervalMs);current=await client.getSubmission(current.id);if(terminal.has(current.status))return current;}
  return current;
}
