# Supabase → OCI 자체 호스팅 이전 설계

작성일: 2026-05-22

## 배경 / 동기

burn-emotion 은 현재 Supabase(Realtime + Postgres + PostgREST RPC) 기반이며 Cloudflare
Workers(`@opennextjs/cloudflare`)로 배포된다. Supabase 무료 티어의 7일 휴면·용량 제한에서
벗어나기 위해, OCI Always Free VM(2코어·12GB, Coolify 설치 완료)으로 전부 이전한다.

## 확정된 결정

브레인스토밍에서 합의된 사항:

1. **이전 범위** — Next.js 앱 + DB + 실시간 전부 OCI VM 1대로. Cloudflare Workers 폐기.
2. **백엔드 방식** — Supabase 셀프호스팅이 아니라 가벼운 자체 백엔드로 교체. 이 앱은
   채팅이 비영속(broadcast-only)·presence 도 휘발성이고 DB 가 테이블 3개뿐이라 Supabase
   10개 컨테이너 스택은 오버킬. 확장 방향도 "미니게임 컬렉션 추가"라 Auth/Storage 불필요.
3. **DNS** — 도메인 `burn-emotion.net`(Cloudflare 등록·관리). Cloudflare 를 DNS+프록시로
   유지 → 무료 CDN·IP 은닉·DDoS 방어.
4. **데이터** — 기존 Supabase 데이터(리더보드 ~20행, 카운터 1행)는 이관하지 않고 새로 시작.
5. **배포** — Coolify(VM 에 설치 완료, `coolify.burn-emotion.net`)로 배포. Coolify 가
   리버스 프록시(Traefik)·TLS·빌드 담당.
6. **SSL** — Cloudflare Origin Certificate 를 Coolify 에 이미 셋팅 완료. Cloudflare SSL
   모드는 Full (strict).

## 목표 아키텍처

```
브라우저
  ├─ HTTPS ─► Cloudflare(프록시) ─► OCI · Coolify/Traefik ─► Next.js 앱 (Node, next start)
  └─ WSS   ─► Cloudflare(프록시) ─► OCI · Coolify/Traefik ─► WS 서버 (Node, ws)
                                                          Next.js 앱 ─► Postgres (Coolify 관리)
```

Coolify 리소스 3개:

| 리소스 | 내용 | 도메인 |
|---|---|---|
| burn-emotion-db | Postgres (Coolify 원클릭 DB, 영속 볼륨) | 내부 전용 |
| burn-emotion-web | Next.js 앱 (Node) | `burn-emotion.net` |
| burn-emotion-ws | WebSocket 서버 (Node) | `ws.burn-emotion.net` |

## 컴포넌트 설계

### A. 실시간 — WebSocket 서버 (신규 `realtime-server/`)

Supabase Realtime 의 broadcast + presence 만 대체하는 작은 Node + `ws` 서버.

- 단일 룸 `campfire-room`, 전부 in-memory. 채팅 메시지·presence 는 비영속이므로 DB 불필요.
- 메시지 프로토콜:
  - 클라 → 서버: `{ t: 'track', payload }` (presence 등록/갱신), `{ t: 'broadcast', event, payload }`
  - 서버 → 클라: `{ t: 'presence', state }` (전체 presence 맵), `{ t: 'broadcast', event, payload }`
- 서버는 `Map<connId, meta>` 를 유지 → 연결/해제/track 시 전체 presence state 를 전원에게 push.
- broadcast 는 **보낸 사람을 제외한** 전원에게 릴레이 (Supabase broadcast 기본 동작 `self: false` 와 동일).
- 30초 heartbeat ping — Cloudflare 프록시의 WS idle drop 방지.
- Origin 검사 — `burn-emotion.net` 출처만 허용.
- 단일 인스턴스. 수평 확장 없음(이 앱 트래픽엔 충분).

현재 `campfire-room` 채널이 쓰는 것: broadcast 이벤트 `msg`(채팅)·`counter`(고구마
카운터 갱신), presence(접속자·실루엣 위치). 위 프로토콜로 1:1 대응된다.

### B. 데이터베이스 + API

- 기존 SQL 함수 **유지** — `submit_meteor_record`/`get_meteor_top10`,
  `submit_jump_record`/`get_jump_top10`. cap-and-prune 의 원자성(INSERT + TOP10 외
  즉시 삭제 한 트랜잭션)을 그대로 보존. Supabase 전용 부분(RLS, anon/authenticated grant)만 제거.
- 신규 카운터 스키마 — 현재 `start_today`/`inc_burned` 는 Supabase 대시보드에만 있고
  파일이 없음. 이참에 코드화:
  - 테이블 `daily_counter(day date primary key, burned int not null default 0)`
  - `start_today()` — 오늘 행 없으면 생성 후 오늘 `burned` 반환
  - `inc_burned()` — 오늘 `burned` 를 1 증가시키고 새 값 반환 (upsert)
- SQL 파일은 `db/` 디렉터리로 정리 (`supabase/` 명칭 폐기): `db/meteor.sql`,
  `db/jump.sql`, `db/counter.sql`.
- Next.js Route Handler 6개가 `pg`(node-postgres) 커넥션 풀로 위 함수 호출. 앱이 이제
  Node 런타임이므로 `pg` 사용 가능:
  - `GET /api/leaderboard/meteor` → `get_meteor_top10`
  - `POST /api/leaderboard/meteor` → `submit_meteor_record`
  - `GET /api/leaderboard/jump` → `get_jump_top10`
  - `POST /api/leaderboard/jump` → `submit_jump_record`
  - `GET /api/counter` → `start_today`
  - `POST /api/counter` → `inc_burned`
- 입력 검증은 기존처럼 SQL 함수 안에 유지(닉 길이·점수 범위). Route Handler 가 새 anon
  경계지만 별도 rate limiting 은 두지 않음(현행 유지 — cap-and-prune 가 저장량을 제한).

### C. 클라이언트 코드 변경

- `@supabase/supabase-js` 의존 제거, `src/lib/supabase/` 삭제.
- 신규 `src/lib/realtime/client.ts` — 작은 WS 클라이언트. connect / on(event, fn) /
  send(event, payload) / track(meta) / 자동 재연결 / presence 콜백.
- 신규 `src/lib/api.ts` — 6개 엔드포인트 fetch 래퍼.
- `BonfireScene.tsx` 의 실시간 useEffect(~95줄, `campfire-room` 채널 + presence +
  broadcast)를 새 WS 클라이언트 기준으로 재작성. `start_today`/`inc_burned` 호출도
  `api.*` 로 교체.
- `useMeteorGame.ts`·`useJumpGame.ts` 의 `supabase.rpc(...)` 4곳을 `api.*` 호출로 교체.
- "백엔드 미설정 → 데모 모드(가짜 트래픽)" 폴백 유지. 게이트를 `isSupabaseConfigured()`
  대신 `NEXT_PUBLIC_WS_URL` 존재 여부로 변경.
- Route Handler 와 `start_today`/`inc_burned` 의 정확한 반환 형태는 구현 시 BonfireScene
  의 현재 기대값을 읽어 1:1로 맞춘다.

### D. 배포 (Coolify)

- `Dockerfile` 2개 — Next.js(standalone output) / WS 서버.
- `next.config.ts` 에 `output: 'standalone'` 추가.
- Coolify 에서: Postgres 리소스 생성 → web 앱(Dockerfile, 도메인 `burn-emotion.net`,
  env `DATABASE_URL`·`NEXT_PUBLIC_WS_URL`) → ws 앱(Dockerfile, 도메인
  `ws.burn-emotion.net`, env `PORT`·허용 Origin).
- Cloudflare: A 레코드 `burn-emotion.net`·`ws` → OCI 공인 IP (프록시 ON). SSL Full
  (strict), Origin Certificate 는 Coolify 에 설정 완료.
- main 브랜치 푸시 시 Coolify GitHub 웹훅으로 자동 배포.

### E. 정리 (제거 대상)

- 의존성/설정: `@opennextjs/cloudflare`, `wrangler`, `open-next.config.ts`,
  `wrangler.jsonc`, `.open-next/`, `cloudflare-env.d.ts`(있다면), `cf-typegen` 스크립트.
- `package.json` scripts 를 평범한 `next build` / `next start` 기반으로.
- `.env.local` 의 `NEXT_PUBLIC_SUPABASE_*` → `DATABASE_URL`·`NEXT_PUBLIC_WS_URL` 로 교체.

## 환경 변수

| 변수 | 위치 | 용도 |
|---|---|---|
| `DATABASE_URL` | web 앱 | Postgres 연결 문자열 |
| `NEXT_PUBLIC_WS_URL` | web 앱 (빌드 시 노출) | `wss://ws.burn-emotion.net` |
| `PORT` | ws 서버 | 리스닝 포트 |
| `ALLOWED_ORIGIN` | ws 서버 | `https://burn-emotion.net` |

제거: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## 위험 요소 / 함정

- **Cloudflare SSL 모드** — 반드시 Full (strict). Flexible 이면 리다이렉트 루프.
  (Origin Certificate 설정 완료로 이미 대비됨.)
- **WS idle drop** — Cloudflare 프록시 뒤 WebSocket 은 heartbeat 로 살려둬야 함
  (서버·클라 양쪽 ping 설계 포함).
- **WS 서버 단일 인스턴스** — 재시작 시 presence·연결이 초기화됨. 클라이언트 자동
  재연결로 회복. 트래픽 규모상 허용.
- **빌드 시 노출 변수** — `NEXT_PUBLIC_WS_URL` 은 빌드 타임에 박히므로 Coolify 빌드
  환경변수로 등록해야 함.

## 범위 밖 (이번에 안 함)

- 사용자 계정·Auth·파일 스토리지 (B-형 확장은 추후 별도 프로젝트).
- 기존 Supabase 데이터 이관.
- DB 백업 자동화 (Coolify 기본 스냅샷 기능에 의존, 별도 설계 안 함).
- WS 서버 수평 확장.
