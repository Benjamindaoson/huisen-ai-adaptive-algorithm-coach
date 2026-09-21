import { validateEvidenceEvent, type EvidenceEvent, type EvidenceType } from '../../contracts/evidence-event';

export type EvidenceQuery = Readonly<{
  learnerId?: string;
  skillId?: string;
  evidenceType?: EvidenceType;
}>;

export interface EvidenceStore {
  append(event: EvidenceEvent): void;
  appendMany(events: readonly EvidenceEvent[]): void;
  get(id: string): EvidenceEvent | undefined;
  list(query?: EvidenceQuery): readonly EvidenceEvent[];
  count(query?: EvidenceQuery): number;
}

export class InMemoryEvidenceStore implements EvidenceStore {
  private readonly events = new Map<string, EvidenceEvent>();

  append(event: EvidenceEvent): void {
    validateEvidenceEvent(event);
    if (this.events.has(event.id)) throw new Error(`EvidenceEvent already exists: ${event.id}`);
    const frozen = Object.freeze({
      ...event,
      provenance: Object.freeze({ ...event.provenance }),
      metadata: event.metadata ? Object.freeze({ ...event.metadata }) : undefined,
    }) as EvidenceEvent;
    this.events.set(frozen.id, frozen);
  }

  appendMany(events: readonly EvidenceEvent[]): void {
    const ids = new Set<string>();
    for (const event of events) {
      validateEvidenceEvent(event);
      if (ids.has(event.id) || this.events.has(event.id)) throw new Error(`EvidenceEvent already exists: ${event.id}`);
      ids.add(event.id);
    }
    for (const event of events) this.append(event);
  }

  get(id: string): EvidenceEvent | undefined {
    return this.events.get(id);
  }

  list(query: EvidenceQuery = {}): readonly EvidenceEvent[] {
    return [...this.events.values()]
      .filter((event) => !query.learnerId || event.learnerId === query.learnerId)
      .filter((event) => !query.skillId || event.skillId === query.skillId)
      .filter((event) => !query.evidenceType || event.evidenceType === query.evidenceType)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }

  count(query: EvidenceQuery = {}): number {
    return this.list(query).length;
  }
}
