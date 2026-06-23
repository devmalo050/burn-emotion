import { describe, it, expect } from 'vitest';
import { sampleAt, prune, type PeerSnapshot } from '@/lib/realtime/interpolate';

const snap = (t: number, dx: number, dy = 0, yJump = 0): PeerSnapshot => ({ t, dx, dy, yJump });

describe('sampleAt', () => {
  it('빈 버퍼는 null', () => {
    expect(sampleAt([], 100)).toBeNull();
  });

  it('스냅샷 1개면 그 값을 그대로 반환', () => {
    expect(sampleAt([snap(10, 5, 6, 7)], 999)).toEqual({ dx: 5, dy: 6, yJump: 7 });
  });

  it('두 스냅샷 중간 시점은 선형보간한다', () => {
    const buf = [snap(0, 0), snap(100, 10)];
    expect(sampleAt(buf, 50)).toEqual({ dx: 5, dy: 0, yJump: 0 });
    expect(sampleAt(buf, 25)).toEqual({ dx: 2.5, dy: 0, yJump: 0 });
  });

  it('최신 스냅샷 이후 시점은 최신값으로 hold (외삽 안 함)', () => {
    const buf = [snap(0, 0), snap(100, 10)];
    expect(sampleAt(buf, 500)).toEqual({ dx: 10, dy: 0, yJump: 0 });
  });

  it('첫 스냅샷 이전 시점은 첫값으로 clamp', () => {
    const buf = [snap(100, 3), snap(200, 9)];
    expect(sampleAt(buf, 0)).toEqual({ dx: 3, dy: 0, yJump: 0 });
  });

  it('등속 이동을 등속 직선으로 복원한다', () => {
    // 50ms 간격 등속(매 50ms 마다 dx +5). 중간 시점들도 일정 속도여야 한다.
    const buf = [snap(0, 0), snap(50, 5), snap(100, 10), snap(150, 15)];
    expect(sampleAt(buf, 25)!.dx).toBeCloseTo(2.5);
    expect(sampleAt(buf, 75)!.dx).toBeCloseTo(7.5);
    expect(sampleAt(buf, 125)!.dx).toBeCloseTo(12.5);
  });

  it('여러 축(dx/dy/yJump)을 동시에 보간한다', () => {
    const buf = [snap(0, 0, 0, 0), snap(100, 10, 20, 4)];
    expect(sampleAt(buf, 50)).toEqual({ dx: 5, dy: 10, yJump: 2 });
  });
});

describe('prune', () => {
  it('renderTime 보간에 필요한 직전 1개만 남기고 오래된 것 제거', () => {
    const buf = [snap(0, 0), snap(50, 5), snap(100, 10), snap(150, 15)];
    prune(buf, 120);
    // renderTime=120 은 100~150 구간 → 100(직전) 부터 남아야 함
    expect(buf.map((s) => s.t)).toEqual([100, 150]);
  });

  it('최소 2개는 항상 유지한다', () => {
    const buf = [snap(0, 0), snap(50, 5)];
    prune(buf, 999);
    expect(buf.length).toBe(2);
  });

  it('아직 필요한 스냅샷은 제거하지 않는다', () => {
    const buf = [snap(0, 0), snap(50, 5), snap(100, 10)];
    prune(buf, 30); // 0~50 구간 보간 중 → 0 도 필요
    expect(buf.map((s) => s.t)).toEqual([0, 50, 100]);
  });
});
