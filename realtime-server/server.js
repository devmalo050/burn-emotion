import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 8080;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const PROXY_SECRET = process.env.REALTIME_PROXY_SECRET || '';
const HEARTBEAT_MS = 30000;
const SSE_PING_MS = 25000;
// SSE 는 소켓 close 전파(프록시 체인)에만 의존하면 회사망 등에서 좀비 conn 이 남는다.
// POST(send/keepalive) 가 갱신하는 lastSeen 으로 reaper 가 회수한다. 클라 keepalive 주기의 배수.
const SSE_IDLE_MS = 60000;
const MAX_BODY = 1_000_000;
const MAX_SEND_BUFFER = 1_000_000;

// 단일 룸 릴레이 서버. WS 와 SSE+POST 두 transport 가 같은 방(conns)을 공유한다.
// presence·broadcast 모두 in-memory, 비영속.
export function createRealtimeServer({
  port = PORT,
  allowedOrigin = ALLOWED_ORIGIN,
  proxySecret = PROXY_SECRET,
  heartbeatMs = HEARTBEAT_MS,
  sseIdleMs = SSE_IDLE_MS,
} = {}) {
  const conns = new Set();
  const bySession = new Map();

  const presenceState = () => {
    const state = {};
    for (const c of conns) {
      if (c.meta) state[c.sessionId] = c.meta;
    }
    return state;
  };

  const broadcastPresence = () => {
    const msg = JSON.stringify({ t: 'presence', state: presenceState() });
    for (const c of conns) c.send(msg);
  };

  const addConn = (conn) => {
    conns.add(conn);
    bySession.set(conn.sessionId, conn);
    conn.send(JSON.stringify({ t: 'presence', state: presenceState() }));
  };

  const removeConn = (conn) => {
    if (!conns.has(conn)) return;
    conns.delete(conn);
    if (bySession.get(conn.sessionId) === conn) bySession.delete(conn.sessionId);
    broadcastPresence();
  };

  // 느린/멈춘 클라이언트의 송신 버퍼가 상한을 넘으면 버퍼링 대신 연결을 끊는다.
  // broadcast 루프 중 removeConn→broadcastPresence 동기 재진입을 피해 마이크로태스크로 지연.
  const dropConn = (conn) => {
    if (conn.overloaded) return;
    conn.overloaded = true;
    queueMicrotask(() => conn.closeTransport());
  };

  const applyMessage = (conn, m) => {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'track') {
      conn.meta = m.meta;
      broadcastPresence();
    } else if (m.t === 'leave') {
      conn.closeTransport?.();
    } else if (m.t === 'ping') {
      // lastSeen 은 handleSend 에서 이미 갱신됨. 여기선 no-op.
    } else if (m.t === 'broadcast') {
      const out = JSON.stringify({ t: 'broadcast', event: m.event, payload: m.payload });
      for (const peer of conns) {
        if (peer !== conn) peer.send(out);
      }
    } else if (m.t === 'batch' && Array.isArray(m.items)) {
      for (const item of m.items) applyMessage(conn, item);
    }
  };

  const handleRaw = (conn, raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    applyMessage(conn, m);
  };

  const handleSse = (req, res, url) => {
    if (proxySecret && req.headers['x-realtime-secret'] !== proxySecret) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const sessionId =
      url.searchParams.get('sid') || Math.random().toString(36).slice(2);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': ok\n\n');
    const conn = {
      sessionId,
      meta: null,
      isAlive: true,
      transport: 'sse',
      lastSeen: Date.now(),
      send: (str) => {
        if (conn.overloaded) return;
        try {
          res.write(`data: ${str}\n\n`);
          if (res.writableLength > MAX_SEND_BUFFER) dropConn(conn);
        } catch {}
      },
    };
    let pingTimer = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {}
    }, SSE_PING_MS);
    const finish = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      removeConn(conn);
      try {
        res.end();
      } catch {}
    };
    conn.closeTransport = finish;
    addConn(conn);
    req.on('close', finish);
    res.on('close', finish);
    req.on('error', finish);
  };

  const handleSend = (req, res, url) =>
    new Promise((resolve) => {
      if (proxySecret && req.headers['x-realtime-secret'] !== proxySecret) {
        res.writeHead(403);
        res.end('forbidden');
        resolve();
        return;
      }
      const sessionId = url.searchParams.get('sid');
      let body = '';
      req.on('data', (c) => {
        body += c;
        if (body.length > MAX_BODY) req.destroy();
      });
      req.on('end', () => {
        const conn = bySession.get(sessionId);
        if (!conn) {
          res.writeHead(409);
          res.end('no session');
          resolve();
          return;
        }
        conn.lastSeen = Date.now();
        handleRaw(conn, body);
        res.writeHead(204);
        res.end();
        resolve();
      });
      req.on('error', () => {
        try {
          res.writeHead(400);
          res.end();
        } catch {}
        resolve();
      });
    });

  const http = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/health') {
      res.writeHead(200);
      res.end('ok');
      return;
    }
    if (url.pathname === '/sse' && req.method === 'GET') {
      handleSse(req, res, url);
      return;
    }
    if (url.pathname === '/send' && req.method === 'POST') {
      void handleSend(req, res, url);
      return;
    }
    res.writeHead(426);
    res.end('upgrade required');
  });

  const wss = new WebSocketServer({ server: http });

  wss.on('connection', (ws, req) => {
    if (allowedOrigin && req.headers.origin !== allowedOrigin) {
      ws.close(1008, 'origin not allowed');
      return;
    }
    const url = new URL(req.url, 'http://x');
    const sessionId =
      url.searchParams.get('sid') || Math.random().toString(36).slice(2);
    const conn = {
      sessionId,
      meta: null,
      isAlive: true,
      transport: 'ws',
      ws,
      send: (str) => {
        if (conn.overloaded) return;
        if (ws.bufferedAmount > MAX_SEND_BUFFER) {
          dropConn(conn);
          return;
        }
        if (ws.readyState === ws.OPEN) ws.send(str);
      },
      closeTransport: () => {
        try {
          ws.terminate();
        } catch {}
      },
    };
    addConn(conn);
    ws.on('pong', () => {
      conn.isAlive = true;
    });
    ws.on('message', (raw) => handleRaw(conn, raw.toString()));
    ws.on('close', () => removeConn(conn));
  });

  // heartbeat — 죽은 연결 정리.
  // WS: pong 없는 연결을 terminate (Cloudflare 프록시 idle drop 대비).
  // SSE: req close 가 프록시 체인에서 전파 안 될 수 있으므로(회사망 좀비), POST/keepalive 가
  //      갱신하는 lastSeen 으로 idle reaper 가 회수한다.
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const conn of conns) {
      if (conn.transport === 'ws') {
        if (!conn.isAlive) {
          conn.ws.terminate();
          continue;
        }
        conn.isAlive = false;
        conn.ws.ping();
      } else if (conn.transport === 'sse') {
        if (now - conn.lastSeen > sseIdleMs) conn.closeTransport();
      }
    }
  }, heartbeatMs);

  return new Promise((resolve) => {
    http.listen(port, () => {
      resolve({
        port: http.address().port,
        close: () =>
          new Promise((res) => {
            clearInterval(heartbeat);
            for (const conn of conns) conn.closeTransport();
            wss.close(() => http.close(() => res()));
          }),
      });
    });
  });
}

// 직접 실행 시 기동
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  createRealtimeServer().then((s) => {
    console.log(`realtime server listening on :${s.port}`);
  });
}
