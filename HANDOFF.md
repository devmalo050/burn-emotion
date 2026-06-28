# HANDOFF — 이용가이드 정정 + 실시간 presence 3대 버그 + NPC 대사 정정 (전부 완료·푸시·검증)
<!-- 작성: 2026-06-26, 갱신: 2026-06-28 (전부 완료 마무리) -->

## 🔥 핫 스테이트 (여기만 읽어도 재개 가능)
- **목표**: (1) 이용가이드를 실제 구현과 일치시키기, (2) 실시간 presence/움직임 3대 버그 잡기, (3) NPC 대사 1건 정정.
- **현재 상태**: **셋 다 완료·커밋·푸시·검증 끝. 남은 작업 없음.** main `89d1274` = `origin/main`, 워킹트리 깨끗. (1)(2)는 운영 반영·회사망 실전 검증(leave/끊김/보간) 완료, (3)은 로컬 그린 후 push(Coolify 자동배포).
- **바로 다음 할 일**: 없음. 이 핸드오프가 가리키던 일은 모두 종료. **새 작업은 `superpowers:brainstorming` → `writing-plans`부터.**
- **블로커**: 없음.

## 2026-06-28 마무리 세션 (커밋 1개)
- **커밋 `89d1274`** — `BonfireScene.tsx:54` NPC_MESSAGES "달 옆에 큼직한 별" → "달 옆에 잔잔히 빛나는 작은 별". 실측 확인: `.moon` 18px > `.landmarkStar` 12px(`StarrySky.module.css:20,40`, 모바일도 동일)이라 "큼직한"은 오안내였음. 가이드 4파일 표현("달 옆 작은 별")과 통일. diff 1줄, `tsc --noEmit` exit 0.
- **최종 그린 재확인**: `npx vitest run` 11파일/50 passed, `realtime-server` `node --test` 13 passed(SSE leave/idle/keepalive 신규 3 포함). 직전 핸드오프가 남기지 못한 실시간 수정분 실행 로그 이번에 확보.
- **참고(기존·미수정)**: `BonfireScene.tsx:205,220,221` 의 `Math.random()`/`Date.now()` ref 1회 init 은 React Compiler eslint 가 "impure during render"로 4 errors 잡지만, stash 비교상 기존 배포 코드에 그대로 존재·운영 정상이라 범위 밖으로 둠.

## 변경 사항 (이번 세션) — 커밋 2개

### 커밋 `ba01ff3` — 이용가이드 정정 (가이드 4파일, +33/−14)
실제 구현과 어긋난 6종을 정정. 워크플로우로 19개 후보→18 확정(중복 제거 후 6종), AppMenu 건 1개 기각.
- `src/app/guide/page.tsx` — 모바일 터치 조작(왼쪽 조이스틱·오른쪽 점프버튼) 추가, 점프맵 키보드 전용 명시, 불멍가루 "리튬" 제거, 머리불 점화조건("지나가면"→한가운데로 올려야)+무지개 연동 추가, 리더보드 "큰 별"→"작은 별".
- `src/components/GuideJsonLd/GuideJsonLd.tsx` — 위와 동일 사실을 HowTo step 들에 반영.
- `src/components/SeoContent/SeoContent.tsx` — "채팅창 명령어로 미니게임 시작"(허위)→"달·열기구 클릭", 모바일 조작 FAQ 신설.
- `src/components/JsonLd/JsonLd.tsx` — WebApplication description 의 "채팅창 명령어"→"달·열기구 클릭".

### 커밋 `03a6554` — 실시간 presence 3대 버그 (7파일, +331/−44, 신규 2)
워크플로우(systematic-debugging) 진단 → 증상별 근본원인 수정.
- `realtime-server/server.js` — **증상1**. SSE conn `lastSeen` + idle reaper(heartbeat 루프가 SSE 도 검사). `{t:'leave'}` 처리(closeTransport), `{t:'ping'}` no-op(lastSeen 은 handleSend 가 갱신). `heartbeatMs`/`sseIdleMs` 옵션화.
- `src/lib/realtime/client.ts` — **증상1+증상2**. close() 시 `navigator.sendBeacon({t:'leave'})`, idle 시 `KEEPALIVE_MS=20s` 마다 `{t:'ping'}` POST. `FLUSH_MS` 100→50.
- `src/lib/realtime/interpolate.ts` (신규) — **증상3**. `sampleAt`(스냅샷버퍼 시간보간) + `prune` 순수함수.
- `src/components/BonfireScene/BonfireScene.tsx` — **증상3**. peer motion 을 `peerBufRef`(nick별 수신시각 스냅샷버퍼)에 저장, RAF 에서 `now - RENDER_DELAY(100ms)` 시점 선형보간. 기존 dt 무보정 고정 FACTOR lerp 제거. 퇴장 peer 버퍼 prune.
- `realtime-server/server.test.js` — SSE leave/idle/ping 3 신규.
- `src/tests/realtime-client.test.ts` — 클라 leave/keepalive 3 신규.
- `src/tests/interpolate.test.ts` (신규) — 보간 순수함수 10.

## 결정과 이유 (+ 기각한 대안)
- **증상1: 소켓 close 의존 폐기, reaper+명시 leave 병행** — SSE leave 가 "EventSource close → Next route fetch abort → 릴레이 소켓 close" 3단 전파에 의존했는데 회사 프록시가 idle 소켓을 살려두면 좀비 잔류. 서버 idle reaper(백스톱) + sendBeacon leave(즉시) 둘 다 넣음. / **reaper 와 keepalive 는 짝 필수**: keepalive 없으면 가만히 있는 정상 사용자가 reaper 에 오회수됨. SSE_IDLE_MS(60s) ≫ KEEPALIVE_MS(20s) 로 마진.
- **증상3: dt 기반 factor 감쇠 대신 스냅샷버퍼 시간보간** — 고정 FACTOR=0.5 는 ~2프레임(33ms)이면 target 도달 후 다음 패킷(50ms)까지 정지 → "드드드". 시간보간(RENDER_DELAY 만큼 의도적 지연 후 두 스냅샷 사이 등속 보간)으로 등속 운동 복원. 사용자 "딜레이 감수, 부드러움 우선"과 일치. / 기각: dt 기반 `1-exp(-k·dt)` 는 ease-out 못 없애 부분완화에 그침.
- **증상2: 서버 throttle 아님, 클라 FLUSH_MS 가 원인** — 본인 motion 은 20Hz 생성이나 SSE flush 100ms+collapse 로 실효 10Hz. FLUSH_MS 50ms 로 WS 와 정합. collapseOutbound(motion 1개 압축)는 유지(중복좌표 누적 방지 타당). 증상3 보간이 jitter 추가 흡수.
- **가이드: spec/plan 문서는 안 고침** — `docs/superpowers/.../2026-05-24-guide-page-*.md` 에도 "리튬"·"큰 별" 있으나 그건 가이드 만들 때의 과거 설계 기록(이력 보존). 사용자 노출 "이용 가이드" 4파일만 수정.
- **점프맵 모바일 미지원을 "버그 수정" 아닌 "문서화"로** — 점프맵은 코드상 키보드 전용(useJumpGame 키보드만, TouchControls 가 jump.gameState!=='idle' 에서 비활성). 메모리상 미니게임 라이프사이클은 사용자 결정사항이라, 터치 추가 대신 가이드에 "키보드 전용"으로 정직히 기술.

## 막다른 길 / 실패한 시도
- 이번 세션에는 없음(워크플로우 진단이 한 번에 근본원인 짚음). 단 증상1 **실제 트리거가 (a)회사 프록시 idle keepalive 인지 (b)fetch abort 미전파인지** 코드만으론 단정 불가였으나, reaper+leave 가 양쪽 다 커버하므로 실전에서 해결 확인됨(원인 단정 불필요해짐).

## 원시 데이터 (그대로)
- **워크플로우 진단 산출물**(임시, 사라질 수 있음): `/private/tmp/claude-502/-Users-ain-Projects-burn-emotion/91c652d3-472f-4550-b207-b60f4865af28/tasks/wixf3tpal.output` (3대 증상 근본원인+fixPlan+회귀위험 전문).
- **가이드 검증 산출물**(임시): `.../tasks/wge6z5ovi.output` (가이드 불일치 18 확정 전문).
- **가이드 수정 검증**: `npx eslint`(4파일 exit 0) / `npx tsc --noEmit`(0) / `npx vitest run`(37 passed, 당시 10 파일).
- **운영 배포 확인**: 가이드 push 후 ~5분 내 Coolify 자동배포 반영(`burn-emotion.net/guide` 에서 "리튬" 사라짐·"조이스틱"·"작은 별" 노출 curl 확인). 실시간은 회사망 사용자 실전 확인(leave 정리·끊김 해소·보간 부드러움 셋 다).
- **상수값**: `SSE_IDLE_MS=60000`(server.js:12), `KEEPALIVE_MS=20000`(client.ts:25), `FLUSH_MS=50`(client.ts:23), `RENDER_DELAY=100`(BonfireScene.tsx:542).

## 열린 스레드 / 블로커
- (해소됨) **NPC 대사 "큼직한 별"** — 2026-06-28 `89d1274` 로 정정·push 완료. 칩 `task_81ef5406` 은 앱 재시작으로 id 만료되어 자동 회수 불가(무해, 클릭해도 이미 수정된 상태 발견).
- (해소됨, 참고) 이전 핸드오프의 "릴레이 재배포 미확인"(#9 backpressure) — 이번 `03a6554` 가 server.js 를 또 바꿨고 회사망 leave 가 동작하므로 릴레이가 재배포됨이 입증됨 → #9 도 함께 운영 반영된 것으로 추정.
- (드문 케이스, 미구현) 사내 프록시가 `text/event-stream` 자체를 차단하면 SSE 도 못 뚫음 → HTTP long-polling 한 단계 더 필요.

## 다음 단계 (순서대로)
1. ~~NPC "큼직한 별" 칩 처리~~ → 완료(`89d1274`).
2. ~~`npx vitest run` + `node --test` 최종 그린 확인~~ → 완료(50 + 13 passed).
3. **이 핸드오프 작업은 전부 종료. 추가 작업 없음.** 새 기능은 `superpowers:brainstorming` → `writing-plans` 워크플로우부터.

## 핵심 파일 / 위치
- `src/lib/realtime/interpolate.ts:16` `sampleAt`, `:44` `prune` (보간 순수함수, 테스트 대상).
- `src/components/BonfireScene/BonfireScene.tsx:155` `peerBufRef`, `:447` 수신→버퍼 push, `:542` `RENDER_DELAY`/`:547` `renderTime` 선형보간, `:374` 퇴장 peer prune.
- `src/lib/realtime/client.ts:23` `FLUSH_MS=50`, `:25` `KEEPALIVE_MS`, `:95` idle ping, `:104` leave body, `:107` sendBeacon.
- `realtime-server/server.js:12` `SSE_IDLE_MS`, `:67` `{t:'leave'}`, `:69` `{t:'ping'}`, `:111` SSE conn lastSeen, `:164` handleSend lastSeen 갱신, `:240` heartbeat reaper(`:251` SSE idle 회수).
- 가이드: `src/app/guide/page.tsx`, `src/components/GuideJsonLd/GuideJsonLd.tsx`, `src/components/SeoContent/SeoContent.tsx`, `src/components/JsonLd/JsonLd.tsx`.

## 실행 / 테스트
- 단위: `npx vitest run`. 릴레이: `cd realtime-server && node --test`. 타입: `npx tsc --noEmit`. 빌드: `npx next build`. lint: `npx eslint`.
- 로컬 dev: `npm run dev:all` (Next:3000 + WS:8080). Postgres:5435 도커 상주 필요(`lsof -nP -iTCP:5435 -sTCP:LISTEN`).
- 운영 폴백 헬스: `curl -N --max-time 3 https://burn-emotion.net/api/realtime/stream?sid=x` → `: ok`+presence.
- 운영 배포: git push → Coolify 웹훅 자동배포(Next·릴레이 둘 다). Coolify MCP 는 Cloudflare Access 로 직접 트리거 불가.

## 참조 (복제 금지, 경로/URL만)
- 직전 핸드오프(적대적 리뷰 13건): `git show ba01ff3~1:HANDOFF.md` 또는 `git log --oneline -- HANDOFF.md`.
- 메모리: `~/.claude/projects/-Users-ain-Projects-burn-emotion/memory/project_realtime_ws_resilience.md`(이번에 2026-06-26 검증완료로 갱신), `project_coolify_cloudflare_access.md`.
- 가이드 설계(과거, 미수정): `docs/superpowers/specs/2026-05-24-guide-page-design.md`.
- WS 폴백 설계: `docs/superpowers/specs/2026-06-19-ws-fallback-sse-design.md`.
- 운영: `https://burn-emotion.net`(앱), `wss://ws.burn-emotion.net`(릴레이). 레포: `github.com/devmalo050/burn-emotion`.
