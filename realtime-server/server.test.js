import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createRealtimeServer } from './server.js';

function connect(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/?sid=${Math.random()}`);
    ws.on('error', reject);
    // open 이전에 message 핸들러를 달아 초기 presence 스냅샷을 소비한다.
    // open 후에 달면 서버가 이미 전송한 메시지를 놓칠 수 있다.
    ws.once('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.t === 'presence') resolve(ws);
    });
  });
}

function nextMessage(ws, type) {
  return new Promise((resolve, reject) => {
    ws.on('error', reject);
    ws.on('message', function handler(raw) {
      const m = JSON.parse(raw.toString());
      if (!type || m.t === type) {
        ws.off('message', handler);
        resolve(m);
      }
    });
  });
}

function sseClient(port, sid) {
  const msgs = [];
  let cursor = 0;
  const listeners = [];
  const emit = (m) => {
    msgs.push(m);
    for (const l of [...listeners]) l();
  };
  const ready = (async () => {
    const res = await fetch(`http://127.0.0.1:${port}/sse?sid=${sid}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            for (const line of block.split('\n')) {
              if (line.startsWith('data:')) {
                emit(JSON.parse(line.slice(line[5] === ' ' ? 6 : 5)));
              }
            }
          }
        }
      } catch {}
    })();
    return reader;
  })();
  return {
    ready,
    waitFor(type) {
      return new Promise((resolve) => {
        const scan = () => {
          while (cursor < msgs.length) {
            const m = msgs[cursor++];
            if (!type || m.t === type) {
              resolve(m);
              return true;
            }
          }
          return false;
        };
        if (scan()) return;
        const l = () => {
          if (scan()) {
            const i = listeners.indexOf(l);
            if (i >= 0) listeners.splice(i, 1);
          }
        };
        listeners.push(l);
      });
    },
    async close() {
      const reader = await ready;
      try {
        await reader.cancel();
      } catch {}
    },
  };
}

function sseSend(port, sid, msg) {
  return fetch(`http://127.0.0.1:${port}/send?sid=${sid}`, {
    method: 'POST',
    body: JSON.stringify(msg),
  });
}

test('broadcast 는 보낸 사람을 제외한 전원에게 릴레이된다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const a = await connect(server.port);
  const b = await connect(server.port);

  let aGotBroadcast = false;
  a.on('message', (raw) => {
    if (JSON.parse(raw.toString()).t === 'broadcast') aGotBroadcast = true;
  });
  const bGot = nextMessage(b, 'broadcast');

  a.send(JSON.stringify({ t: 'broadcast', event: 'msg', payload: { text: 'hi' } }));

  const msg = await bGot;
  assert.equal(msg.event, 'msg');
  assert.deepEqual(msg.payload, { text: 'hi' });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(aGotBroadcast, false);

  a.close();
  b.close();
  await server.close();
});

test('track 한 presence meta 가 다른 클라이언트에 동기화된다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const a = await connect(server.port);
  const b = await connect(server.port);

  const bPresence = nextMessage(b, 'presence');
  a.send(JSON.stringify({ t: 'track', meta: { nick: 'A', joinedAt: 1 } }));

  const p = await bPresence;
  const metas = Object.values(p.state);
  assert.ok(metas.some((m) => m.nick === 'A'));

  a.close();
  b.close();
  await server.close();
});

test('연결이 끊기면 presence 에서 제거된다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const a = await connect(server.port);
  const b = await connect(server.port);

  a.send(JSON.stringify({ t: 'track', meta: { nick: 'A', joinedAt: 1 } }));
  await nextMessage(b, 'presence');

  const bAfterLeave = nextMessage(b, 'presence');
  a.close();
  const p = await bAfterLeave;
  const metas = Object.values(p.state);
  assert.equal(metas.some((m) => m.nick === 'A'), false);

  b.close();
  await server.close();
});

test('신규 접속자는 연결 즉시 presence 스냅샷을 받는다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const ws = new WebSocket(`ws://127.0.0.1:${server.port}/?sid=x`);
  const first = await new Promise((resolve, reject) => {
    ws.on('message', (raw) => resolve(JSON.parse(raw.toString())));
    ws.on('error', reject);
  });
  assert.equal(first.t, 'presence');
  assert.ok(first.state && typeof first.state === 'object');

  ws.close();
  await server.close();
});

test('SSE 접속자도 즉시 presence 스냅샷을 받는다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const s = sseClient(server.port, 'sse1');
  const first = await s.waitFor('presence');
  assert.equal(first.t, 'presence');
  assert.ok(first.state && typeof first.state === 'object');

  await s.close();
  await server.close();
});

test('SSE 가 POST track 하면 WS 피어의 presence 에 반영된다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const ws = await connect(server.port);
  const s = sseClient(server.port, 'sseD');
  await s.waitFor('presence');

  const wsPresence = nextMessage(ws, 'presence');
  await sseSend(server.port, 'sseD', { t: 'track', meta: { nick: 'SSEGUY', joinedAt: 2 } });
  const p = await wsPresence;
  assert.ok(Object.values(p.state).some((m) => m.nick === 'SSEGUY'));

  ws.close();
  await s.close();
  await server.close();
});

test('SSE 가 POST 로 보낸 broadcast 는 WS 피어에게 릴레이된다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const ws = await connect(server.port);
  const s = sseClient(server.port, 'sseB');
  await s.waitFor('presence');

  const wsGot = nextMessage(ws, 'broadcast');
  await sseSend(server.port, 'sseB', {
    t: 'broadcast',
    event: 'msg',
    payload: { text: 'hello' },
  });
  const m = await wsGot;
  assert.equal(m.event, 'msg');
  assert.deepEqual(m.payload, { text: 'hello' });

  ws.close();
  await s.close();
  await server.close();
});

test('WS 피어의 broadcast 는 SSE 클라에게 전달된다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const ws = await connect(server.port);
  const s = sseClient(server.port, 'sseC');
  await s.waitFor('presence');

  const sGot = s.waitFor('broadcast');
  ws.send(JSON.stringify({ t: 'broadcast', event: 'msg', payload: { text: 'yo' } }));
  const m = await sGot;
  assert.equal(m.event, 'msg');
  assert.deepEqual(m.payload, { text: 'yo' });

  ws.close();
  await s.close();
  await server.close();
});

test('batch 로 보낸 여러 메시지는 펼쳐서 처리된다', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const ws = await connect(server.port);
  const s = sseClient(server.port, 'sseBatch');
  await s.waitFor('presence');

  const wsBroadcast = nextMessage(ws, 'broadcast');
  await sseSend(server.port, 'sseBatch', {
    t: 'batch',
    items: [
      { t: 'track', meta: { nick: 'BAT', joinedAt: 9 } },
      { t: 'broadcast', event: 'motion', payload: { dx: 5 } },
    ],
  });
  const b = await wsBroadcast;
  assert.equal(b.event, 'motion');
  assert.deepEqual(b.payload, { dx: 5 });

  ws.close();
  await s.close();
  await server.close();
});

test('알 수 없는 sid 로 POST 하면 409', async () => {
  const server = await createRealtimeServer({ port: 0, allowedOrigin: '' });
  const res = await sseSend(server.port, 'ghost', { t: 'track', meta: {} });
  assert.equal(res.status, 409);
  await server.close();
});
