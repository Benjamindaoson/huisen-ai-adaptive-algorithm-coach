export function evaluateContainmentProbes(results) {
  const failures = [];
  if (results.timeout?.kind !== 'timeout') failures.push('timeout-not-contained');
  if (results.network?.kind !== 'success' || String(results.network.stdout ?? '').trim() !== 'NETWORK_BLOCKED') failures.push('egress-not-blocked');
  if (results.environment?.kind !== 'success' || String(results.environment.stdout ?? '').trim() !== '0') failures.push('platform-environment-visible');
  return { ok: failures.length === 0, failures };
}
