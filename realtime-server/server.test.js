import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createRealtimeServer } from './server.js';

function connect(port) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/?sid=${Math.random()}`);
    ws.on('open', () => resolve(ws));
  });
}

function nextMessage(ws, type) {
  return new Promise((resolve) => {
    ws.on('message', function handler(raw) {
      const m = JSON.parse(raw.toString());
      if (!type || m.t === type) {
        ws.off('message', handler);
        resolve(m);
      }
    });
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
