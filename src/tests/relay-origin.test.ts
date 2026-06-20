import { describe, it, expect } from 'vitest';
import { relayHttpOrigin } from '@/lib/realtime/relay-origin';

describe('relayHttpOrigin', () => {
  it('REALTIME_HTTP_ORIGIN 이 있으면 우선, 끝 슬래시 제거', () => {
    expect(relayHttpOrigin({ REALTIME_HTTP_ORIGIN: 'http://realtime:8080/' })).toBe(
      'http://realtime:8080',
    );
  });

  it('wss:// 는 https:// 로 변환', () => {
    expect(relayHttpOrigin({ NEXT_PUBLIC_WS_URL: 'wss://ws.burn-emotion.net' })).toBe(
      'https://ws.burn-emotion.net',
    );
  });

  it('ws:// 는 http:// 로 변환', () => {
    expect(relayHttpOrigin({ NEXT_PUBLIC_WS_URL: 'ws://localhost:8080' })).toBe(
      'http://localhost:8080',
    );
  });

  it('아무것도 없으면 빈 문자열', () => {
    expect(relayHttpOrigin({})).toBe('');
  });
});
