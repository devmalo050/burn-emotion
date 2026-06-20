# 실시간 WS 차단 환경용 SSE+POST 폴백 설계 (2026-06-19)

## 문제

실시간(presence/broadcast)이 `wss://ws.burn-emotion.net` raw WebSocket 단일 transport였다. 회사 방화벽/프록시가 WS 를 막는 환경에서 연결 전체가 죽고, 본인 캐릭터조차 presence echo 에 의존해 화면이 통째로 블랙아웃됐다(채팅·이동 불가). 회사망에서 직접 진단할 수 없어, 가장 유력한 차단 모드(SSL 인스펙션 프록시의 `Upgrade` 헤더 strip)를 정면으로 우회하는 폴백을 추가한다.

## 설계: WS-first → same-origin SSE+POST 폴백

- 브라우저는 `wss://ws.burn-emotion.net` WS 를 먼저 시도. 4초 내 미연결이거나 핸드셰이크 실패, 혹은 101 후 3회 연속 단명(<3s) flapping 이면 자동으로 SSE+POST 로 전환.
- 폴백 채널은 **메인 사이트와 동일 출처** `burn-emotion.net/api/realtime/*` 로 가고, Next route handler 가 릴레이로 프록시한다.
  - **SSE**(`GET /api/realtime/stream`): 서버→브라우저 push. 평문 HTTPS 라 WS Upgrade 를 안 해 SSL 인스펙션 프록시가 못 막는다.
  - **POST**(`POST /api/realtime/send`): 브라우저→서버. 아웃바운드는 client 에서 100ms 배칭(모션은 최신값만)으로 묶어 POST rate 를 초당 ~10 로 캡.
  - 동일 출처라 별도 `ws.` 서브도메인 DNS/SNI 차단도 우회. 브라우저↔Next 는 평문 HTTPS, Next↔릴레이는 WS(데이터센터 내부, 차단 없음).
- 릴레이의 in-memory 단일 룸이 그대로 source of truth. WS 로 붙은 사람과 SSE 로 붙은 사람이 **같은 방**에 들어온다(릴레이를 transport-agnostic conn 추상화로 리팩터).
- WS 정상인 사용자 경로는 동작 불변(폴백은 실패 시에만).

## 본인 캐릭터 로컬-우선 렌더 (선행 작업)

`src/lib/realtime/presence.ts` 의 `buildMyEntity`/`mergeSilhouettes` 로 본인은 `mySpotRef`(로컬)가 source of truth, peer 만 presence 로 병합. WS/SSE 둘 다 막혀도 본인은 보이고 이동/점프 가능. presence echo 의 본인 항목은 제외(중복 방지). 연결 불가 시 6초(폴백 여유 위해 9초) 후 오프라인 배너 표시.

## 파일

- `realtime-server/server.js` — transport-agnostic conns(Set) + bySession Map, `GET /sse`(SSE 스트림), `POST /send`(메시지 수신, batch 지원). WS heartbeat 는 ws conn 만, SSE 는 25s ping 코멘트 + req close 로 정리. 선택 `REALTIME_PROXY_SECRET`.
- `src/app/api/realtime/stream/route.ts`, `.../send/route.ts` — Node runtime, dynamic, `request.signal` 로 취소 전파해 클라 disconnect → 릴레이 presence 정리.
- `src/lib/realtime/relay-origin.ts` — 릴레이 HTTP origin 유도(`REALTIME_HTTP_ORIGIN` 우선, 없으면 `NEXT_PUBLIC_WS_URL` wss→https).
- `src/lib/realtime/outbound.ts` — `collapseOutbound`(배치 내 모션 최신값만).
- `src/lib/realtime/client.ts` — WS-first → SSE 폴백 오케스트레이션, `RealtimeClient` 인터페이스·`onStatus` 보존.
- 테스트: `realtime-server/server.test.js`(SSE/POST 6종 추가), `src/tests/{presence-merge,outbound-collapse,relay-origin}.test.ts`.

## 배포 요구사항 (운영 반영 시 필요)

1. **릴레이(realtime-server) 재배포** — 새 `/sse`·`/send` 엔드포인트 포함.
2. **Next 앱 env**: `REALTIME_HTTP_ORIGIN` 을 릴레이 내부 주소(예: Coolify 서비스 `http://realtime:8080`)로. 미설정 시 `https://ws.burn-emotion.net`(Cloudflare 경유)로 동작은 함.
3. (선택) `REALTIME_PROXY_SECRET` 을 릴레이·Next 양쪽에 동일 설정해 릴레이 SSE/POST 를 프록시 전용으로 잠금.
4. Cloudflare 는 `text/event-stream` + `no-transform` 을 버퍼링 없이 통과(기본). burn-emotion.net 프록시 설정 그대로 OK.

## 한계

- 릴레이는 **단일 인스턴스** 전제(in-memory 룸, sid→conn). Next 프록시는 stateless 라 Next 는 수평 확장 가능.
- 폴백 시 모션은 100ms 배칭이라 약간 지연(채팅 우선). presence·채팅은 즉시.
- 검증: WS 죽은 주소로 강제 폴백, Playwright 로 본인 렌더·양방향 채팅·presence 동기화·send(배칭 POST) 확인. 단위/통합 테스트 전부 통과(vitest 26, 릴레이 10), 프로덕션 빌드 통과.
