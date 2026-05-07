import { describe, it, expect } from 'vitest';
import { layoutPos } from '@/lib/layout/silhouette-layout';

describe('layoutPos', () => {
  it('flips horizontally when x > 50', () => {
    const total = 20;
    const positions = Array.from({ length: total }, (_, i) => layoutPos(i, total));
    const rightSiders = positions.filter((p) => p.x > 50);
    expect(rightSiders.length).toBeGreaterThan(0);
    expect(rightSiders.every((p) => p.flip)).toBe(true);
  });

  it('returns variant in [0, 4]', () => {
    for (let i = 0; i < 30; i++) {
      const p = layoutPos(i, 30);
      expect(p.variant).toBeGreaterThanOrEqual(0);
      expect(p.variant).toBeLessThan(5);
    }
  });

  it('back ring (first 60%) has smaller scale than 1', () => {
    const total = 10;
    const backCount = Math.ceil(total * 0.6);
    for (let i = 0; i < backCount; i++) {
      const p = layoutPos(i, total);
      expect(p.scale).toBeLessThan(1);
    }
  });

  it('front ring uses fixed scale 0.85', () => {
    const total = 10;
    const backCount = Math.ceil(total * 0.6);
    for (let i = backCount; i < total; i++) {
      const p = layoutPos(i, total);
      expect(p.scale).toBe(0.85);
    }
  });
});
