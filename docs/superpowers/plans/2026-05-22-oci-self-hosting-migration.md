# Supabase → OCI 자체 호스팅 이전 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase(Realtime + Postgres RPC) 의존을 들어내고, OCI Always Free VM 에서 자체 WebSocket 서버 + Postgres + Next.js Route Handler 로 동작하도록 이전한다.

**Architecture:** Next.js 앱(Node, standalone) + 작은 `ws` WebSocket 서버 + Postgres 3개 프로세스를 Coolify 로 배포. 채팅·presence 는 WS 서버가 in-memory 로 릴레이하고, 리더보드·카운터는 Next.js Route Handler 가 `pg` 로 Postgres 함수를 호출한다. 앞단은 Cloudflare 프록시.

**Tech Stack:** Next.js 16, React 19, TypeScript, `ws`, `pg`, Postgres, Docker, Coolify, Cloudflare.

**설계 문서:** `docs/superpowers/specs/2026-05-22-oci-self-hosting-migration-design.md`

---

## File Structure

생성:
- `realtime-server/package.json` — WS 서버 micro-package 매니페스트
- `realtime-server/server.js` — WS 릴레이 서버 (broadcast + presence)
- `realtime-server/server.test.js` — WS 서버 통합 테스트 (Node 내장 test runner)
- `realtime-server/Dockerfile` — WS 서버 이미지
- `realtime-server/.dockerignore`
- `db/meteor.sql` — 별똥별 리더보드 테이블 + 함수
- `db/jump.sql` — 점프 리더보드 테이블 + 함수
- `db/counter.sql` — 고구마 카운터 테이블 + 함수
- `src/lib/db.ts` — `pg` 커넥션 풀 싱글턴
- `src/app/api/leaderboard/meteor/route.ts` — 별똥별 리더보드 GET/POST
- `src/app/api/leaderboard/jump/route.ts` — 점프 리더보드 GET/POST
- `src/app/api/counter/route.ts` — 고구마 카운터 GET/POST
- `src/lib/realtime/client.ts` — 브라우저 WS 클라이언트
- `src/lib/api.ts` — Route Handler fetch 래퍼
- `Dockerfile` — Next.js standalone 이미지
- `.dockerignore`
- `.env.example` — 환경변수 템플릿(커밋됨)

수정:
- `src/components/BonfireScene/BonfireScene.tsx` — 실시간·카운터 로직 교체
- `src/components/MeteorGame/useMeteorGame.ts` — RPC → `api` 호출
- `src/components/JumpGame/useJumpGame.ts` — RPC → `api` 호출
- `next.config.ts` — `output: 'standalone'`
- `package.json` — `pg` 추가, Cloudflare 의존·스크립트 제거
- `vitest.config.ts` — `realtime-server/` 제외
- `.env.local` — Supabase 변수 → DB·WS 변수
- `.gitignore` — `.env.example` 예외

삭제:
- `src/lib/supabase/client.ts` (및 `src/lib/supabase/` 디렉터리)
- `supabase/meteor_leaderboard.sql`, `supabase/jump_leaderboard.sql` (→ `db/` 로 이동)
- `open-next.config.ts`, `wrangler.jsonc`, `.open-next/`

---

## Phase 1 — WebSocket 실시간 서버

### Task 1: realtime-server micro-package 스캐폴드

**Files:**
- Create: `realtime-server/package.json`
- Create: `realtime-server/.dockerignore`

- [ ] **Step 1: package.json 작성**

`realtime-server/package.json`:

```json
{
  "name": "burn-emotion-realtime",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "ws": "^8.18.0"
  }
}
```

- [ ] **Step 2: .dockerignore 작성**

`realtime-server/.dockerignore`:

```
node_modules
npm-debug.log
```

- [ ] **Step 3: 의존성 설치**

Run: `cd realtime-server && npm install && cd ..`
Expected: `realtime-server/node_modules/` 와 `realtime-server/package-lock.json` 생성.

- [ ] **Step 4: Commit**

```bash
git add realtime-server/package.json realtime-server/package-lock.json realtime-server/.dockerignore
git commit -m "chore(realtime): WS 서버 micro-package 스캐폴드"
```

---

### Task 2: WS 릴레이 서버 구현 (TDD)

WS 서버는 단일 룸. 클라이언트가 `track`(presence 등록)·`broadcast`(릴레이) 메시지를 보내고,
서버는 presence 변경 시 전체 스냅샷을, broadcast 는 보낸 사람 제외 전원에게 전달한다.

**Files:**
- Create: `realtime-server/server.test.js`
- Create: `realtime-server/server.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`realtime-server/server.test.js`:

```js
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd realtime-server && npm test`
Expected: FAIL — `Cannot find module './server.js'`

- [ ] **Step 3: 서버 구현**

`realtime-server/server.js`:

```js
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
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd realtime-server && npm test`
Expected: PASS — 3개 테스트 모두 통과

- [ ] **Step 5: Commit**

```bash
git add realtime-server/server.js realtime-server/server.test.js
git commit -m "feat(realtime): WS 릴레이 서버 — broadcast + presence"
```

---

### Task 3: WS 서버 Dockerfile

**Files:**
- Create: `realtime-server/Dockerfile`

- [ ] **Step 1: Dockerfile 작성**

`realtime-server/Dockerfile`:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
```

- [ ] **Step 2: 로컬 이미지 빌드 검증**

Run: `cd realtime-server && docker build -t burn-emotion-ws . && cd ..`
Expected: 빌드 성공.

- [ ] **Step 3: 컨테이너 기동 검증**

Run: `docker run --rm -d -p 8080:8080 --name ws-test burn-emotion-ws && sleep 2 && curl -s localhost:8080/health && docker stop ws-test`
Expected: `ok` 출력 후 컨테이너 종료.

- [ ] **Step 4: Commit**

```bash
git add realtime-server/Dockerfile
git commit -m "build(realtime): WS 서버 Dockerfile"
```

---

## Phase 2 — 데이터베이스

### Task 4: SQL 스키마를 `db/` 로 정리

기존 `supabase/*.sql` 의 함수는 cap-and-prune 원자성을 유지한 채 그대로 두고, Supabase 전용
구문(RLS, policy, anon/authenticated grant)만 제거한다. 카운터 스키마는 신규 작성.

**Files:**
- Create: `db/meteor.sql`
- Create: `db/jump.sql`
- Create: `db/counter.sql`
- Delete: `supabase/meteor_leaderboard.sql`, `supabase/jump_leaderboard.sql`

- [ ] **Step 1: `db/meteor.sql` 작성**

```sql
-- 별똥별 피하기 — 글로벌 TOP 10 리더보드. psql 로 통째 실행 (재실행 안전).
drop function if exists public.submit_meteor_record(text, numeric);
drop function if exists public.get_meteor_top10();

create table if not exists public.meteor_leaderboard (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  seconds numeric not null,
  created_at timestamptz not null default now()
);

-- 새 기록 제출 + TOP10 외 즉시 삭제 + TOP10 반환 (cap-and-prune)
create function public.submit_meteor_record(
  p_nick text,
  p_seconds numeric
)
returns table(nick text, seconds numeric)
language plpgsql
as $$
begin
  if p_nick is null or length(trim(p_nick)) = 0 or length(p_nick) > 64 then
    raise exception 'invalid nick';
  end if;
  if p_seconds is null or p_seconds < 0 or p_seconds > 86400 then
    raise exception 'invalid seconds';
  end if;

  insert into public.meteor_leaderboard (nick, seconds)
  values (trim(p_nick), p_seconds);

  delete from public.meteor_leaderboard
  where id not in (
    select sub.id from public.meteor_leaderboard sub
    order by sub.seconds desc, sub.created_at asc
    limit 10
  );

  return query
  select m.nick, m.seconds
  from public.meteor_leaderboard m
  order by m.seconds desc, m.created_at asc
  limit 10;
end;
$$;

create function public.get_meteor_top10()
returns table(nick text, seconds numeric)
language sql
stable
as $$
  select nick, seconds
  from public.meteor_leaderboard
  order by seconds desc, created_at asc
  limit 10
$$;
```

- [ ] **Step 2: `db/jump.sql` 작성**

```sql
-- 우주를 줄게(점프맵) — 글로벌 TOP 10 리더보드. psql 로 통째 실행 (재실행 안전).
drop function if exists public.submit_jump_record(text, numeric);
drop function if exists public.get_jump_top10();

create table if not exists public.jump_leaderboard (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  height numeric not null,
  created_at timestamptz not null default now()
);

create function public.submit_jump_record(
  p_nick text,
  p_height numeric
)
returns table(nick text, height numeric)
language plpgsql
as $$
begin
  if p_nick is null or length(trim(p_nick)) = 0 or length(p_nick) > 64 then
    raise exception 'invalid nick';
  end if;
  if p_height is null or p_height < 0 or p_height > 1000000 then
    raise exception 'invalid height';
  end if;

  insert into public.jump_leaderboard (nick, height)
  values (trim(p_nick), p_height);

  delete from public.jump_leaderboard
  where id not in (
    select sub.id from public.jump_leaderboard sub
    order by sub.height desc, sub.created_at asc
    limit 10
  );

  return query
  select m.nick, m.height
  from public.jump_leaderboard m
  order by m.height desc, m.created_at asc
  limit 10;
end;
$$;

create function public.get_jump_top10()
returns table(nick text, height numeric)
language sql
stable
as $$
  select nick, height
  from public.jump_leaderboard
  order by height desc, created_at asc
  limit 10
$$;
```

- [ ] **Step 3: `db/counter.sql` 작성**

```sql
-- 오늘 구워진 고구마 카운터. psql 로 통째 실행 (재실행 안전).
drop function if exists public.inc_burned();
drop function if exists public.start_today();

create table if not exists public.daily_counter (
  day date primary key default current_date,
  burned int not null default 0
);

-- 오늘 행을 보장하고 현재 카운트를 반환
create function public.start_today()
returns int
language plpgsql
as $$
declare
  n int;
begin
  insert into public.daily_counter (day, burned)
  values (current_date, 0)
  on conflict (day) do nothing;
  select burned into n from public.daily_counter where day = current_date;
  return coalesce(n, 0);
end;
$$;

-- 오늘 카운트를 1 증가시키고 새 값 반환
create function public.inc_burned()
returns int
language plpgsql
as $$
declare
  n int;
begin
  insert into public.daily_counter (day, burned)
  values (current_date, 1)
  on conflict (day) do update set burned = public.daily_counter.burned + 1
  returning burned into n;
  return n;
end;
$$;
```

- [ ] **Step 4: 옛 supabase SQL 제거**

```bash
git rm supabase/meteor_leaderboard.sql supabase/jump_leaderboard.sql
```

Expected: `supabase/` 디렉터리가 비면 자동 삭제됨.

- [ ] **Step 5: 로컬 Postgres 로 검증**

로컬 Postgres 컨테이너 기동 후 SQL 적용:

```bash
docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=burn_emotion --name be-pg postgres:16
sleep 4
for f in db/meteor.sql db/jump.sql db/counter.sql; do
  docker exec -i be-pg psql -U postgres -d burn_emotion < "$f"
done
docker exec -i be-pg psql -U postgres -d burn_emotion -c "select * from submit_meteor_record('테스터', 12.5);"
docker exec -i be-pg psql -U postgres -d burn_emotion -c "select start_today(); select inc_burned();"
```

Expected: 함수 호출이 에러 없이 결과 행을 반환. 컨테이너 `be-pg` 는 다음 Task 검증에 계속 쓰므로 종료하지 말 것.

- [ ] **Step 6: Commit**

```bash
git add db/ supabase/
git commit -m "feat(db): 리더보드·카운터 SQL 스키마를 db/ 로 정리"
```

---

## Phase 3 — Next.js API 계층

### Task 5: `pg` 커넥션 풀

**Files:**
- Create: `src/lib/db.ts`
- Modify: `package.json` (dependencies)

- [ ] **Step 1: `pg` 의존성 설치**

Run: `npm install pg && npm install -D @types/pg`
Expected: `package.json` dependencies 에 `pg`, devDependencies 에 `@types/pg` 추가.

- [ ] **Step 2: `src/lib/db.ts` 작성**

```ts
import { Pool } from 'pg';

// dev HMR 시 풀이 중복 생성되지 않도록 globalThis 에 캐시.
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export const pool: Pool =
  globalThis.__pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts package.json package-lock.json
git commit -m "feat(db): pg 커넥션 풀 싱글턴"
```

---

### Task 6: 리더보드·카운터 Route Handler

Next 16 Route Handler API 를 먼저 확인할 것 — `node_modules/next/dist/docs/` 에서 route
handler 관련 문서를 읽어 `GET`/`POST` export, `NextResponse`, `dynamic`/`runtime` 세그먼트
옵션이 현재 버전과 일치하는지 검증한 뒤 구현한다.

Postgres `numeric` 은 `pg` 가 문자열로 반환하므로, 쿼리에서 `::float8` 캐스팅해 JS number 로
받는다.

**Files:**
- Create: `src/app/api/leaderboard/meteor/route.ts`
- Create: `src/app/api/leaderboard/jump/route.ts`
- Create: `src/app/api/counter/route.ts`

- [ ] **Step 1: 별똥별 리더보드 Route Handler**

`src/app/api/leaderboard/meteor/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query(
    'select nick, seconds::float8 as seconds from get_meteor_top10()',
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nick = typeof body?.nick === 'string' ? body.nick : '';
  const seconds = Number(body?.seconds);
  if (!nick || !Number.isFinite(seconds)) {
    return NextResponse.json({ error: 'bad input' }, { status: 400 });
  }
  try {
    const { rows } = await pool.query(
      'select nick, seconds::float8 as seconds from submit_meteor_record($1, $2)',
      [nick, seconds],
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'rejected' }, { status: 400 });
  }
}
```

- [ ] **Step 2: 점프 리더보드 Route Handler**

`src/app/api/leaderboard/jump/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query(
    'select nick, height::float8 as height from get_jump_top10()',
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nick = typeof body?.nick === 'string' ? body.nick : '';
  const height = Number(body?.height);
  if (!nick || !Number.isFinite(height)) {
    return NextResponse.json({ error: 'bad input' }, { status: 400 });
  }
  try {
    const { rows } = await pool.query(
      'select nick, height::float8 as height from submit_jump_record($1, $2)',
      [nick, height],
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'rejected' }, { status: 400 });
  }
}
```

- [ ] **Step 3: 카운터 Route Handler**

`src/app/api/counter/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query('select start_today() as n');
  return NextResponse.json({ n: rows[0].n as number });
}

export async function POST() {
  const { rows } = await pool.query('select inc_burned() as n');
  return NextResponse.json({ n: rows[0].n as number });
}
```

- [ ] **Step 4: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 5: 로컬 동작 검증**

Task 4 의 `be-pg` 컨테이너가 떠 있어야 함. `.env.local` 에 임시로
`DATABASE_URL=postgres://postgres:postgres@localhost:5432/burn_emotion` 를 둔 상태로:

```bash
npm run dev
```

다른 터미널에서:

```bash
curl -s localhost:3000/api/leaderboard/meteor
curl -s -X POST localhost:3000/api/leaderboard/meteor -H 'content-type: application/json' -d '{"nick":"테스터2","seconds":30.2}'
curl -s localhost:3000/api/counter
curl -s -X POST localhost:3000/api/counter
```

Expected: 각각 JSON 배열/`{"n":숫자}` 응답. `seconds` 가 문자열이 아니라 숫자로 옴.
검증 후 `npm run dev` 종료.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/
git commit -m "feat(api): 리더보드·카운터 Route Handler"
```

---

## Phase 4 — 클라이언트 통합

### Task 7: 브라우저 WS 클라이언트

**Files:**
- Create: `src/lib/realtime/client.ts`

- [ ] **Step 1: `src/lib/realtime/client.ts` 작성**

```ts
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
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/lib/realtime/client.ts
git commit -m "feat(realtime): 브라우저 WS 클라이언트"
```

---

### Task 8: Route Handler fetch 래퍼

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: `src/lib/api.ts` 작성**

```ts
import type { LeaderEntry } from '@/components/MeteorGame/useMeteorGame';
import type { LeaderEntry as JumpLeaderEntry } from '@/components/JumpGame/useJumpGame';

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  meteorTop10: () => jget<LeaderEntry[]>('/api/leaderboard/meteor'),
  submitMeteor: (nick: string, seconds: number) =>
    jpost<LeaderEntry[]>('/api/leaderboard/meteor', { nick, seconds }),
  jumpTop10: () => jget<JumpLeaderEntry[]>('/api/leaderboard/jump'),
  submitJump: (nick: string, height: number) =>
    jpost<JumpLeaderEntry[]>('/api/leaderboard/jump', { nick, height }),
  counterToday: () => jget<{ n: number }>('/api/counter').then((d) => d.n),
  incBurned: () => jpost<{ n: number }>('/api/counter', {}).then((d) => d.n),
};
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (`LeaderEntry` 는 두 훅 모두 `export interface` 로 노출 중)

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(api): Route Handler fetch 래퍼"
```

---

### Task 9: BonfireScene 실시간·카운터 로직 교체

`src/components/BonfireScene/BonfireScene.tsx` 의 Supabase 채널·RPC 사용부를 새 WS 클라이언트와
`api` 로 교체한다. 5개 편집.

**Files:**
- Modify: `src/components/BonfireScene/BonfireScene.tsx`

- [ ] **Step 1: import 교체**

찾기:

```tsx
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
```

바꾸기:

```tsx
import {
  connectRealtime,
  isRealtimeConfigured,
  type RealtimeClient,
} from '@/lib/realtime/client';
import { api } from '@/lib/api';
```

- [ ] **Step 2: channelRef → realtimeRef**

찾기:

```tsx
  // 실시간 채널 (broadcast + presence)
  const channelRef = useRef<RealtimeChannel | null>(null);
```

바꾸기:

```tsx
  // 실시간 클라이언트 (broadcast + presence)
  const realtimeRef = useRef<RealtimeClient | null>(null);
```

- [ ] **Step 3: 실시간 useEffect 전체 교체**

찾기 — `// === Supabase Realtime:` 주석부터 시작하는 `useEffect` 전체 (의존성
배열 `}, [myNick, pushMessageFromCrowd]);` 까지). 다음으로 바꾸기:

```tsx
  // === 실시간: broadcast (메시지) + presence (접속자/실루엣) ===
  // presence 가 silhouettes 의 source of truth.
  useEffect(() => {
    if (!isRealtimeConfigured() || !mySpotRef.current) return;

    type PresenceMeta = {
      nick: string;
      x: number;
      y: number;
      scale: number;
      flip: boolean;
      variant: number;
      joinedAt: number;
    };

    const applyPeers = (state: Record<string, unknown>) => {
      const peerList: PresenceMeta[] = [];
      for (const key in state) {
        const meta = state[key] as PresenceMeta | undefined;
        if (!meta?.nick) continue;
        peerList.push(meta);
      }
      peerList.sort((a, b) => a.joinedAt - b.joinedAt);
      const newSilhouettes: SilhouetteEntity[] = peerList.map((p) => ({
        id: 'peer-' + p.nick,
        nick: p.nick,
        x: p.x,
        y: p.y,
        scale: p.scale,
        variant: p.variant,
        flip: p.flip,
      }));
      setSilhouettes(newSilhouettes);
      setOnlineCount(newSilhouettes.length || 1);
      const myIdx = newSilhouettes.findIndex((s) => s.nick === myNick);
      setMySilhouetteIdx(myIdx >= 0 ? myIdx : null);
    };

    const client = connectRealtime(sessionIdRef.current ?? myNick, {
      onBroadcast: (event, payload) => {
        if (event === 'msg') {
          const data = payload as { nick: string; text: string };
          if (!data?.nick || !data?.text) return;
          if (data.nick === myNick) return;
          const sList = silhouettesRef.current;
          const sIdx = sList.findIndex((s) => s.nick === data.nick);
          pushMessageFromCrowd({ text: data.text, nick: data.nick, sIdx });
        } else if (event === 'counter') {
          const data = payload as { count: number | string };
          const n =
            typeof data?.count === 'number'
              ? data.count
              : parseInt(String(data?.count ?? ''), 10);
          if (!isNaN(n)) setTotalBurned((prev) => Math.max(prev, n));
        }
      },
      onPresence: applyPeers,
    });
    if (!client) return;
    realtimeRef.current = client;
    client.track({
      nick: myNick,
      x: mySpotRef.current.x,
      y: mySpotRef.current.y,
      scale: mySpotRef.current.scale,
      flip: mySpotRef.current.flip,
      variant: mySpotRef.current.variant,
      joinedAt: mySpotRef.current.joinedAt,
    });

    const onLeave = () => client.close();
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
      realtimeRef.current = null;
      client.close();
    };
  }, [myNick, pushMessageFromCrowd]);
```

- [ ] **Step 4: 카운터 fetch · 증가 교체**

찾기 — 카운터 fetch useEffect:

```tsx
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    void supabase.rpc('start_today').then(({ data, error }) => {
      if (cancelled || error) return;
      const n =
        typeof data === 'number' ? data : parseInt(String(data ?? ''), 10);
      if (!isNaN(n)) setTotalBurned(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);
```

바꾸기:

```tsx
  useEffect(() => {
    if (!isRealtimeConfigured()) return;
    let cancelled = false;
    void api
      .counterToday()
      .then((n) => {
        if (!cancelled && !isNaN(n)) setTotalBurned(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
```

이어서 찾기 — 카운터 증가부 (`const supabase = getSupabase();` 부터 `for` 루프 끝까지):

```tsx
    const supabase = getSupabase();
    if (!supabase) return;
    for (const _ of disappearedMine) {
      void supabase.rpc('inc_burned').then(({ data, error }) => {
        if (error) return;
        const n =
          typeof data === 'number' ? data : parseInt(String(data ?? ''), 10);
        if (isNaN(n)) return;
        setTotalBurned((prev) => Math.max(prev, n));
        if (channelRef.current) {
          void channelRef.current.send({
            type: 'broadcast',
            event: 'counter',
            payload: { count: n },
          });
        }
      });
    }
```

바꾸기:

```tsx
    if (!isRealtimeConfigured()) return;
    for (const _ of disappearedMine) {
      void api
        .incBurned()
        .then((n) => {
          if (isNaN(n)) return;
          setTotalBurned((prev) => Math.max(prev, n));
          realtimeRef.current?.send('counter', { count: n });
        })
        .catch(() => {});
    }
```

- [ ] **Step 5: 메시지 broadcast 교체**

찾기:

```tsx
      // 다른 접속자들에게 broadcast (Supabase 채널 연결되어 있을 때만)
      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'msg',
          payload: { nick: myNick, text },
        });
      }
```

바꾸기:

```tsx
      // 다른 접속자들에게 broadcast (WS 연결되어 있을 때만)
      realtimeRef.current?.send('msg', { nick: myNick, text });
```

- [ ] **Step 6: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npx eslint src/components/BonfireScene/BonfireScene.tsx`
Expected: 타입 에러 없음. lint 는 기존 경고 외 신규 항목 없음.

- [ ] **Step 7: Commit**

```bash
git add src/components/BonfireScene/BonfireScene.tsx
git commit -m "feat(scene): BonfireScene 실시간·카운터를 WS+API 로 교체"
```

---

### Task 10: 게임 훅의 RPC 호출 교체

`useMeteorGame.ts` 와 `useJumpGame.ts` 의 `supabase.rpc(...)` 를 `api` 호출로 교체한다.

**Files:**
- Modify: `src/components/MeteorGame/useMeteorGame.ts`
- Modify: `src/components/JumpGame/useJumpGame.ts`

- [ ] **Step 1: useMeteorGame import 교체**

찾기:

```ts
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
```

바꾸기:

```ts
import { api } from '@/lib/api';
```

- [ ] **Step 2: useMeteorGame openLeaderboard 교체**

찾기:

```ts
  const openLeaderboard = useCallback(() => {
    if (gameState !== 'idle') return;
    setLastScoreSec(null);
    setLeaderboardOpen(true);
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.rpc('get_meteor_top10').then(({ data, error }) => {
      if (error || !Array.isArray(data)) return;
      setLeaderboard(data as LeaderEntry[]);
    });
  }, [gameState]);
```

바꾸기:

```ts
  const openLeaderboard = useCallback(() => {
    if (gameState !== 'idle') return;
    setLastScoreSec(null);
    setLeaderboardOpen(true);
    void api
      .meteorTop10()
      .then(setLeaderboard)
      .catch(() => {});
  }, [gameState]);
```

- [ ] **Step 3: useMeteorGame 마운트 fetch 교체**

찾기:

```ts
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    void supabase.rpc('get_meteor_top10').then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data)) return;
      setLeaderboard(data as LeaderEntry[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);
```

바꾸기:

```ts
  useEffect(() => {
    let cancelled = false;
    void api
      .meteorTop10()
      .then((d) => {
        if (!cancelled) setLeaderboard(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
```

- [ ] **Step 4: useMeteorGame gameover submit 교체**

찾기 — `gameover` 처리 useEffect 내부:

```ts
    const sec = lastScoreSec ?? 0;
    const supabase = getSupabase();
    if (supabase) {
      void supabase
        .rpc('submit_meteor_record', { p_nick: myNick, p_seconds: Number(sec.toFixed(2)) })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !Array.isArray(data)) {
            void supabase.rpc('get_meteor_top10').then(({ data: d2 }) => {
              if (cancelled || !Array.isArray(d2)) return;
              setLeaderboard(d2 as LeaderEntry[]);
            });
            return;
          }
          setLeaderboard(data as LeaderEntry[]);
        });
    }
```

바꾸기:

```ts
    const sec = lastScoreSec ?? 0;
    void api
      .submitMeteor(myNick, Number(sec.toFixed(2)))
      .then((d) => {
        if (!cancelled) setLeaderboard(d);
      })
      .catch(() => {
        void api
          .meteorTop10()
          .then((d2) => {
            if (!cancelled) setLeaderboard(d2);
          })
          .catch(() => {});
      });
```

- [ ] **Step 5: useJumpGame import 교체**

찾기:

```ts
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
```

바꾸기:

```ts
import { api } from '@/lib/api';
```

- [ ] **Step 6: useJumpGame openLeaderboard 교체**

찾기:

```ts
  const openLeaderboard = useCallback(() => {
    if (gameState !== 'idle') return;
    setLastScoreHeight(null);
    setLeaderboardOpen(true);
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.rpc('get_jump_top10').then(({ data, error }) => {
      if (error || !Array.isArray(data)) return;
      setLeaderboard(data as LeaderEntry[]);
    });
  }, [gameState]);
```

바꾸기:

```ts
  const openLeaderboard = useCallback(() => {
    if (gameState !== 'idle') return;
    setLastScoreHeight(null);
    setLeaderboardOpen(true);
    void api
      .jumpTop10()
      .then(setLeaderboard)
      .catch(() => {});
  }, [gameState]);
```

- [ ] **Step 7: useJumpGame 마운트 fetch 교체**

찾기:

```ts
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    void supabase.rpc('get_jump_top10').then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data)) return;
      setLeaderboard(data as LeaderEntry[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);
```

바꾸기:

```ts
  useEffect(() => {
    let cancelled = false;
    void api
      .jumpTop10()
      .then((d) => {
        if (!cancelled) setLeaderboard(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
```

- [ ] **Step 8: useJumpGame gameover submit 교체**

찾기 — `gameover` 처리 useEffect 내부:

```ts
    const h = lastScoreHeight ?? 0;
    const supabase = getSupabase();
    if (supabase) {
      void supabase
        .rpc('submit_jump_record', { p_nick: myNick, p_height: Number(h.toFixed(2)) })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !Array.isArray(data)) {
            void supabase.rpc('get_jump_top10').then(({ data: d2 }) => {
              if (cancelled || !Array.isArray(d2)) return;
              setLeaderboard(d2 as LeaderEntry[]);
            });
            return;
          }
          setLeaderboard(data as LeaderEntry[]);
        });
    }
```

바꾸기:

```ts
    const h = lastScoreHeight ?? 0;
    void api
      .submitJump(myNick, Number(h.toFixed(2)))
      .then((d) => {
        if (!cancelled) setLeaderboard(d);
      })
      .catch(() => {
        void api
          .jumpTop10()
          .then((d2) => {
            if (!cancelled) setLeaderboard(d2);
          })
          .catch(() => {});
      });
```

- [ ] **Step 9: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 10: Commit**

```bash
git add src/components/MeteorGame/useMeteorGame.ts src/components/JumpGame/useJumpGame.ts
git commit -m "feat(game): 리더보드 RPC 를 api 호출로 교체"
```

---

### Task 11: Supabase 잔재 제거

**Files:**
- Delete: `src/lib/supabase/client.ts` (디렉터리째)
- Modify: `package.json` (`@supabase/supabase-js` 제거)
- Modify: `vitest.config.ts` (`realtime-server/` 제외)

- [ ] **Step 1: supabase 클라이언트 삭제**

```bash
git rm -r src/lib/supabase
```

- [ ] **Step 2: 잔존 참조 확인**

Run: `grep -rn "supabase\|@supabase" src/`
Expected: 출력 없음. 출력이 있으면 해당 파일을 마저 정리.

- [ ] **Step 3: 의존성 제거**

Run: `npm uninstall @supabase/supabase-js`
Expected: `package.json` dependencies 에서 `@supabase/supabase-js` 제거.

- [ ] **Step 4: vitest 가 realtime-server 를 건드리지 않게 제외**

`vitest.config.ts` 전체를 다음으로 교체:

```ts
import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    exclude: [...configDefaults.exclude, 'realtime-server/**'],
  },
});
```

- [ ] **Step 5: 타입 체크 + 전체 테스트**

Run: `npx tsc --noEmit && npm test`
Expected: 타입 에러 없음. 기존 vitest 테스트(`src/tests/*`) 통과. `realtime-server/` 는 제외됨.

- [ ] **Step 6: 로컬 엔드투엔드 검증**

배포 전, 3개 프로세스를 로컬에서 띄워 실제 채팅·게임을 확인한다.

먼저 `.env.local` 에 두 변수가 있는지 확인 (없으면 추가):

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/burn_emotion
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

Task 4 의 `be-pg` Postgres 컨테이너가 떠 있어야 한다. 두 터미널에서:

- 터미널 1: `node realtime-server/server.js`
- 터미널 2: `npm run dev`

브라우저 탭 2개로 `http://localhost:3000` 접속해 확인:
- 양쪽에 서로의 실루엣이 보이는지 (presence)
- 한쪽에서 메시지를 던지면 다른 쪽에 반영되는지 (broadcast)
- `/별똥별` 게임을 플레이하고 게임오버 후 리더보드에 점수가 반영되는지
- 새로고침 후 리더보드·카운터가 유지되는지

Expected: 위 4가지 모두 동작. 문제가 있으면 해당 Task 로 돌아가 수정 후 재검증.

- [ ] **Step 7: Commit**

```bash
git add src/lib package.json package-lock.json vitest.config.ts
git commit -m "chore: Supabase 클라이언트·의존성 제거"
```

---

## Phase 5 — 빌드 · 배포 설정

### Task 12: Next.js standalone 빌드 + Dockerfile

`output: 'standalone'` 와 standalone 산출물 구조를 먼저 `node_modules/next/dist/docs/` 에서
확인한 뒤 진행한다 (산출물 경로 `.next/standalone`, `.next/static`, `public` 복사 규칙).

**Files:**
- Modify: `next.config.ts`
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: next.config.ts 수정**

`next.config.ts` 전체를 다음으로 교체:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 2: .dockerignore 작성**

`.dockerignore`:

```
node_modules
.next
.open-next
.git
realtime-server
docs
*.md
.env*
```

- [ ] **Step 3: Dockerfile 작성**

`Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: 로컬 standalone 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공, `.next/standalone/server.js` 생성.

- [ ] **Step 5: 로컬 Docker 빌드 검증**

Run: `docker build --build-arg NEXT_PUBLIC_WS_URL=ws://localhost:8080 -t burn-emotion-web .`
Expected: 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts Dockerfile .dockerignore
git commit -m "build: Next.js standalone 빌드 + Dockerfile"
```

---

### Task 13: Cloudflare Workers 잔재 제거

**Files:**
- Delete: `open-next.config.ts`, `wrangler.jsonc`, `.open-next/`
- Modify: `package.json` (스크립트·의존성)

- [ ] **Step 1: Cloudflare 설정 파일 삭제**

```bash
git rm open-next.config.ts wrangler.jsonc
rm -rf .open-next
```

(`​.open-next/` 는 이미 gitignore 되어 있어 `git rm` 불필요 — 로컬에서만 삭제.)

- [ ] **Step 2: 의존성 제거**

Run: `npm uninstall @opennextjs/cloudflare wrangler`
Expected: `package.json` devDependencies 에서 두 패키지 제거.

- [ ] **Step 3: package.json scripts 정리**

`package.json` 의 `scripts` 블록을 다음으로 교체:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

(`preview`, `deploy`, `cf-typegen` 제거.)

- [ ] **Step 4: 잔존 참조 확인 + 빌드**

Run: `grep -rn "opennext\|wrangler\|cloudflare" --include="*.ts" --include="*.tsx" --include="*.json" . --exclude-dir=node_modules --exclude-dir=docs && echo "---" && npm run build`
Expected: `grep` 출력 없음 (`---` 만 보임), 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json open-next.config.ts wrangler.jsonc
git commit -m "chore: Cloudflare Workers 배포 잔재 제거"
```

---

### Task 14: 환경 변수 파일 정리

**Files:**
- Modify: `.env.local`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: .env.local 교체 (로컬 개발용, 커밋 안 됨)**

`.env.local` 전체를 다음으로 교체:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/burn_emotion
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

- [ ] **Step 2: .env.example 작성 (커밋됨)**

`.env.example`:

```
# Next.js 앱
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/burn_emotion
NEXT_PUBLIC_WS_URL=wss://ws.burn-emotion.net

# WS 서버 (realtime-server)
PORT=8080
ALLOWED_ORIGIN=https://burn-emotion.net
```

- [ ] **Step 3: .gitignore 에 .env.example 예외 추가**

`.gitignore` 에서 찾기:

```
# env files (can opt-in for committing if needed)
.env*
```

바꾸기:

```
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: 환경변수 템플릿 .env.example 추가"
```

---

## Phase 6 — 배포 · 검증 (수동 작업)

이 Phase 는 코드가 아니라 Coolify·Cloudflare 콘솔 작업이다. 각 Step 은 사람이 직접 수행한다.

### Task 15: Coolify — Postgres 리소스 + 스키마 적용

- [ ] **Step 1: Postgres 리소스 생성**

Coolify 대시보드 → 프로젝트 선택 → **+ New Resource** → **Database** → **PostgreSQL 16**.
이름 `burn-emotion-db`. 생성 후 **Connection String (Internal)** 을 복사해 둔다.

- [ ] **Step 2: 스키마 적용**

Coolify 의 해당 DB → **Terminal**(또는 로컬에서 Internal URL 로 `psql` 접속) 에서
`db/meteor.sql`, `db/jump.sql`, `db/counter.sql` 내용을 순서대로 실행한다.

- [ ] **Step 3: 검증**

`psql` 에서:

```sql
select start_today();
select * from get_meteor_top10();
select * from get_jump_top10();
```

Expected: 에러 없이 실행 (빈 결과 또는 0).

---

### Task 16: Coolify — web 앱 + ws 앱 배포

- [ ] **Step 1: GitHub 리포지터리 연결**

Coolify → **+ New Resource** → **Application** → GitHub 소스로 `devmalo050/burn-emotion`
리포 선택, 브랜치 `main`.

- [ ] **Step 2: web 앱 설정**

- Build Pack: **Dockerfile**, Dockerfile 경로 `Dockerfile` (리포 루트)
- 도메인: `burn-emotion.net`
- 런타임 환경변수: `DATABASE_URL` = Task 15 의 Internal Connection String
- 빌드 환경변수(Build-time): `NEXT_PUBLIC_WS_URL` = `wss://ws.burn-emotion.net`
  (⚠ `NEXT_PUBLIC_*` 는 빌드 타임에 번들에 박히므로 반드시 Build-time 변수로 등록)
- 포트: `3000`
- 배포(Deploy) 실행.

- [ ] **Step 3: ws 앱 설정**

Coolify → **+ New Resource** → **Application** → 같은 리포 `devmalo050/burn-emotion`.

- Build Pack: **Dockerfile**
- Base Directory: `realtime-server`
- Dockerfile 경로: `realtime-server/Dockerfile`
- 도메인: `ws.burn-emotion.net`
- 환경변수: `PORT` = `8080`, `ALLOWED_ORIGIN` = `https://burn-emotion.net`
- 포트: `8080`
- 헬스체크 경로: `/health`
- 배포 실행.

- [ ] **Step 4: 자동 배포 활성화**

web 앱·ws 앱 각각에서 **Auto Deploy on push to `main`** (Coolify GitHub 웹훅) 활성화.

---

### Task 17: Cloudflare DNS 전환 + 엔드투엔드 검증

- [ ] **Step 1: 기존 Workers 라우팅 해제**

Cloudflare 대시보드 → `burn-emotion.net` → Workers Routes(또는 Workers & Pages 의
Custom Domain) 에서 기존 `burn-emotion.net` ↔ Worker 바인딩을 제거.

- [ ] **Step 2: A 레코드 등록**

Cloudflare → DNS → 레코드 추가:
- `burn-emotion.net` → A → OCI 공인 IP, **Proxied (주황 구름)**
- `ws` → A → OCI 공인 IP, **Proxied (주황 구름)**

SSL/TLS 모드는 **Full (strict)** 확인 (Origin Certificate 는 Coolify 에 설정 완료).

- [ ] **Step 3: 단독 동작 검증**

브라우저에서 `https://burn-emotion.net` 접속:
- 페이지 정상 렌더, 콘솔 에러 없음
- DevTools → Network → WS 탭에 `wss://ws.burn-emotion.net` 연결이 `101` 상태로 유지

- [ ] **Step 4: 멀티유저 실시간 검증**

브라우저 2개(또는 시크릿 창)로 동시 접속:
- 양쪽에 서로의 실루엣이 표시되는지 (presence)
- 한쪽에서 메시지를 던지면 다른 쪽 모닥불 위로 떠오르는지 (broadcast `msg`)
- 접속자 수 카운트가 2 로 표시되는지
- 한 창을 닫으면 다른 창에서 실루엣이 사라지는지

- [ ] **Step 5: 게임·카운터·리더보드 검증**

- 채팅창에 `/별똥별` 입력 → 별똥별 게임 진입, 게임오버 후 리더보드 모달에 점수 반영
- 메시지를 던져 고구마를 구운 뒤, 새로고침해도 "오늘 구워진 고구마" 카운트가 유지되는지
- 페이지 새로고침 후 리더보드 TOP10 이 그대로 조회되는지 (Postgres 영속 확인)

- [ ] **Step 6: 로컬 Postgres 테스트 컨테이너 정리**

```bash
docker stop be-pg 2>/dev/null || true
```

- [ ] **Step 7: 문서 업데이트 + Commit**

`docs/superpowers/specs/2026-05-22-oci-self-hosting-migration-design.md` 하단에
"구현 완료 (2026-05-22)" 한 줄 추가, `AGENTS.md`/`README` 에 Cloudflare 언급이 있으면 정정.

```bash
git add -A
git commit -m "docs: OCI 이전 완료 반영"
```

---

## 완료 기준

- `burn-emotion.net` 이 OCI VM 에서 서빙되고 Cloudflare Workers 의존이 없다.
- 2명 이상 동시 접속 시 실루엣·메시지·접속자 수가 실시간 동기화된다.
- 별똥별·우주를 줄게 게임의 리더보드가 Postgres 에 영속되고 새로고침 후에도 조회된다.
- 고구마 카운터가 증가·broadcast·영속된다.
- `grep -rn "supabase" src/` 결과가 없다.
- `npm run build` 와 `cd realtime-server && npm test` 가 모두 통과한다.
