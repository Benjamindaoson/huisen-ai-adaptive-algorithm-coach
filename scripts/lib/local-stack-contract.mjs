const REQUIRED_SERVICES = ['db', 'redis', 'judge0-server', 'judge0-workers', 'gateway', 'object-store'];

export function validateLocalStackServices(services) {
  const present = new Set(services);
  const missing = REQUIRED_SERVICES.filter((service) => !present.has(service));
  return { ok: missing.length === 0, missing };
}

export function validateJudgeIsolation(composeText) {
  const failures=[];
  if(/\.env:\/judge0\.conf/.test(composeText))failures.push('judge0-mounts-shared-env');
  if(!/judge-private:[\s\S]*?internal:\s*true/.test(composeText))failures.push('judge-network-not-internal');
  for(const service of ['judge0-server','judge0-workers']){
    const start=composeText.indexOf(`${service}:`);const next=start<0?-1:composeText.indexOf('\n  judge0-',start+service.length+1);const block=start<0?'':composeText.slice(start,next>start?next:undefined);
    if(!block.includes('judge-private'))failures.push(`${service}-not-private`);
    if(!block.includes('judge0-config'))failures.push(`${service}-missing-minimal-config`);
  }
  return {ok:failures.length===0,failures};
}
