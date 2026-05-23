'use client';

// WS 서버와의 브라우저 측 연결. 자동 재연결 + 재연결 시 presence 재등록.
export interface RealtimeHandlers {
  onBroadcast: (event: string, payload: unknown) => void;
  onPresence: (state: Record<string, unknown>) => void;
}

export interface RealtimeClient {
  send: (event: string, payload: unknown) => void;
  track: (meta: unknown) => void;
  close: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? '';

export function isRealtimeConfigured(): boolean {
  return Boolean(WS_URL);
}

export function connectRealtime(
  sessionId: string,
  handlers: RealtimeHandlers,
): RealtimeClient | null {
  if (!WS_URL) return null;

  let ws: WebSocket | null = null;
  let closed = false;
  let lastMeta: unknown = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (closed) return;
    ws = new WebSocket(`${WS_URL}/?sid=${encodeURIComponent(sessionId)}`);
    ws.onopen = () => {
      // 재연결이면 직전 presence meta 를 다시 등록
      if (lastMeta != null && ws) {
        ws.send(JSON.stringify({ t: 'track', meta: lastMeta }));
      }
    };
    ws.onmessage = (ev) => {
      let m: { t?: string; event?: string; payload?: unknown; state?: unknown };
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.t === 'broadcast') {
        handlers.onBroadcast(m.event ?? '', m.payload);
      } else if (m.t === 'presence') {
        handlers.onPresence((m.state as Record<string, unknown>) ?? {});
      }
    };
    ws.onclose = () => {
      if (closed) return;
      reconnectTimer = setTimeout(open, 2000);
    };
    ws.onerror = () => {
      ws?.close();
    };
  };
  open();

  return {
    send: (event, payload) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ t: 'broadcast', event, payload }));
      }
    },
    track: (meta) => {
      lastMeta = meta;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ t: 'track', meta }));
      }
    },
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
