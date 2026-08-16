import type { PlatformBootstrap } from './platform-client';

export const PLATFORM_ACKNOWLEDGEMENT_STORAGE_KEY = 'od-platform-immutable-acks-v1';
const MAX_ACKNOWLEDGEMENTS = 10_000;

export type ImmutableAcknowledgementInput = {
  learnerId: string;
  kind: 'event' | 'attempt';
  payload: Record<string, unknown>;
};

type AcknowledgementEntry = {
  learnerId: string;
  kind: ImmutableAcknowledgementInput['kind'];
  payloadId: string;
  fingerprint: string;
  acknowledgedAt: string;
};
type AcknowledgementFile = { version: 1; entries: AcknowledgementEntry[] };
type LedgerStorage = Pick<Storage, 'getItem' | 'setItem'>;
type LedgerOptions = { hashText?: (value: string) => Promise<string> };

function validIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,200}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase());
}

function validEntry(value: unknown): value is AcknowledgementEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Partial<AcknowledgementEntry>;
  return validIdentifier(entry.learnerId)
    && (entry.kind === 'event' || entry.kind === 'attempt')
    && validIdentifier(entry.payloadId)
    && typeof entry.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(entry.fingerprint)
    && typeof entry.acknowledgedAt === 'string' && !Number.isNaN(Date.parse(entry.acknowledgedAt));
}

function read(storage: Pick<Storage, 'getItem'>): AcknowledgementEntry[] {
  try {
    const value = JSON.parse(storage.getItem(PLATFORM_ACKNOWLEDGEMENT_STORAGE_KEY) ?? 'null') as Partial<AcknowledgementFile> | null;
    if (value?.version !== 1 || !Array.isArray(value.entries) || value.entries.some((entry) => !validEntry(entry))) return [];
    return value.entries.slice(-MAX_ACKNOWLEDGEMENTS);
  } catch { return []; }
}

function persist(storage: Pick<Storage, 'setItem'>, entries: AcknowledgementEntry[]): boolean {
  try {
    storage.setItem(PLATFORM_ACKNOWLEDGEMENT_STORAGE_KEY, JSON.stringify({ version: 1, entries: entries.slice(-MAX_ACKNOWLEDGEMENTS) } satisfies AcknowledgementFile));
    return true;
  } catch { return false; }
}

function stableJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => item === undefined ? 'null' : stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return 'null';
}

async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizedPayload(input: ImmutableAcknowledgementInput): Record<string, unknown> {
  if (input.payload.learnerId !== input.learnerId) return input.payload;
  const { learnerId: _redundantOwner, ...payload } = input.payload;
  return payload;
}

async function toEntry(input: ImmutableAcknowledgementInput, acknowledgedAt: string, hashText: (value: string) => Promise<string>): Promise<AcknowledgementEntry | null> {
  const payloadId = input.payload.id;
  if (!validIdentifier(input.learnerId) || !validIdentifier(payloadId)) return null;
  const fingerprint = await hashText(stableJson(normalizedPayload(input)));
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) return null;
  return { learnerId: input.learnerId, kind: input.kind, payloadId, fingerprint, acknowledgedAt };
}

function key(entry: Pick<AcknowledgementEntry, 'learnerId' | 'kind' | 'payloadId'>): string {
  return `${entry.learnerId}\u0000${entry.kind}\u0000${entry.payloadId}`;
}

export function createImmutableAcknowledgementLedger(storage: LedgerStorage, options: LedgerOptions = {}) {
  const hashText = options.hashText ?? sha256Text;
  let entries = read(storage);
  async function has(input: ImmutableAcknowledgementInput): Promise<boolean> {
    try {
      const candidate = await toEntry(input, new Date(0).toISOString(), hashText);
      return Boolean(candidate && entries.some((entry) => key(entry) === key(candidate) && entry.fingerprint === candidate.fingerprint));
    } catch { return false; }
  }
  async function acknowledgeMany(inputs: ImmutableAcknowledgementInput[], now = new Date()): Promise<boolean> {
    try {
      const acknowledgedAt = now.toISOString();
      const candidates = (await Promise.all(inputs.map((input) => toEntry(input, acknowledgedAt, hashText))))
        .filter((entry): entry is AcknowledgementEntry => entry !== null);
      if (!candidates.length) return false;
      const merged = new Map(entries.map((entry) => [key(entry), entry]));
      for (const candidate of candidates) {
        merged.delete(key(candidate));
        merged.set(key(candidate), candidate);
      }
      const next = [...merged.values()].slice(-MAX_ACKNOWLEDGEMENTS);
      if (!persist(storage, next)) return false;
      entries = next;
      return true;
    } catch { return false; }
  }
  return {
    has,
    acknowledge: (input: ImmutableAcknowledgementInput, now = new Date()) => acknowledgeMany([input], now),
    acknowledgeMany,
  };
}

export async function acknowledgePlatformBootstrap(
  storage: LedgerStorage,
  learnerId: string,
  bootstrap: Pick<PlatformBootstrap, 'events' | 'attempts'>,
  options: LedgerOptions & { now?: () => Date } = {},
): Promise<boolean> {
  return createImmutableAcknowledgementLedger(storage, options).acknowledgeMany([
    ...bootstrap.events.map((payload) => ({ learnerId, kind: 'event' as const, payload })),
    ...bootstrap.attempts.map((payload) => ({ learnerId, kind: 'attempt' as const, payload })),
  ], options.now?.() ?? new Date());
}
