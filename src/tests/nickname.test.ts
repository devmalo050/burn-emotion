import { describe, it, expect, vi } from 'vitest';
import { makeNickname } from '@/lib/nickname';

describe('makeNickname', () => {
  it('returns Korean nickname when random < 0.65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const nick = makeNickname();
    expect(nick).toMatch(/^[가-힣]+(?: [가-힣]+)? [가-힣]+(?: [가-힣]+)?$/);
    vi.restoreAllMocks();
  });

  it('returns English nickname when random >= 0.65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const nick = makeNickname();
    expect(nick).toMatch(/^[a-z]+ [a-z]+$/);
    vi.restoreAllMocks();
  });

  it('does not contain digits', () => {
    for (let i = 0; i < 50; i++) {
      const nick = makeNickname();
      expect(nick).not.toMatch(/\d/);
    }
  });
});
