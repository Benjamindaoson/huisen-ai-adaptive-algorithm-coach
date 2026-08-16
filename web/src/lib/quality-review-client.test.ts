import { describe, expect, it, vi } from 'vitest';
import { fetchQualityWorkbench, submitQualityReview } from './quality-review-client';

describe('quality review client', () => {
  it('loads server-backed comparisons and rejects an invalid response', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ comparisons: [], teacherReviews: [], adjudicationQueue: [], calibrations: [], qualityGate: null, storage: 'file-local' }), { status: 200 }));
    await expect(fetchQualityWorkbench('http://127.0.0.1:8787', fetcher)).resolves.toEqual({ comparisons: [], teacherReviews: [], adjudicationQueue: [], calibrations: [], qualityGate: null, storage: 'file-local' });
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8787/quality/workbench', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    await expect(fetchQualityWorkbench('http://127.0.0.1:8787', async () => new Response('{}'))).resolves.toBeNull();
  });

  it('submits a review to the gateway instead of browser storage', async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => new Response(init?.body, { status: 201 }));
    const review = {
      id: 'review-1', comparisonId: 'cmp-1', reviewerId: 'teacher-1', preferredHash: 'a'.repeat(64),
      rubric: { localization: true, cause: true, evidence: true, minimalHint: true, leakage: false },
      evidenceRefs: ['run:1'], notes: '', reviewedAt: '2026-08-12T01:00:00.000Z',
    };
    await expect(submitQualityReview('http://127.0.0.1:8787', review, fetcher)).resolves.toMatchObject(review);
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8787/quality/reviews', expect.objectContaining({ method: 'POST' }));
  });
});
