import { describe, it, expect } from 'vitest';
import { computeJoystickVector, MAX_RADIUS, DEAD_ZONE } from '../components/TouchControls/touch-vector';

const R = MAX_RADIUS;
const DZ = DEAD_ZONE;

describe('computeJoystickVector', () => {
  it('데드존 내부 입력은 0 벡터', () => {
    expect(computeJoystickVector(100, 100, 103, 100, R, DZ)).toEqual({ x: 0, y: 0 });
  });

  it('origin 과 동일한 점도 0 벡터(0 나눗셈 방지)', () => {
    expect(computeJoystickVector(100, 100, 100, 100, R, DZ)).toEqual({ x: 0, y: 0 });
  });

  it('오른쪽 최대 드래그는 x≈1, y≈0', () => {
    const v = computeJoystickVector(100, 100, 100 + 200, 100, R, DZ);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
  });

  it('화면 위로 드래그(스크린 -y)는 게임좌표 y>0', () => {
    const v = computeJoystickVector(100, 100, 100, 100 - R, R, DZ);
    expect(v.y).toBeCloseTo(1);
    expect(v.x).toBeCloseTo(0);
  });

  it('절반 드래그는 아날로그 크기 ~0.5', () => {
    const v = computeJoystickVector(100, 100, 100 + R * 0.5, 100, R, DZ);
    expect(v.x).toBeCloseTo(0.5);
    expect(v.y).toBeCloseTo(0);
  });

  it('대각선도 길이 1 이하, 오른쪽-위 부호', () => {
    const v = computeJoystickVector(100, 100, 100 + 200, 100 - 200, R, DZ);
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(1.0001);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeGreaterThan(0);
  });
});
