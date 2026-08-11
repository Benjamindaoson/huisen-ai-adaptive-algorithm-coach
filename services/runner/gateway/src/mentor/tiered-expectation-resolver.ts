import type { ExpectedObservation } from './code-intelligence.js';
import type { TrustedExpectationResolver } from './trusted-expectations.js';

export function createTieredExpectationResolver(options: {
  reviewed: TrustedExpectationResolver;
  consensus: TrustedExpectationResolver;
}): TrustedExpectationResolver {
  return async (request): Promise<ExpectedObservation | null> => (await options.reviewed(request)) ?? options.consensus(request);
}
