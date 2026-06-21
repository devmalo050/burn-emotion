# 모바일 터치 컨트롤 (플로팅 조이스틱 + 점프 버튼) — 설계

<!-- 작성: 2026-06-21 -->

## 문제

BonfireScene의 캐릭터 이동은 방향키(`ArrowLeft/Right/Up/Down`)·스페이스(점프) 키보드 입력으로만 가능하다. 모바일에는 키보드가 없어 캐릭터를 전혀 못 움직인다. 모바일에서도 이동·점프할 수 있는 터치 컨트롤을 추가한다.

## 목표 / 비목표

**목표**
- 터치 기기에서 캐릭터를 이동(아날로그 방향+속도)·점프시킬 수 있다.
- 키보드 이동과 **완전히 동일한 경로**로 흘러, clamp·broadcast·별똥별 충돌판정·머리불 이스터에그가 추가 작업 없이 그대로 동작한다.
- 데스크톱(마우스) 경험은 변경하지 않는다.

**비목표**
- 점프맵(`/달까지`, JumpGame) 자체 조작은 건드리지 않는다(별도 키 핸들러). 점프맵 진행 중엔 터치 컨트롤을 숨긴다.
- 모닥불 poke, 채팅 등 다른 터치 인터랙션은 그대로 둔다.
- 게임패드/외부 컨트롤러는 범위 밖.

## 접근: 플로팅 조이스틱 + 고정 점프 버튼

- **이동(오른쪽 절반)**: 화면 오른쪽 절반 아무 곳이나 `pointerdown` 하면 그 지점에 조이스틱 베이스가 생긴다. 거기서 드래그한 **방향**으로 이동, **거리**로 속도(아날로그, 최대 반경에서 최고속). `pointerup`/`pointercancel` 시 사라지고 이동 정지.
- **점프(왼쪽 하단)**: 항상 떠 있는 고정 원형 버튼. 탭하면 점프(키보드 스페이스와 동일).
- 두 손가락 동시(이동+점프)는 `pointerId`로 각각 추적해 독립 처리.

### 기각한 대안
- **고정 조이스틱(오른쪽 구석 상주)**: 엄지를 정해진 구석으로 가져가야 하고 화면을 늘 가림. 사용자가 "오른쪽 절반 아무 곳"을 원함 → 플로팅 채택.
- **8방향 디지털 패드**: 아날로그 속도감이 사라져 캐주얼 이동에 둔함. 아날로그 채택.
- **motion.keys Set에 Arrow 키 add/delete로 주입**: 아날로그 세기를 표현 못 함(키는 on/off). 정규화 벡터 직접 주입 채택.

## 좌표계와 이동 주입

기존 RAF 루프(`BonfireScene.tsx:794-911`)는 매 프레임 `motion.keys`를 읽어 `kx/ky`(−1/0/+1)를 만들고, 대각선이면 `Math.SQRT1_2`로 정규화한 뒤 `motion.dx/dy`에 누적한다. 조이스틱은 이 **`kx/ky` 산출 지점(798-810줄)** 을 대체한다.

```
// 의사코드 — 798~810 자리
let kx = 0, ky = 0;
const joy = joystickRef.current;
if (joy.active) {
  kx = joy.x;          // 오른쪽 +, 길이 0..1 (아날로그)
  ky = joy.y;          // 위 +,   길이 0..1
  // joy 는 이미 반경으로 정규화(magnitude ≤ 1)되어 대각선 정규화 불필요
} else {
  if (keys.has('ArrowLeft')) kx -= 1; ... (기존 그대로)
  if (kx !== 0 && ky !== 0) { kx *= SQRT1_2; ky *= SQRT1_2; }
}
motion.dx += kx * SPEED * dt;   // 이하 clamp·broadcast·충돌판정 전부 기존과 동일
motion.dy += ky * SPEED * dt;
```

**좌표 매핑(컴포넌트가 게임 좌표로 변환해서 ref에 넣음)**
- 조이스틱 화면상 오른쪽 드래그 → `joy.x > 0` → 캐릭터 오른쪽(`motion.dx +`). 일치.
- 조이스틱 화면상 위로 드래그(스크린 −y) → `joy.y > 0`. 키보드 `ArrowUp`이 `ky += 1 → motion.dy +`로 위로 가는 것과 일치(`transform: translate(dx, -(dy+yJump))`).
- 즉 `joy.y = -(stickScreenDy) / radius`, `joy.x = stickScreenDx / radius`, 벡터 길이를 1로 cap.

**점프 주입**: 키보드 점프 로직(`776-779줄`: `motion.jumping`이 false면 `motion.vy = 0.95; motion.jumping = true`)을 `triggerJump()` 함수로 추출해 키보드 keydown과 점프 버튼 `onJump`이 공용 호출. 점프 물리(841-852줄)는 그대로.

## 컴포넌트 설계

```
src/components/TouchControls/
  TouchControls.tsx        # 포인터 이벤트 + 조이스틱/점프 UI
  TouchControls.module.css # 반투명 원, 레이어
```

**Props**
- `joystickRef: MutableRefObject<{ x: number; y: number; active: boolean }>` — 부모(BonfireScene)가 소유, 컴포넌트가 매 포인터 이동 시 갱신. RAF가 매 프레임 읽음(setState 없음).
- `onJump: () => void` — 점프 버튼 탭 콜백(`triggerJump` 연결).
- `enabled: boolean` — `false`면 렌더 안 함(점프맵 진행 중 등).

**내부 상태/동작**
- `pointerdown`(오른쪽 절반): `joystickPointerId`·origin 저장, 베이스 div를 그 좌표에 표시. `setPointerCapture`로 손가락이 벗어나도 추적.
- `pointermove`: 스틱 = origin→현재 벡터, 길이를 `MAX_RADIUS`로 cap, **데드존**(반경 12% 이하면 0). `joystickRef.current`에 정규화 벡터 기록 + 스틱 노브 위치 시각 갱신(로컬 state 또는 ref+style, 60fps 무리 없게 ref-style 직접).
- `pointerup`/`pointercancel`: `joystickRef.current = {x:0,y:0,active:false}`, 베이스 숨김.
- 왼쪽 점프 버튼: 별도 div, `pointerdown`에서 `onJump()` 호출(다중터치 위해 조이스틱과 독립).
- 조이스틱 조작 시작 시 채팅 `input.blur()` 호출은 키보드 경로와 일관(부모가 처리하거나 콜백). — 선택, 안 해도 무방.

**상수**
- `MAX_RADIUS = 56px`(노브 이동 한계), `DEAD_ZONE = 0.12`, 조이스틱은 오른쪽 절반(`clientX > innerWidth/2`)에서만 시작.

## 활성/표시 조건

- `pointer: coarse`(터치 주입력)일 때만 마운트. `window.matchMedia('(pointer: coarse)')` + `change` 리스너로 동적 갱신(마우스 연결/해제 대응). SSR 안전하게 mount 후 판정(초기 false → effect에서 설정).
- 점프맵 진행 중(`jump.gameState !== 'idle'`)이면 `enabled=false`로 숨김. 별똥별 게임 중엔 유지(회피에 이동 필요).
- 레이어: 컨테이너 `z-index: 93`. 별똥별 운석(92) 위에서 터치를 받고, 게임오버 모달(96)·AppMenu(100) 아래라 모달/메뉴가 뜨면 그쪽이 위.
- 점프 버튼·조이스틱 베이스/노브는 `touch-action: none`, `user-select: none`으로 스크롤·확대 제스처 간섭 차단.

## 데이터 흐름

```
손가락 pointerdown/move (오른쪽 절반)
  → TouchControls 가 정규화 벡터 계산
  → joystickRef.current = {x,y,active:true}   (부모 소유 ref, setState 없음)
  → BonfireScene RAF 루프가 매 프레임 ref 읽어 kx/ky 대체
  → motion.dx/dy 누적 → clamp → myCharRef transform → 20Hz broadcast → 피어 렌더
                                              ↘ 별똥별 충돌판정 / 머리불 zone (자동 동작)
점프 버튼 tap → onJump() → triggerJump() → motion.vy/jumping → 점프 물리(기존)
```

## 엣지 케이스 / 에러 처리

- **멀티터치**: 조이스틱과 점프를 서로 다른 `pointerId`로 추적. 점프 탭이 조이스틱을 리셋하지 않음.
- **포인터 도중 enabled=false 전환**(점프맵 시작): 언마운트 시 `joystickRef.current.active=false`로 정리(cleanup), 캐릭터가 한 방향으로 계속 미끄러지지 않게.
- **창 리사이즈**: 조이스틱은 origin 상대 벡터라 영향 없음. 기존 `motion.dx` 리사이즈 보정(312-339줄)과도 공유 ref라 호환.
- **데스크톱**: `pointer: coarse`가 아니면 아예 마운트 안 됨 → 마우스로 캐릭터를 끌 일 없음(키보드 유지).
- **빠른 연속 점프**: `motion.jumping` 가드로 공중 2단 점프 방지(키보드와 동일).

## 테스트 계획

- **단위(vitest)**: 정규화/데드존/cap 순수 함수를 분리(`computeJoystickVector(origin, current, maxRadius, deadZone)`)해 테스트 — (a) 데드존 내부 → `{0,0}`, (b) 최대 반경 초과 → 길이 1로 cap, (c) 위쪽 드래그 → `y>0`(게임 좌표 변환), (d) 대각선 → 길이 ≤ 1.
- **컴포넌트(jsdom)**: `pointer: coarse` mock 시 렌더/아닐 시 미렌더, 오른쪽 절반 pointerdown→move가 `joystickRef`를 갱신, up이 `active:false`로 리셋, 점프 버튼 tap이 `onJump` 호출.
- **수동 시각검증**: dev에서 DevTools 모바일 에뮬레이션(터치)으로 ① 오른쪽 절반 드래그 이동, ② 아날로그 속도, ③ 왼쪽 점프, ④ 이동+점프 동시, ⑤ 별똥별 중 회피, ⑥ 점프맵 진입 시 숨김, ⑦ 데스크톱에서 안 뜸.

## 핵심 통합 지점 (구현용)

- `BonfireScene.tsx:135-154` — `joystickRef` 신규 선언(motionRef 옆).
- `BonfireScene.tsx:776-779` — `triggerJump()` 추출.
- `BonfireScene.tsx:798-810` — `joy.active` 분기로 `kx/ky` 대체.
- `BonfireScene.tsx` 렌더 — `<TouchControls joystickRef={joystickRef} onJump={triggerJump} enabled={isCoarsePointer && jump.gameState === 'idle'} />` 추가.
- 신규 `src/components/TouchControls/*`.

## 구현 현황 (2026-06-21 완료)

- 구현 플랜: `docs/superpowers/plans/2026-06-21-mobile-touch-controls.md` (전 태스크 완료).
- 커밋: `touch-vector` 순수 함수+단위테스트 → 컴포넌트 → BonfireScene 통합.
- 검증: `tsc --noEmit` 0, `vitest run` 37 passed(touch-vector 6 + touch-controls 2 신규), `next build` 성공.
- 시각검증(Playwright 모바일 컨텍스트 `hasTouch+isMobile`): `pointer:coarse`에서 점프 버튼+조이스틱 베이스 렌더, 오른쪽 드래그 시 노브 `translate(56px,0)`·캐릭터 `0→211px` 이동, 떼면 정지, 점프 버튼 탭 시 `y −101px`. 데스크톱(`coarse:false`)에선 미렌더 확인.
