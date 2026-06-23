import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];
  url: string;
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    this.readyState = MockWebSocket.CLOSED;
  }
  _open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
}

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
  close() {
    this.closed = true;
  }
  _open() {
    this.onopen?.();
  }
  _error() {
    this.onerror?.();
  }
}

type Connect = typeof import('@/lib/realtime/client').connectRealtime;
let connectRealtime: Connect;
const g = globalThis as unknown as Record<string, unknown>;
const saved: Record<string, unknown> = {};

beforeEach(async () => {
  saved.WebSocket = g.WebSocket;
  saved.EventSource = g.EventSource;
  saved.fetch = g.fetch;
  MockWebSocket.instances = [];
  MockEventSource.instances = [];
  g.WebSocket = MockWebSocket;
  g.EventSource = MockEventSource;
  g.fetch = vi.fn(() => Promise.resolve({ ok: true }));
  process.env.NEXT_PUBLIC_WS_URL = 'ws://test';
  vi.resetModules();
  vi.useFakeTimers();
  ({ connectRealtime } = await import('@/lib/realtime/client'));
});

afterEach(() => {
  vi.useRealTimers();
  g.WebSocket = saved.WebSocket;
  g.EventSource = saved.EventSource;
  g.fetch = saved.fetch;
});

const handlers = () => ({
  onBroadcast: vi.fn(),
  onPresence: vi.fn(),
  onStatus: vi.fn(),
});

describe('connectRealtime', () => {
  it('WS 연결 전(connecting) send 는 버퍼링됐다가 ws open 시 드레인된다', () => {
    const client = connectRealtime('sid1', handlers())!;
    const ws = MockWebSocket.instances[0];
    client.send('msg', { text: 'hi' });
    expect(ws.sent).toHaveLength(0);
    ws._open();
    expect(ws.sent).toHaveLength(1);
    expect(JSON.parse(ws.sent[0])).toEqual({
      t: 'broadcast',
      event: 'msg',
      payload: { text: 'hi' },
    });
    client.close();
  });

  it('SSE onerror 후 영구 사망하지 않고 백오프 재연결한다', () => {
    const client = connectRealtime('sid2', handlers())!;
    vi.advanceTimersByTime(4000); // fallback → switchToSse → openSse
    expect(MockEventSource.instances).toHaveLength(1);
    const es1 = MockEventSource.instances[0];
    es1._open();
    es1._error();
    expect(es1.closed).toBe(true);
    vi.advanceTimersByTime(2000); // sseRetries=1 → backoff 2s → openSse 재시도
    expect(MockEventSource.instances).toHaveLength(2);
    client.close();
  });

  it('SSE 미연결(sseLive=false) 동안에는 flush POST 를 보내지 않는다', () => {
    const client = connectRealtime('sid3', handlers())!;
    vi.advanceTimersByTime(4000); // → SSE 모드, flushTimer 시작, 아직 onopen 전
    client.send('msg', { text: 'x' });
    vi.advanceTimersByTime(100); // flush tick — sseLive=false → POST 안 함
    expect(g.fetch).not.toHaveBeenCalled();
    const es = MockEventSource.instances.at(-1)!;
    es._open(); // sseLive=true
    vi.advanceTimersByTime(100); // flush tick → POST
    expect(g.fetch).toHaveBeenCalledTimes(1);
    client.close();
  });

  it('SSE 모드에서 close() 시 명시적 leave 를 sendBeacon 으로 보낸다', () => {
    const beacon = vi.fn((_url: string | URL, _body?: BodyInit | null) => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    const client = connectRealtime('sidL', handlers())!;
    vi.advanceTimersByTime(4000); // → SSE 모드
    MockEventSource.instances.at(-1)!._open();
    client.close();
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, body] = beacon.mock.calls[0];
    expect(String(url)).toContain('/api/realtime/send');
    expect(JSON.parse(String(body))).toEqual({ t: 'leave' });
    vi.unstubAllGlobals();
  });

  it('WS 모드에서 close() 시 leave 를 보내지 않는다', () => {
    const beacon = vi.fn((_url: string | URL, _body?: BodyInit | null) => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    const client = connectRealtime('sidW', handlers())!;
    MockWebSocket.instances[0]._open();
    client.close();
    expect(beacon).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('SSE idle 상태에서 KEEPALIVE 주기마다 ping POST 로 lastSeen 을 갱신한다', () => {
    const client = connectRealtime('sidK', handlers())!;
    vi.advanceTimersByTime(4000); // → SSE 모드
    MockEventSource.instances.at(-1)!._open();
    (g.fetch as ReturnType<typeof vi.fn>).mockClear();
    vi.advanceTimersByTime(20000); // 활동 없이 KEEPALIVE_MS 경과
    const calls = (g.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const pinged = calls.some((c) => {
      try {
        return JSON.parse((c[1] as { body: string }).body).t === 'ping';
      } catch {
        return false;
      }
    });
    expect(pinged).toBe(true);
    client.close();
  });
});
