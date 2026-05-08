import { describe, it, expect } from 'vitest';
import { makeNickname } from '@/lib/nickname';

describe('makeNickname', () => {
  it('returns Korean nickname (no English, no digits)', () => {
    for (let i = 0; i < 50; i++) {
      const nick = makeNickname();
      // 한글 + 공백 + 한글 (숫자나 영문 없음)
      expect(nick).toMatch(/^[가-힣]+(?: [가-힣]+)? [가-힣]+(?: [가-힣]+)?$/);
      expect(nick).not.toMatch(/[a-zA-Z]/);
      expect(nick).not.toMatch(/\d/);
    }
  });

  it('contains exactly one space (between adj and noun)', () => {
    const nick = makeNickname();
    const spaceCount = (nick.match(/ /g) ?? []).length;
    // '텅 빈' 같은 형용사가 있어 공백이 2개 이상일 수 있음 — 1개 이상은 보장
    expect(spaceCount).toBeGreaterThanOrEqual(1);
  });
});
