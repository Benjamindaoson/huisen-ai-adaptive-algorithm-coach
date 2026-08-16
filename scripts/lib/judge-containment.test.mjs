import { describe, expect, it } from 'vitest';
import { evaluateContainmentProbes } from './judge-containment.mjs';

describe('Judge0 containment evidence', () => {
  it('passes only when infinite work is stopped, egress is blocked and platform secrets are absent', () => {
    expect(evaluateContainmentProbes({ timeout: { kind: 'timeout' }, network: { kind: 'success', stdout: 'NETWORK_BLOCKED\n' }, environment: { kind: 'success', stdout: '0\n' } }))
      .toEqual({ ok: true, failures: [] });
  });

  it('fails closed for network access, leaked environment names or an unbounded process', () => {
    expect(evaluateContainmentProbes({ timeout: { kind: 'success' }, network: { kind: 'success', stdout: 'NETWORK_OK' }, environment: { kind: 'success', stdout: '2' } }).failures)
      .toEqual(['timeout-not-contained', 'egress-not-blocked', 'platform-environment-visible']);
  });
});
