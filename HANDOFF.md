# HANDOFF — 회사망 WS 차단 대응 (로컬-우선 렌더 + SSE+POST 폴백)
<!-- 작성: 2026-06-20 -->

## 🔥 핫 스테이트 (여기만 읽어도 재개 가능)
- **목표**: 회사 방화벽/프록시가 WebSocket(`wss://ws.burn-emotion.net`)을 막는 환경에서 실시간이 통째로 죽고(본인 캐릭터조차 안 그려지고 채팅·이동 불가) 했던 문제 해결.
- **현재 상태**: **구현·머지·푸시·운영 배포·운영 검증까지 전부 완료.** 코드는 두 가지로 구성 — (A) 본인 캐릭터를 presence echo 없이 로컬 즉시 렌더 + 연결불가 시 오프라인 배너, (B) WS 막히면 same-origin SSE+POST 로 자동 폴백. main `54f5020` 까지 `origin/main` 반영됨. 워킹트리 깨끗.
- **바로 다음 할 일**:
  1. **사용자가 실제 회사 PC에서 테스트 예정** — 결과 대기 중. 캐릭터 뜨고 채팅·이동되며 우상단이 "오프라인"이 아니면 성공.
  2. 안 되면 DevTools Network 에서 ① `api/realtime/stream` 요청 status, ② `ws.burn-emotion.net` 항목 close code(1006/1008) 받아서 차단 지점 재진단.
  3. (선택) Coolify UI 에서 Next 앱에 `REALTIME_HTTP_ORIGIN=http://realtime:8080`(릴레이 내부주소) 설정 — 효율↑. 미설정이어도 동작함(현재 `https://ws.burn-emotion.net` 로 유도 중).
- **블로커**: 없음. (단, Coolify 배포 트리거를 Claude 가 직접 못 함 — MCP 가 Cloudflare Access 로그인 페이지 반환. 이번엔 git push 웹훅 자동배포로 해결됨.)

## 변경 사항 (이번 세션) — 커밋 `9b5d5f5`, 머지 `54f5020`
- `realtime-server/server.js` — transport-agnostic conns(Set)+bySession Map 으로 리팩터, `GET /sse`(SSE 스트림)·`POST /send`(batch 지원) 추가. WS·SSE 가 같은 in-memory 룸 공유. 선택 `REALTIME_PROXY_SECRET`.
- `realtime-server/server.test.js` — SSE/POST 통합 테스트 6종 추가(총 10).
- `src/lib/realtime/client.ts` — WS-first → SSE 폴백 오케스트레이션. WS 4초 미연결/즉시실패/flapping(101후 <3s ×3) 시 `/api/realtime/{stream,send}` 로 전환. 아웃바운드 100ms 배칭. `onStatus` 콜백. `RealtimeClient` 인터페이스 보존.
- `src/lib/realtime/presence.ts` (신규) — `buildMyEntity`/`mergeSilhouettes`. 본인은 로컬 spot 이 source of truth, echo 의 본인 항목 제외(중복 방지).
- `src/lib/realtime/outbound.ts` (신규) — `collapseOutbound`(배치 내 모션 최신값만 유지).
- `src/lib/realtime/relay-origin.ts` (신규) — 릴레이 HTTP origin 유도(env 주입형, 테스트 가능).
- `src/app/api/realtime/stream/route.ts` (신규) — SSE 프록시(GET). Node runtime, dynamic, `request.signal` 로 취소 전파.
- `src/app/api/realtime/send/route.ts` (신규) — POST 프록시.
- `src/components/BonfireScene/BonfireScene.tsx` — 본인 로컬-우선 시드 effect, `applyPeers` 를 mergeSilhouettes 로 교체, `onStatus`+9초 grace 타이머, `realtimeBlocked` 상태, 오프라인 배너 JSX, 라이브 인디케이터(오프라인 표시).
- `src/components/BonfireScene/BonfireScene.module.css` — `.liveDotOff`, `.offlineBanner`.
- `src/tests/{presence-merge,outbound-collapse,relay-origin}.test.ts` (신규) — 순수 함수 단위 테스트.
- `.env.example` — `REALTIME_HTTP_ORIGIN`, `REALTIME_PROXY_SECRET` 문서화.
- `docs/superpowers/specs/2026-06-19-ws-fallback-sse-design.md` (신규) — 설계·배포·한계 문서.

## 결정과 이유
- **SSE+POST(평문 HTTPS) 폴백** — 진단상 1순위 차단 모드(SSL 인스펙션 프록시의 `Upgrade` 헤더 strip)를 정면 우회. WS 핸드셰이크를 안 하므로 통과. / 기각: 동일도메인 경로로 WS 이전 → DNS/SNI 차단만 풀고 Upgrade strip 은 못 풂. 기각: Pusher/Ably 등 managed → 외부 의존성+키, 무료한도 프로젝트 성향과 안 맞음.
- **same-origin `burn-emotion.net/api/realtime/*` 경유(Next route handler 프록시)** — 별도 `ws.` 서브도메인 DNS/SNI 차단까지 우회, 인프라 UI 손 안 대고 코드만으로. 브라우저↔Next 평문 HTTPS, Next↔릴레이는 WS(데이터센터 내부, 차단 없음).
- **릴레이 단일 룸을 source of truth 유지(브리지 아님)** — Next 프록시는 stateless 바이트 파이프라 Next 수평확장 OK. 릴레이만 단일 인스턴스 전제. / 기각: Next 안에서 per-client 서버사이드 WS 브리지 → `ws` 의존성+상태 필요, 복잡.
- **본인 시드를 초기 state 가 아니라 mount effect 에서** — `randomSpot()`(Math.random/Date.now)이 SSR↔CSR 사이 달라져 hydration mismatch 나는 것 회피.
- **아웃바운드 100ms 배칭, 모션 최신값만** — 20Hz 모션을 POST 로 그대로 쏘면 초당 60 요청. 배칭으로 ~10/s 캡. 채팅·presence 즉시, 모션만 약간 지연(우선순위: 채팅).
- **WS-first 유지** — 정상 사용자 99% 경로 불변, 폴백은 실패 시에만.
- **주석 최소** — 사용자 선호(0주석 vibe-coding). 추가했던 설명 주석은 제거함.

## 막다른 길 / 실패한 시도
- **curl 로 WS 핸드셰이크 테스트 → HTTP/2 426 오판**: `curl -H 'Upgrade: websocket' https://ws.burn-emotion.net/` 가 101 아닌 426 반환. 원인은 curl 이 HTTP/2 로 보내 진짜 WS 업그레이드가 아니라서. 신뢰 불가 → `ws` 라이브러리 실제 클라이언트로 baseline 다시 잡음(101 성공). **교훈: WS 도달성은 curl 말고 실제 WS 클라이언트로.**
- **Coolify MCP 로 배포 트리거 시도 → 불가**: `mcp__coolify__get_version` 등 모두 Cloudflare Access 로그인 HTML 반환(`Log in to coolify`). 배포는 git push 웹훅 자동배포 또는 UI 수동.

## 원시 데이터 (그대로)
- **로컬 WS baseline (정상망)**: `wss://ws.burn-emotion.net` → `HTTP 101`, OPEN ~1017ms, 첫 메시지 `{"t":"presence","state":{}}`.
- **로컬 E2E (WS 죽은 ws://localhost:9999 + 실제 릴레이)**: tab1 SSE 폴백 연결 → `onlineMeta: "1명"`(오프라인 아님), 배너 없음, 본인 `낡은 지하철 (나)` 렌더. 이동: ArrowRight 600ms → `translate(1.9px)`→`171px`, 스페이스바 → `-115px`. 2번째 클라 입장 → tab1 `2명`+`검증봇` 실루엣+`폴백 테스트 메시지` 피드 수신. tab1 UI 전송 → bot2 가 `{nick:"낡은 지하철", text:"tab1에서 보낸 메시지"}` 수신.
- **운영 검증 (배포 후, 제 네트워크 → prod)**: `https://ws.burn-emotion.net/sse?sid=` → `: ok` + `data: {"t":"presence","state":{}}`. `https://burn-emotion.net/api/realtime/stream` 동일. round-trip: 클라 A `POST /api/realtime/send`(204) → 클라 B SSE 가 `{"ping":42}` 수신, A 는 자기 것 안 받음(발신자 제외 정상). WS 정상 경로 회귀 없음(OPEN+presence).
- **테스트**: vitest 26/26, 릴레이 `node --test` 10/10, `next build` 성공(`/api/realtime/{send,stream}` dynamic 등록). lint: 신규 파일 클린, BonfireScene 의 기존 4 error(`Math.random`/`Date.now` 렌더중 호출, 라인 198/213)·미사용 경고는 **원본 HEAD 와 동일**(내가 추가한 것 0).

## 열린 스레드 / 블로커
- **사용자 회사 PC 실테스트 결과 미수신** — 이게 최종 확인. 운영 합성검증은 통과했으나 실제 사내 프록시 환경 통과는 사용자만 확인 가능.
- 만약 회사망에서 SSE 도 막히면(매우 드문 케이스): 사내 프록시가 `text/event-stream` 자체를 버퍼링/차단하는 경우. 그땐 HTTP long-polling 으로 한 단계 더 내려가야 함(미구현).

## 다음 단계 (순서대로)
1. 사용자 회사 테스트 결과 받기. 성공 → 종료. 실패 → 2번.
2. DevTools Network: `api/realtime/stream` status + `ws.burn-emotion.net` close code 확보해 차단 지점 특정.
3. (선택, 효율) Coolify Next 앱 env `REALTIME_HTTP_ORIGIN` = 릴레이 내부주소.
4. (선택, 보안) `REALTIME_PROXY_SECRET` 을 릴레이·Next 양쪽 동일 설정해 SSE/POST 를 프록시 전용으로 잠금.

## 핵심 파일 / 위치
- `src/lib/realtime/client.ts:60` — `connectRealtime` 오케스트레이션(`openWs`/`switchToSse`/`openSse`/`flush`). 폴백 임계값: `FALLBACK_MS=4000`, `FLUSH_MS=100`.
- `realtime-server/server.js:75` — `handleSse`, `:118` `handleSend`, `:25` 부근 presence/applyMessage(batch).
- `src/components/BonfireScene/BonfireScene.tsx` — 본인 시드 effect(`buildMyEntity`), `applyPeers`(`mergeSilhouettes`), `onStatus`+grace(9000ms), 배너 JSX.
- `src/lib/realtime/relay-origin.ts` — `REALTIME_HTTP_ORIGIN` 없으면 `NEXT_PUBLIC_WS_URL`(wss→https) 유도.
- `src/app/api/realtime/stream/route.ts` / `send/route.ts` — 프록시.

## 실행 / 테스트
- 단위: `npx vitest run` (26). 릴레이: `cd realtime-server && node --test` (10). 빌드: `npx next build`.
- 로컬 차단 재현: `NEXT_PUBLIC_WS_URL=ws://localhost:9999 REALTIME_HTTP_ORIGIN=http://localhost:8080 npx next dev -p 3100` + 별도로 `cd realtime-server && PORT=8080 node server.js`. WS 죽은 주소라 클라가 SSE 폴백 탐.
- 운영 dev 정석: `npm run dev:all` (Next:3000 + WS:8080). Postgres:5435 도커 상주.
- 운영 폴백 헬스: `curl -N --max-time 3 https://burn-emotion.net/api/realtime/stream?sid=x` → `: ok`+presence 면 정상.

## 참조 (복제 금지, 경로/URL만)
- 설계: `docs/superpowers/specs/2026-06-19-ws-fallback-sse-design.md`
- 메모리: `~/.claude/projects/-Users-ain-Projects-burn-emotion/memory/project_realtime_ws_resilience.md`, `project_coolify_cloudflare_access.md`
- 운영 도메인: `https://burn-emotion.net` (앱), `wss://ws.burn-emotion.net` (릴레이). 레포: `github.com/devmalo050/burn-emotion`.
