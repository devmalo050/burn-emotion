'use client';

import { collapseOutbound, type OutMsg } from '@/lib/realtime/outbound';

// 브라우저 측 실시간 연결. WS 우선, 회사망 등에서 WS 가 막히면 same-origin SSE+POST 로 폴백.
export type RealtimeStatus = 'connecting' | 'open' | 'closed';

export interface RealtimeHandlers {
  onBroadcast: (event: string, payload: unknown) => void;
  onPresence: (state: Record<string, unknown>) => void;
  onStatus?: (status: RealtimeStatus) => void;
}

export interface RealtimeClient {
  send: (event: string, payload: unknown) => void;
  track: (meta: unknown) => void;
  close: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? '';
const FALLBACK_MS = 4000;
const FLUSH_MS = 100;

export function isRealtimeConfigured(): boolean {
  return Boolean(WS_URL);
}

export function connectRealtime(
  sessionId: string,
  handlers: RealtimeHandlers,
): RealtimeClient | null {
  if (!WS_URL) return null;

  let closed = false;
  let mode: 'connecting' | 'ws' | 'sse' = 'connecting';
  let lastMeta: unknown = null;

  let ws: WebSocket | null = null;
  let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let wsOpenedAt = 0;
  let wsFlaps = 0;

  let es: EventSource | null = null;
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let outQueue: OutMsg[] = [];
  let sseLive = false;
  let sseRetries = 0;
  let sseRetryTimer: ReturnType<typeof setTimeout> | null = null;

  const emit = (s: RealtimeStatus) => handlers.onStatus?.(s);

  const handleInbound = (dataStr: string) => {
    let m: { t?: string; event?: string; payload?: unknown; state?: unknown };
    try {
      m = JSON.parse(dataStr);
    } catch {
      return;
    }
    if (m.t === 'broadcast') {
      handlers.onBroadcast(m.event ?? '', m.payload);
    } else if (m.t === 'presence') {
      handlers.onPresence((m.state as Record<string, unknown>) ?? {});
    }
  };

  const sendQuery = `?sid=${encodeURIComponent(sessionId)}`;

  const OUT_CAP = 300;
  const enqueue = (msg: OutMsg) => {
    outQueue.push(msg);
    if (outQueue.length > OUT_CAP) {
      outQueue = collapseOutbound(outQueue);
      if (outQueue.length > OUT_CAP) outQueue.splice(0, outQueue.length - OUT_CAP);
    }
  };

  const flush = () => {
    if (!sseLive || outQueue.length === 0) return;
    const items = collapseOutbound(outQueue);
    outQueue = [];
    const body = JSON.stringify(items.length === 1 ? items[0] : { t: 'batch', items });
    void fetch(`/api/realtime/send${sendQuery}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  };

  const drainToWs = () => {
    const sock = ws;
    if (!sock || sock.readyState !== WebSocket.OPEN || outQueue.length === 0) return;
    const items = collapseOutbound(outQueue);
    outQueue = [];
    for (const it of items) sock.send(JSON.stringify(it));
  };

  const openSse = () => {
    if (closed) return;
    emit('connecting');
    es = new EventSource(`/api/realtime/stream${sendQuery}`);
    es.onopen = () => {
      sseLive = true;
      sseRetries = 0;
      emit('open');
      if (lastMeta != null) enqueue({ t: 'track', meta: lastMeta });
    };
    es.onmessage = (ev) => handleInbound(ev.data);
    es.onerror = () => {
      if (closed) return;
      sseLive = false;
      emit('closed');
      if (es) {
        es.onopen = es.onmessage = es.onerror = null;
        try {
          es.close();
        } catch {}
        es = null;
      }
      sseRetries += 1;
      const backoff = Math.min(1000 * 2 ** Math.min(sseRetries, 5), 30000);
      if (sseRetryTimer) clearTimeout(sseRetryTimer);
      sseRetryTimer = setTimeout(() => {
        if (closed || mode !== 'sse') return;
        if (sseRetries % 4 === 0) retryWsFromSse();
        else openSse();
      }, backoff);
    };
    if (!flushTimer) flushTimer = setInterval(flush, FLUSH_MS);
  };

  const switchToSse = () => {
    if (closed || mode === 'sse') return;
    mode = 'sse';
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer);
      wsReconnectTimer = null;
    }
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close();
      } catch {}
      ws = null;
    }
    openSse();
  };

  const openWs = () => {
    if (closed) return;
    emit('connecting');
    ws = new WebSocket(`${WS_URL}/${sendQuery}`);
    ws.onopen = () => {
      mode = 'ws';
      wsOpenedAt = Date.now();
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      emit('open');
      if (lastMeta != null && ws) {
        ws.send(JSON.stringify({ t: 'track', meta: lastMeta }));
      }
      drainToWs();
    };
    ws.onmessage = (ev) => handleInbound(ev.data);
    ws.onclose = () => {
      if (closed) return;
      if (mode === 'ws') {
        const uptime = wsOpenedAt ? Date.now() - wsOpenedAt : 0;
        wsFlaps = uptime > 0 && uptime < 3000 ? wsFlaps + 1 : 0;
        if (wsFlaps >= 3) {
          switchToSse();
          return;
        }
        emit('closed');
        wsReconnectTimer = setTimeout(openWs, 2000);
      } else {
        switchToSse();
      }
    };
    ws.onerror = () => {
      ws?.close();
    };
  };

  const retryWsFromSse = () => {
    if (closed) return;
    if (es) {
      es.onopen = es.onmessage = es.onerror = null;
      try {
        es.close();
      } catch {}
      es = null;
    }
    sseLive = false;
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    mode = 'connecting';
    wsFlaps = 0;
    fallbackTimer = setTimeout(() => {
      if (mode === 'connecting') switchToSse();
    }, FALLBACK_MS);
    openWs();
  };

  fallbackTimer = setTimeout(() => {
    if (mode === 'connecting') switchToSse();
  }, FALLBACK_MS);
  openWs();

  return {
    send: (event, payload) => {
      const msg: OutMsg = { t: 'broadcast', event, payload };
      if (mode === 'ws' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        enqueue(msg);
      }
    },
    track: (meta) => {
      lastMeta = meta;
      if (mode === 'ws' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ t: 'track', meta }));
      } else if (mode === 'sse') {
        enqueue({ t: 'track', meta });
      }
    },
    close: () => {
      closed = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      if (sseRetryTimer) clearTimeout(sseRetryTimer);
      if (flushTimer) {
        flush();
        clearInterval(flushTimer);
        flushTimer = null;
      }
      if (ws) {
        try {
          ws.close();
        } catch {}
        ws = null;
      }
      if (es) {
        try {
          es.close();
        } catch {}
        es = null;
      }
    },
  };
}
