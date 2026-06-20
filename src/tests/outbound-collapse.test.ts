import { describe, it, expect } from 'vitest';
import { collapseOutbound, type OutMsg } from '@/lib/realtime/outbound';

describe('collapseOutbound', () => {
  it('모션이 없으면 그대로', () => {
    const q: OutMsg[] = [
      { t: 'track', meta: { nick: 'A' } },
      { t: 'broadcast', event: 'msg', payload: { text: 'hi' } },
    ];
    expect(collapseOutbound(q)).toEqual(q);
  });

  it('여러 모션은 마지막 하나만 남기고 위치 유지', () => {
    const q: OutMsg[] = [
      { t: 'broadcast', event: 'motion', payload: { dx: 1 } },
      { t: 'broadcast', event: 'motion', payload: { dx: 2 } },
      { t: 'broadcast', event: 'motion', payload: { dx: 3 } },
    ];
    expect(collapseOutbound(q)).toEqual([{ t: 'broadcast', event: 'motion', payload: { dx: 3 } }]);
  });

  it('모션 외 메시지는 모두 보존, 모션은 마지막값만', () => {
    const q: OutMsg[] = [
      { t: 'track', meta: { nick: 'A' } },
      { t: 'broadcast', event: 'motion', payload: { dx: 1 } },
      { t: 'broadcast', event: 'msg', payload: { text: 'hi' } },
      { t: 'broadcast', event: 'motion', payload: { dx: 9 } },
      { t: 'broadcast', event: 'headfire', payload: { active: true } },
    ];
    expect(collapseOutbound(q)).toEqual([
      { t: 'track', meta: { nick: 'A' } },
      { t: 'broadcast', event: 'msg', payload: { text: 'hi' } },
      { t: 'broadcast', event: 'motion', payload: { dx: 9 } },
      { t: 'broadcast', event: 'headfire', payload: { active: true } },
    ]);
  });
});
