import type { LearningStoreMode } from './learning-store.js';
import type { MentorStore } from './mentor/mentor-store.js';
import type { MentorOSStore } from './mentor-os/store.js';

export type RunnerCapability = 'ready' | 'unavailable';
export type PlatformCapabilityInput = {
  identity: 'permissive-local' | 'signed' | 'account-postgres';
  learningStorage: LearningStoreMode;
  mentorStorage: MentorStore['mode'];
  mentorRuntimeStorage: MentorOSStore['mode'];
  mentorModel: string;
  runner: RunnerCapability;
  qualityGatePassed: boolean;
};

export const capabilityResponseSchema = {
  type: 'object', additionalProperties: false, required: ['version', 'status', 'capabilities'],
  properties: {
    version: { const: 1 }, status: { enum: ['ready', 'degraded'] },
    capabilities: {
      type: 'object', additionalProperties: false, required: ['identity', 'learning', 'runner', 'mentor'],
      properties: {
        identity: { type: 'object', additionalProperties: false, required: ['status', 'mode'], properties: { status: { enum: ['ready', 'local-only'] }, mode: { enum: ['signed', 'permissive-local', 'account-postgres'] } } },
        learning: { type: 'object', additionalProperties: false, required: ['status', 'storage'], properties: { status: { enum: ['ready', 'local-only'] }, storage: { enum: ['memory', 'file-local', 'postgres'] } } },
        runner: { type: 'object', additionalProperties: false, required: ['status'], properties: { status: { enum: ['ready', 'unavailable'] } } },
        mentor: { type: 'object', additionalProperties: false, required: ['status', 'storage', 'runtimeStorage', 'model'], properties: { status: { enum: ['ready', 'experimental'] }, storage: { enum: ['file-local', 'postgres'] }, runtimeStorage: { enum: ['memory', 'file-local', 'postgres'] }, model: { type: 'string' } } },
      },
    },
  },
} as const;

export function buildCapabilities(input: PlatformCapabilityInput) {
  const capabilities = {
    identity: { status: ['signed', 'account-postgres'].includes(input.identity) ? 'ready' as const : 'local-only' as const, mode: input.identity },
    learning: { status: input.learningStorage === 'postgres' ? 'ready' as const : 'local-only' as const, storage: input.learningStorage },
    runner: { status: input.runner },
    mentor: { status: input.qualityGatePassed && input.mentorStorage === 'postgres' && input.mentorRuntimeStorage === 'postgres' ? 'ready' as const : 'experimental' as const, storage: input.mentorStorage, runtimeStorage: input.mentorRuntimeStorage, model: input.mentorModel },
  };
  const status = capabilities.identity.status === 'ready' && capabilities.learning.status === 'ready' && capabilities.runner.status === 'ready' && capabilities.mentor.status === 'ready'
    ? 'ready' as const : 'degraded' as const;
  return { version: 1 as const, status, capabilities };
}

export function platformError(code: string, message: string, traceId: string) {
  return { version: 1 as const, error: { code, message, traceId } };
}

export function validateIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{8,200}$/.test(value)) throw new Error('Invalid idempotency key');
  return value;
}
