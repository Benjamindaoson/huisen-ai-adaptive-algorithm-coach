import { describe, expect, it } from 'vitest';
import { validateJudgeIsolation, validateLocalStackServices } from './lib/local-stack-contract.mjs';

describe('production-like local stack contract', () => {
  it('requires every durable and isolated backend dependency', () => {
    expect(validateLocalStackServices(['db', 'redis', 'judge0-server', 'judge0-workers', 'gateway', 'object-store'])).toEqual({ ok: true, missing: [] });
  });

  it('reports every missing dependency instead of accepting a partial stack', () => {
    expect(validateLocalStackServices(['gateway', 'db'])).toEqual({
      ok: false,
      missing: ['redis', 'judge0-server', 'judge0-workers', 'object-store'],
    });
  });
});

it('rejects a Judge0 security domain that mounts the gateway environment or has unrestricted egress',()=>{
  expect(validateJudgeIsolation('judge0-server:\n  volumes:\n    - ./.env:/judge0.conf:ro')).toEqual(expect.objectContaining({ok:false}));
  expect(validateJudgeIsolation('judge0-server:\n  configs: [judge0-config]\n  networks: [judge-private]\njudge0-workers:\n  configs: [judge0-config]\n  networks: [judge-private]\nnetworks:\n  judge-private:\n    internal: true')).toEqual({ok:true,failures:[]});
});
