import { describe, it, expect } from 'vitest';
import { buildMyEntity, mergeSilhouettes, type MySpot } from '@/lib/realtime/presence';

const spot: MySpot = { x: 30, y: 40, scale: 0.8, flip: true, variant: 2, joinedAt: 1000 };

describe('buildMyEntity', () => {
  it('내 spot 으로부터 실루엣 엔티티 생성', () => {
    const me = buildMyEntity(spot, '나무늘보');
    expect(me).toMatchObject({
      nick: '나무늘보',
      x: 30,
      y: 40,
      scale: 0.8,
      flip: true,
      variant: 2,
    });
  });
});

describe('mergeSilhouettes', () => {
  const me = buildMyEntity(spot, '나무늘보');

  it('presence 가 비어도 본인은 항상 0번 인덱스로 포함', () => {
    const list = mergeSilhouettes(me, {}, '나무늘보');
    expect(list).toHaveLength(1);
    expect(list[0].nick).toBe('나무늘보');
  });

  it('presence echo 의 본인 항목은 제외하고 로컬 spot 을 신뢰 — 중복 렌더 방지', () => {
    const state = {
      s1: { nick: '나무늘보', x: 99, y: 99, scale: 1, flip: false, variant: 0, joinedAt: 1000 },
      s2: { nick: '여우', x: 60, y: 10, scale: 0.7, flip: false, variant: 1, joinedAt: 2000 },
    };
    const list = mergeSilhouettes(me, state, '나무늘보');
    expect(list).toHaveLength(2);
    expect(list[0].nick).toBe('나무늘보');
    expect(list[0].x).toBe(30);
    expect(list.filter((s) => s.nick === '나무늘보')).toHaveLength(1);
    expect(list[1].nick).toBe('여우');
  });

  it('peer 는 joinedAt 오름차순 정렬', () => {
    const state = {
      a: { nick: '늦은이', x: 1, y: 1, scale: 1, flip: false, variant: 0, joinedAt: 5000 },
      b: { nick: '이른이', x: 2, y: 2, scale: 1, flip: false, variant: 0, joinedAt: 3000 },
    };
    const list = mergeSilhouettes(me, state, '나무늘보');
    expect(list.map((s) => s.nick)).toEqual(['나무늘보', '이른이', '늦은이']);
  });

  it('nick 없는 항목은 무시', () => {
    const state = {
      bad: { x: 1, y: 2 },
      good: { nick: '곰', x: 3, y: 4, scale: 1, flip: false, variant: 0, joinedAt: 2000 },
    };
    const list = mergeSilhouettes(me, state, '나무늘보');
    expect(list.map((s) => s.nick)).toEqual(['나무늘보', '곰']);
  });
});
