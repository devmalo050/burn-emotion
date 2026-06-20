import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 8080;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const PROXY_SECRET = process.env.REALTIME_PROXY_SECRET || '';
const HEARTBEAT_MS = 30000;
const SSE_PING_MS = 25000;
const MAX_BODY = 1_000_000;

// 단일 룸 릴레이 서버. WS 와 SSE+POST 두 transport 가 같은 방(conns)을 공유한다.
// presence·broadcast 모두 in-memory, 비영속.
export function createRealtimeServer({
  port = PORT,
  allowedOrigin = ALLOWED_ORIGIN,
  proxySecret = PROXY_SECRET,
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

  const applyMessage = (conn, m) => {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'track') {
      conn.meta = m.meta;
      broadcastPresence();
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
      send: (str) => {
        try {
          res.write(`data: ${str}\n\n`);
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

  // heartbeat — pong 없는 죽은 WS 연결 정리 (Cloudflare 프록시 idle drop 대비).
  // SSE 연결은 req close 로 끊김을 감지하고 ping 코멘트로 keepalive 한다.
  const heartbeat = setInterval(() => {
    for (const conn of conns) {
      if (conn.transport !== 'ws') continue;
      if (!conn.isAlive) {
        conn.ws.terminate();
        continue;
      }
      conn.isAlive = false;
      conn.ws.ping();
    }
  }, HEARTBEAT_MS);

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
