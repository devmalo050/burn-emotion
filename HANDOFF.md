# HANDOFF — 적대적 코드 리뷰 13건 수정 (실시간 견고성·씬 성능·DB/릴레이 하드닝)
<!-- 작성: 2026-06-20 -->

## 🔥 핫 스테이트 (여기만 읽어도 재개 가능)
- **목표**: 프로젝트 전체 적대적 리뷰로 버그·성능 이슈를 찾아 다 고친다. (직전 세션의 회사망 WS 폴백 작업의 직접 후속 — 그 폴백에 숨어있던 치명적 결함 #1을 이번에 잡음.)
- **현재 상태**: **검증 통과 13건 전부 수정·단일 커밋·푸시 완료.** main `812c395` = `origin/main` 일치, 워킹트리 깨끗. 전 구간 검증 통과(tsc 0 · vitest 29/29 · 릴레이 10/10 · next build · 앱 실행 시각검증).
- **바로 다음 할 일**:
  1. **회사망 실테스트 결과 받기** — 직전 세션부터 대기 중. 성공판정: 캐릭터 뜨고 + 채팅·이동되며 + 우상단이 "오프라인" 아님. 이제 #1 덕분에 SSE 끊겨도 자동 재연결됨.
  2. **운영 배포** — Next 앱은 git push 웹훅 자동배포로 이미 반영됨(푸시 완료). **단, `realtime-server/server.js`(#9 backpressure)가 바뀌었으므로 릴레이 재배포가 별도로 필요.** 직전 핸드오프의 "릴레이 재배포" 요구사항과 동일(Coolify UI 수동 또는 릴레이용 웹훅). 릴레이 재배포 안 해도 backpressure 가드만 빠질 뿐 폴백 기능 자체는 동작함.
  3. 회사 테스트 성공 + 릴레이 배포 확인되면 종료.
- **블로커**: 없음. (Coolify 배포 트리거는 Claude 가 직접 못 함 — MCP 가 Cloudflare Access 로그인 페이지 반환. git push 웹훅 자동배포 또는 UI 수동.) 로컬 Postgres `:5435` 꺼져 있음 — 이번 시각검증엔 무관했으나 로컬에서 리더보드/카운터 쓰려면 도커 컨테이너 기동 필요.

## 작업 방식 (이번 세션)
- `Workflow` 로 10개 서브시스템 적대적 핀더 → 발견마다 회의적 검증(기본 반증) 파이프라인 실행. **36건 발견 → 13건 검증 통과 → 23건 반증 탈락.** 거짓 양성은 코드에 안 넣음.
- 대형/시각민감 perf 2건(#4 별똥별, #5 불꽃)은 **앱을 실제로 띄워 baseline↔after 스크린샷 비교**로 시각 회귀 검증(Playwright MCP). 둘 다 시각적으로 동일 확인.

## 변경 사항 (이번 세션) — 커밋 `812c395` (8 파일 +423/−104, 신규 테스트 1)
- `src/lib/realtime/client.ts` — **#1·#2·#7·#8**. SSE `onerror` 를 종단실패로 보고 지수 백오프 재연결(`openSse`) + 4회마다 `retryWsFromSse`(WS 부활) 하는 닫힌 상태머신. `sseLive` 게이트로 죽은 채널 POST 차단. WS OPEN 아니면 `enqueue`(상한 300, collapse) 후 `drainToWs`/flush 로 드레인 → connecting·재연결 대기 중 채팅 유실 방지.
- `src/components/BonfireScene/BonfireScene.tsx` — **#3·#10·#11·#12**. `activeBubbles` 인덱스→nick 키잉 + applyPeers 에서 퇴장 피어 prune. motion broadcast `setInterval` 16ms→50ms(주석 20Hz 의도 일치). `<CampfireFlames paused={게임중} />`.
- `src/components/CampfireFlames/CampfireFlames.tsx` — **#5·#12·#13**. 매 프레임 `createRadialGradient`(5개 draw 경로) → 마운트 1회 단위 스프라이트 캐싱(`radialSprite`/`drawSprite`, alpha=globalAlpha, hue 이산버킷) + drawImage. `pausedRef` 로 각 step() 최상단에서 paused 면 work 건너뛰고 reschedule. embers 데드코드(>emberCount+20) 제거.
- `src/components/MeteorGame/useMeteorGame.ts` — **#4**. `meteorElsRef` 추가. RAF 루프: membership(생성/소멸) 변경 시에만 `setMeteors`, 위치는 매 프레임 ref transform 직접 갱신.
- `src/components/MeteorGame/MeteorOverlay.tsx` — **#4**. 메테오 divs 를 `useMemo([meteors])` 로 참조 안정화(`survivedMs` 매 프레임 리렌더에도 reconcile 스킵), ref 콜백 등록 + `left/top`→`transform` 위치.
- `src/lib/db.ts` — **#6**. `createPool()` 안에서 `pool.on('error', ...)` 등록(globalThis 캐시 적중 시 중복등록 방지) → idle client 에러 시 프로세스 크래시 방지.
- `realtime-server/server.js` — **#9**. `dropConn` backpressure 가드 — WS `bufferedAmount` / SSE `res.writableLength` 가 `MAX_SEND_BUFFER`(1MB) 초과 시 연결 차단. `queueMicrotask` 로 지연해 broadcast 루프 중 동기 재진입 방지. `overloaded` 플래그로 중복 차단 방지.
- `src/tests/realtime-client.test.ts` (신규) — client 상태머신 3종(버퍼링→WS open 드레인 / SSE onerror 백오프 재연결 / sseLive=false 시 flush POST 안 함). WebSocket·EventSource·fetch mock + fake timers.
- `docs/superpowers/specs/2026-06-19-ws-fallback-sse-design.md` — "폴백 견고성" 섹션 추가(SSE 재연결·WS 부활·send 버퍼링), 테스트 수 29 로 갱신.

## 결정과 이유 (+ 기각한 대안)
- **#4 별똥별: canvas 전면 재작성(원 제안) 대신 ref-기반 DOM 위치 갱신** — `useMemo`+ref transform 으로 매 프레임 reconcile 만 제거. 픽셀 동일·회귀 위험 최소. / 기각: canvas 재작성 → 동작하는 게임에 고위험.
- **#5 불꽃: 키-기반 gradient 캐시 대신 오프스크린 스프라이트** — `createRadialGradient` 는 절대좌표를 굽기 때문에 재배치 불가. 단위반경 스프라이트 1회 굽고 drawImage(alpha=globalAlpha). hue 는 splash 9색 이산 + ember 정수 양자화. 가산합성('lighter'/'screen') 결과 동등.
- **#12: 불꽃을 언마운트 대신 step() 최상단 paused 스킵** — splash 핸들(useImperativeHandle, powderSparksRef)·파티클 배열을 리셋하지 않으려고. effect 재실행/언마운트 안 함. 오버레이 뒤라 frozen 캔버스는 안 보임.
- **#11: 16ms 유지+주석수정 대신 50ms** — 수신측이 60fps RAF lerp 로 보간하므로 20Hz 로도 끊김 없음. 릴레이 부하 3배↓(프로젝트 free-tier 성향).
- **#9: 첫 `!ok`(write false)에 끊지 않고 writableLength 하드캡(1MB)에서만 끊음** — `!ok` 는 정상 일시 backpressure 라 너무 공격적. 메모리 무한적체만 방지.
- **보류했다가 사용자 요청으로 전부 수행** — #4·#5(시각검증 동반), #9 까지 13/13 완료.

## 막다른 길 / 실패한 시도
- **#9 backpressure 단위 테스트 → 안 만듦**: 송신 버퍼를 >1MB 로 부풀리려면 클라이언트를 stall 시켜야 하는데 커널 송신버퍼 크기가 환경마다 달라 **flaky**. flaky 테스트는 무가치 → 가드(8줄)는 회귀 테스트(작은 메시지는 캡 미발동, 10/10 통과)+코드리뷰로 검증.
- **시각 baseline 타이밍 착각**: 별똥별 재시작 후 "3.5초 sleep 했는데 타이머 15.0초" 라 잠깐 의심 → 1초 뒤 18.38초로 정상 증가 확인. 툴 왕복 + 캐릭터가 가만히 15s 생존했을 뿐, 버그 아님. (타이머/survivedMs 로직은 미변경.)
- (참고, 직전 세션 교훈 유효) WS 도달성은 curl 말고 실제 WS 클라이언트로. Coolify MCP 는 Cloudflare Access 로 직접 호출 불가.

## 원시 데이터 (그대로)
- **리뷰 결과**: 36 발견 → 13 검증통과 → 23 반증. 반증 사유 대부분: 단일스레드 이벤트루프 의미론 오해(race 없음), 의도된 설계(욕설필터/cap-prune/무주석), dead-code, 정적/1회성을 핫패스로 오판, 호출경로 부재(데드코드).
- **검증 수치(최종)**: `npx tsc --noEmit` exit 0 / `npx vitest run` 29 passed (8 files) / `cd realtime-server && node --test` tests 10 pass 10 fail 0 / `npx next build` 성공(`/api/realtime/{send,stream}` dynamic 등록).
- **앱 실행 시각검증(로컬, WS·DB 다운)**: 불꽃 baseline↔스프라이트後 동일(주황/노랑 기둥·글로우·불티). 별똥별 플레이 정상(타이머 15.0→18.38초 증가, 충돌→gameover 14.93/18.38초, 점+꼬리 렌더, 모달 정상). 콘솔 에러 전부 인프라(WS refused / 500 DB / 502 SSE) — canvas/React 신규 에러 0. **콘솔에 WS 2회+SSE 502 4회 관측 = #1 상태머신(SSE 백오프→4회째 WS 부활)이 실제 순환하는 증거.**
- **커밋/푸시**: `git commit 812c395`, `git push origin main` → `91401ea..812c395  main -> main`. sync `0 0`.
- 워크플로우 리뷰 산출물(임시, 사라질 수 있음): `/private/tmp/.../tasks/w1ect405u.output` (totalRaw 36, confirmed 13, rejected 23 전문 포함).

## 열린 스레드 / 블로커
- **회사 PC 실테스트 결과 미수신** — 직전 세션부터 최종 확인 대기. #1 수정으로 SSE 영구단절은 해소됐으니, 실패해도 자동 재연결 시도함.
- **릴레이(realtime-server) 운영 재배포 미확인** — #9 가 서버측 변경이라 재배포해야 적용됨(미배포여도 폴백 동작엔 영향 없음, backpressure 가드만 빠짐).
- (드문 케이스) 사내 프록시가 `text/event-stream` 자체를 차단하면 SSE 도 못 뚫음 → HTTP long-polling 한 단계 더(미구현).

## 다음 단계 (순서대로)
1. 회사 테스트 결과 받기. 성공 → 4번. 실패 → DevTools Network 에서 ① `api/realtime/stream` status, ② `ws.burn-emotion.net` close code(1006/1008) 확보해 차단지점 재진단.
2. 릴레이 재배포(Coolify UI 또는 웹훅)로 #9 backpressure 가드 운영 반영 — 직전 핸드오프 "배포 요구사항" 참고.
3. (선택) Coolify Next 앱 env `REALTIME_HTTP_ORIGIN`=릴레이 내부주소(`http://realtime:8080`), 보안용 `REALTIME_PROXY_SECRET` 릴레이·Next 양쪽 동일 — 직전 핸드오프 참고.
4. 정리/종료. 추가 리뷰 원하면 동일 Workflow 재실행 가능.

## 핵심 파일 / 위치
- `src/lib/realtime/client.ts:99` — `openSse`(onerror 백오프 재연결), `:192` `retryWsFromSse`(WS 부활), `:91` `drainToWs`, `:78` `flush`(sseLive 게이트), `:220` `send`(비-OPEN 버퍼링). 상수 `FALLBACK_MS=4000`/`FLUSH_MS=100`/`OUT_CAP=300`.
- `src/components/MeteorGame/useMeteorGame.ts` — `meteorElsRef`, 루프 내 `memberChanged` 플래그 + ref transform 갱신 + `if (memberChanged) setMeteors`.
- `src/components/MeteorGame/MeteorOverlay.tsx` — `meteorField = useMemo([meteors, meteorElsRef])`.
- `src/components/CampfireFlames/CampfireFlames.tsx:36` 부근 `radialSprite`/`drawSprite`, `pausedRef`, 각 step() 최상단 paused 스킵.
- `src/components/BonfireScene/BonfireScene.tsx` — `activeBubbles` nick 키잉(crowd/submit/render/applyPeers prune), motion `setInterval(...,50)`, `<CampfireFlames paused=... />`.
- `src/lib/db.ts` — `createPool()` + `pool.on('error')`.
- `realtime-server/server.js` — `dropConn`, WS send `bufferedAmount` / SSE send `writableLength` 캡(`MAX_SEND_BUFFER=1_000_000`).

## 실행 / 테스트
- 단위: `npx vitest run` (29). 릴레이: `cd realtime-server && node --test` (10). 타입: `npx tsc --noEmit`. 빌드: `npx next build`.
- 로컬 dev: `npm run dev:all` (Next:3000 + WS:8080). Postgres:5435 도커 상주 필요(`lsof -nP -iTCP:5435 -sTCP:LISTEN`).
- 시각검증: dev 띄우고 `localhost:3000` → 불꽃 확인 / "별똥별 피하기 시작" 버튼(또는 밤하늘 달 클릭)으로 별똥별 게임. WS·DB 없어도 불꽃·게임은 클라 렌더라 검증 가능(콘솔 인프라 에러는 정상).
- 로컬 차단 재현(직전 세션): `NEXT_PUBLIC_WS_URL=ws://localhost:9999 REALTIME_HTTP_ORIGIN=http://localhost:8080 npx next dev -p 3100` + `cd realtime-server && PORT=8080 node server.js`.
- 운영 폴백 헬스: `curl -N --max-time 3 https://burn-emotion.net/api/realtime/stream?sid=x` → `: ok`+presence.

## 참조 (복제 금지, 경로/URL만)
- 직전 핸드오프(WS 폴백 + 배포 요구사항): `git show 91401ea:HANDOFF.md`
- 설계: `docs/superpowers/specs/2026-06-19-ws-fallback-sse-design.md` (이번에 견고성 섹션 갱신)
- 메모리: `~/.claude/projects/-Users-ain-Projects-burn-emotion/memory/project_realtime_ws_resilience.md`, `project_coolify_cloudflare_access.md`
- 운영: `https://burn-emotion.net`(앱), `wss://ws.burn-emotion.net`(릴레이). 레포: `github.com/devmalo050/burn-emotion`.
