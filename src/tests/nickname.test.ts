import { describe, it, expect, vi } from 'vitest';
import { makeNickname } from '@/lib/nickname';

describe('makeNickname', () => {
  it('returns Korean nickname when random < 0.65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const nick = makeNickname();
    expect(nick).toMatch(/^[가-힣 ]+_[가-힣 ]+_\d{2}$/);
    vi.restoreAllMocks();
  });

  it('returns English nickname when random >= 0.65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const nick = makeNickname();
    expect(nick).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    vi.restoreAllMocks();
  });

  it('zero-pads number to 2 digits', () => {
    const nick = makeNickname();
    const num = nick.match(/(\d{2})$/)?.[1];
    expect(num?.length).toBe(2);
  });
});
