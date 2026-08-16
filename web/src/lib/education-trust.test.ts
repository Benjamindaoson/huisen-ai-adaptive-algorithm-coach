import { describe, expect, it } from 'vitest';
import { EDUCATION_TRUST_MANIFEST, FORMATIVE_EVALUATION_NOTICE, buildTrustCenterState } from './education-trust';

describe('education trust center', () => {
  it('classifies every data source and excludes AI suggestions from authoritative mastery', () => {
    expect(new Set(EDUCATION_TRUST_MANIFEST.dataCategories.map((item) => item.classification))).toEqual(
      new Set(['public', 'simulated', 'authorized-desensitized', 'learner-created']),
    );
    expect(EDUCATION_TRUST_MANIFEST.dataCategories.find((item) => item.id === 'mentor-guidance')).toMatchObject({
      affectsMastery: false,
      classification: 'simulated',
    });
    expect(FORMATIVE_EVALUATION_NOTICE).toContain('不替代教师、学校、企业或专业机构的最终评价');
  });

  it('only enables server export and deletion for an authenticated connected learner', () => {
    expect(buildTrustCenterState({ authenticated: false, apiConfigured: true, syncStatus: 'local' }).controls).toMatchObject({
      localExport: 'available', cloudExport: 'sign-in-required', deletion: 'sign-in-required',
    });
    expect(buildTrustCenterState({ authenticated: true, apiConfigured: false, syncStatus: 'error' }).controls).toMatchObject({
      localExport: 'available', cloudExport: 'unavailable', deletion: 'unavailable',
    });
    expect(buildTrustCenterState({ authenticated: true, apiConfigured: true, syncStatus: 'synced' }).controls).toMatchObject({
      localExport: 'available', cloudExport: 'available', deletion: 'available',
    });
  });
});
