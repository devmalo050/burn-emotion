import { describe, it, expect } from 'vitest';
import { seededRandom } from '@/lib/seed-rng';

describe('seededRandom', () => {
  it('returns deterministic values for same seed and index', () => {
    const r = seededRandom(42);
    expect(r(1)).toBe(r(1));
    expect(r(2)).toBe(r(2));
  });

  it('returns different values for different indices', () => {
    const r = seededRandom(42);
    expect(r(1)).not.toBe(r(2));
  });

  it('returns values in [0, 1)', () => {
    const r = seededRandom(7);
    for (let i = 0; i < 50; i++) {
      const v = r(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const r1 = seededRandom(1);
    const r2 = seededRandom(2);
    expect(r1(5)).not.toBe(r2(5));
  });
});
