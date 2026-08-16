function finiteCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function configured(env, key) {
  return typeof env?.[key] === 'string' && env[key].trim().length > 0;
}

export function buildProductionBaseline(input) {
  const problemCount = finiteCount(input.catalog?.problems);
  const hiddenJudgePackCount = new Set(input.hiddenTestSource?.match(/'od-[a-z0-9]+'\s*:\s*\[/gi) ?? []).size;
  const health = input.gatewayHealth;
  const mentor = health && typeof health === 'object' ? health.mentor : undefined;
  const capabilities = input.gatewayCapabilities?.capabilities;
  const identityCapability = capabilities?.identity;
  const learningCapability = capabilities?.learning;
  const mentorCapability = capabilities?.mentor;
  const gate = input.mentorReport?.releaseGate;
  return {
    version: 1,
    generatedAt: input.generatedAt,
    catalog: {
      problemCount,
      hiddenJudgePackCount,
      hiddenJudgeCoverage: problemCount ? Number((hiddenJudgePackCount / problemCount).toFixed(4)) : 0,
    },
    frontend: {
      apiConfigured: configured(input.frontendEnv, 'VITE_LEARNING_API_URL'),
      runnerConfigured: configured(input.frontendEnv, 'VITE_RUNNER_URL'),
      coachConfigured: configured(input.frontendEnv, 'VITE_COACH_URL'),
    },
    gateway: {
      reachable: health?.ok === true,
      storage: typeof learningCapability?.storage === 'string' ? learningCapability.storage : typeof mentor?.storage === 'string' ? mentor.storage : 'unknown',
      identity: typeof identityCapability?.mode === 'string' ? identityCapability.mode : typeof mentor?.identity === 'string' ? mentor.identity : 'unknown',
      model: typeof mentorCapability?.model === 'string' ? mentorCapability.model : typeof mentor?.model === 'string' ? mentor.model : 'unknown',
    },
    mentorQuality: {
      eligibleRealCases: Number(input.mentorReport?.eligibleRealCaseCount ?? 0),
      minimumRealCases: Number(gate?.minimumEligibleRealCases ?? 100),
      passed: gate?.passed === true,
      failures: Array.isArray(gate?.failures) ? gate.failures.filter((item) => typeof item === 'string') : [],
    },
  };
}
