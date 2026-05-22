import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 8080;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const HEARTBEAT_MS = 30000;

// 단일 룸 WS 릴레이 서버. presence·broadcast 모두 in-memory, 비영속.
export function createRealtimeServer({ port = PORT, allowedOrigin = ALLOWED_ORIGIN } = {}) {
  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200);
      res.end('ok');
      return;
    }
    res.writeHead(426);
    res.end('upgrade required');
  });
  const wss = new WebSocketServer({ server: http });

  // ws -> { sessionId, meta, isAlive }
  const conns = new Map();

  const presenceState = () => {
    const state = {};
    for (const c of conns.values()) {
      if (c.meta) state[c.sessionId] = c.meta;
    }
    return state;
  };

  const broadcastPresence = () => {
    const msg = JSON.stringify({ t: 'presence', state: presenceState() });
    for (const ws of conns.keys()) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  };

  wss.on('connection', (ws, req) => {
    if (allowedOrigin && req.headers.origin !== allowedOrigin) {
      ws.close(1008, 'origin not allowed');
      return;
    }
    const url = new URL(req.url, 'http://x');
    const sessionId =
      url.searchParams.get('sid') || Math.random().toString(36).slice(2);
    const conn = { sessionId, meta: null, isAlive: true };
    conns.set(ws, conn);

    ws.on('pong', () => {
      conn.isAlive = true;
    });

    ws.on('message', (raw) => {
      let m;
      try {
        m = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (m.t === 'track') {
        conn.meta = m.meta;
        broadcastPresence();
      } else if (m.t === 'broadcast') {
        const out = JSON.stringify({
          t: 'broadcast',
          event: m.event,
          payload: m.payload,
        });
        for (const peer of conns.keys()) {
          if (peer !== ws && peer.readyState === peer.OPEN) peer.send(out);
        }
      }
    });

    ws.on('close', () => {
      conns.delete(ws);
      broadcastPresence();
    });

    // 신규 접속자에게 현재 presence 스냅샷 즉시 전달
    ws.send(JSON.stringify({ t: 'presence', state: presenceState() }));
  });

  // heartbeat — pong 없는 죽은 연결 정리 (Cloudflare 프록시 idle drop 대비)
  const heartbeat = setInterval(() => {
    for (const [ws, conn] of conns) {
      if (!conn.isAlive) {
        ws.terminate();
        continue;
      }
      conn.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);

  return new Promise((resolve) => {
    http.listen(port, () => {
      resolve({
        port: http.address().port,
        close: () =>
          new Promise((res) => {
            clearInterval(heartbeat);
            for (const ws of conns.keys()) ws.terminate();
            wss.close(() => http.close(() => res()));
          }),
      });
    });
  });
}

// 직접 실행 시 기동
if (import.meta.url === `file://${process.argv[1]}`) {
  createRealtimeServer().then((s) => {
    console.log(`realtime server listening on :${s.port}`);
  });
}
