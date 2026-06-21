# 모바일 터치 컨트롤 (플로팅 조이스틱 + 점프 버튼) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일(터치) 기기에서 플로팅 조이스틱으로 캐릭터를 이동하고 점프 버튼으로 점프할 수 있게 한다.

**Architecture:** 정규화·데드존·아날로그 cap 로직을 순수 함수 `computeJoystickVector`로 분리(단위테스트). `TouchControls` 컴포넌트가 window pointerdown 리스너로 오른쪽 절반 빈 곳을 감지해 부모 소유 `joystickRef`(setState 없음)에 게임 좌표 벡터를 쓴다. BonfireScene의 기존 RAF 이동 루프가 매 프레임 그 ref를 읽어 키보드 `kx/ky`를 대체 → clamp·broadcast·별똥별 충돌·머리불 전부 그대로 재사용.

**Tech Stack:** Next.js(클라이언트 컴포넌트), React 18 hooks, Pointer Events API, CSS Modules, vitest + @testing-library/react.

## Global Constraints

- 주석은 WHY가 비자명할 때만. 기본 무주석(프로젝트 규칙). What 주석 금지.
- UTF-8(BOM 없음). 한국어 문자열 그대로.
- 데스크톱(마우스) 경험 불변 — `pointer: coarse`일 때만 컨트롤 마운트.
- 점프맵(`jump.gameState !== 'idle'`) 진행 중엔 컨트롤 숨김. 별똥별 게임 중엔 유지.
- 좌표 매핑: 조이스틱 게임 좌표 `x`= 오른쪽 +, `y`= 위 +(키보드 `ArrowUp`→`ky+=1`과 동일). `transform: translate(dx, -(dy+yJump))`.
- 상수: `MAX_RADIUS = 56`(px), `DEAD_ZONE = 0.12`. 레이어 `z-index: 93`(별똥별 운석 92 위, 게임오버 모달 96·AppMenu 100 아래).

---

## File Structure

- `src/components/TouchControls/touch-vector.ts` — 순수 함수 `computeJoystickVector` + 상수 `MAX_RADIUS`/`DEAD_ZONE`. 의존성 없음.
- `src/components/TouchControls/TouchControls.tsx` — 클라이언트 컴포넌트. window pointer 리스너, 조이스틱 베이스/노브 + 점프 버튼 렌더.
- `src/components/TouchControls/TouchControls.module.css` — 반투명 원 스타일, 레이어.
- `src/tests/touch-vector.test.ts` — 순수 함수 단위테스트.
- `src/tests/touch-controls.test.tsx` — 컴포넌트 스모크 테스트(렌더 게이트 + 점프 콜백).
- `src/components/BonfireScene/BonfireScene.tsx` (수정) — `joystickRef` 선언, `triggerJump` 추출, `kx/ky` 분기, `pointer: coarse` 감지, `data-no-joystick` 마커, `<TouchControls/>` 렌더.

---

## Task 1: 조이스틱 벡터 순수 함수

**Files:**
- Create: `src/components/TouchControls/touch-vector.ts`
- Test: `src/tests/touch-vector.test.ts`

**Interfaces:**
- Produces:
  - `MAX_RADIUS: number` (= 56), `DEAD_ZONE: number` (= 0.12)
  - `type JoystickVector = { x: number; y: number }`
  - `computeJoystickVector(originX: number, originY: number, curX: number, curY: number, maxRadius: number, deadZone: number): JoystickVector` — 게임 좌표(오른쪽 +x, 위 +y), 벡터 길이 0..1.

- [x] **Step 1: 실패하는 테스트 작성**

`src/tests/touch-vector.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeJoystickVector, MAX_RADIUS, DEAD_ZONE } from '../components/TouchControls/touch-vector';

const R = MAX_RADIUS;
const DZ = DEAD_ZONE;

describe('computeJoystickVector', () => {
  it('데드존 내부 입력은 0 벡터', () => {
    // dist 3 < DEAD_ZONE*R(6.72) → 무시
    expect(computeJoystickVector(100, 100, 103, 100, R, DZ)).toEqual({ x: 0, y: 0 });
  });

  it('origin 과 동일한 점도 0 벡터(0 나눗셈 방지)', () => {
    expect(computeJoystickVector(100, 100, 100, 100, R, DZ)).toEqual({ x: 0, y: 0 });
  });

  it('오른쪽 최대 드래그는 x≈1, y≈0', () => {
    const v = computeJoystickVector(100, 100, 100 + 200, 100, R, DZ);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
  });

  it('화면 위로 드래그(스크린 -y)는 게임좌표 y>0', () => {
    const v = computeJoystickVector(100, 100, 100, 100 - R, R, DZ);
    expect(v.y).toBeCloseTo(1);
    expect(v.x).toBeCloseTo(0);
  });

  it('절반 드래그는 아날로그 크기 ~0.5', () => {
    const v = computeJoystickVector(100, 100, 100 + R * 0.5, 100, R, DZ);
    expect(v.x).toBeCloseTo(0.5);
    expect(v.y).toBeCloseTo(0);
  });

  it('대각선도 길이 1 이하, 오른쪽-위 부호', () => {
    const v = computeJoystickVector(100, 100, 100 + 200, 100 - 200, R, DZ);
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(1.0001);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeGreaterThan(0);
  });
});
```

- [x] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/tests/touch-vector.test.ts`
Expected: FAIL — `Failed to resolve import ... touch-vector` (모듈 없음).

- [x] **Step 3: 최소 구현 작성**

`src/components/TouchControls/touch-vector.ts`:
```ts
export const MAX_RADIUS = 56;
export const DEAD_ZONE = 0.12;

export type JoystickVector = { x: number; y: number };

export function computeJoystickVector(
  originX: number,
  originY: number,
  curX: number,
  curY: number,
  maxRadius: number,
  deadZone: number,
): JoystickVector {
  const dx = curX - originX;
  const dy = curY - originY;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || dist < deadZone * maxRadius) return { x: 0, y: 0 };
  const mag = Math.min(dist, maxRadius) / maxRadius;
  const ux = dx / dist;
  const uy = dy / dist;
  return { x: ux * mag, y: -uy * mag };
}
```

- [x] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/tests/touch-vector.test.ts`
Expected: PASS (6 tests).

- [x] **Step 5: 커밋**

```bash
git add src/components/TouchControls/touch-vector.ts src/tests/touch-vector.test.ts
git commit -m "feat(touch): 조이스틱 벡터 순수 함수 + 단위테스트"
```

---

## Task 2: TouchControls 컴포넌트 + 스타일

**Files:**
- Create: `src/components/TouchControls/TouchControls.tsx`
- Create: `src/components/TouchControls/TouchControls.module.css`
- Test: `src/tests/touch-controls.test.tsx`

**Interfaces:**
- Consumes: `computeJoystickVector`, `MAX_RADIUS`, `DEAD_ZONE` (Task 1).
- Produces: `default export function TouchControls(props: { joystickRef: MutableRefObject<{ x: number; y: number; active: boolean }>; onJump: () => void; enabled: boolean })`.
  - `enabled=false`면 `null` 렌더 + 리스너 미등록.
  - 오른쪽 절반(`clientX > innerWidth/2`) 빈 곳 pointerdown 시 `joystickRef.current`에 `{active:true, x, y}` 기록, pointermove로 갱신, up/cancel로 `{active:false,x:0,y:0}` 리셋.
  - 인터랙티브 타겟(`button, input, textarea, a, select, [data-no-joystick]`)은 양보.
  - 점프 버튼 pointerdown → `onJump()`.

- [x] **Step 1: 실패하는 컴포넌트 스모크 테스트 작성**

`src/tests/touch-controls.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import TouchControls from '../components/TouchControls/TouchControls';

function Harness({ enabled, onJump }: { enabled: boolean; onJump: () => void }) {
  const joystickRef = useRef({ x: 0, y: 0, active: false });
  return <TouchControls joystickRef={joystickRef} onJump={onJump} enabled={enabled} />;
}

describe('TouchControls', () => {
  it('enabled=false 면 아무것도 렌더하지 않는다', () => {
    const { container } = render(<Harness enabled={false} onJump={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('enabled=true 면 점프 버튼을 렌더하고 pointerdown 시 onJump 호출', () => {
    const onJump = vi.fn();
    render(<Harness enabled onJump={onJump} />);
    const btn = screen.getByRole('button', { name: '점프' });
    fireEvent.pointerDown(btn);
    expect(onJump).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/tests/touch-controls.test.tsx`
Expected: FAIL — `Failed to resolve import ... TouchControls`.

- [x] **Step 3: 컴포넌트 구현**

`src/components/TouchControls/TouchControls.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { computeJoystickVector, MAX_RADIUS, DEAD_ZONE } from './touch-vector';
import styles from './TouchControls.module.css';

type JoyRef = MutableRefObject<{ x: number; y: number; active: boolean }>;

export default function TouchControls({
  joystickRef,
  onJump,
  enabled,
}: {
  joystickRef: JoyRef;
  onJump: () => void;
  enabled: boolean;
}) {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const pidRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      pidRef.current = null;
      joystickRef.current.active = false;
      joystickRef.current.x = 0;
      joystickRef.current.y = 0;
    };

    const isInteractive = (t: EventTarget | null) =>
      t instanceof Element &&
      t.closest('button, input, textarea, a, select, [data-no-joystick]');

    const onDown = (e: PointerEvent) => {
      if (pidRef.current !== null) return;
      if (e.clientX <= window.innerWidth / 2) return;
      if (isInteractive(e.target)) return;
      pidRef.current = e.pointerId;
      originRef.current = { x: e.clientX, y: e.clientY };
      joystickRef.current.active = true;
      joystickRef.current.x = 0;
      joystickRef.current.y = 0;
      setBase({ x: e.clientX, y: e.clientY });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pidRef.current) return;
      const o = originRef.current;
      const v = computeJoystickVector(o.x, o.y, e.clientX, e.clientY, MAX_RADIUS, DEAD_ZONE);
      joystickRef.current.x = v.x;
      joystickRef.current.y = v.y;
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${v.x * MAX_RADIUS}px, ${-v.y * MAX_RADIUS}px)`;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pidRef.current) return;
      reset();
      setBase(null);
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      reset();
      setBase(null);
    };
  }, [enabled, joystickRef]);

  if (!enabled) return null;

  return (
    <>
      {base && (
        <div className={styles.joyBase} style={{ left: base.x, top: base.y }}>
          <div ref={knobRef} className={styles.joyKnob} />
        </div>
      )}
      <button
        type="button"
        className={styles.jumpBtn}
        aria-label="점프"
        onPointerDown={(e) => {
          e.preventDefault();
          onJump();
        }}
      >
        ▲
      </button>
    </>
  );
}
```

- [x] **Step 4: 스타일 작성**

`src/components/TouchControls/TouchControls.module.css`:
```css
.joyBase {
  position: fixed;
  width: 112px;
  height: 112px;
  margin-left: -56px;
  margin-top: -56px;
  border-radius: 50%;
  background: rgba(239, 232, 217, 0.07);
  border: 1px solid rgba(239, 232, 217, 0.22);
  z-index: 93;
  pointer-events: none;
  touch-action: none;
}

.joyKnob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 56px;
  height: 56px;
  margin-left: -28px;
  margin-top: -28px;
  border-radius: 50%;
  background: rgba(255, 140, 58, 0.45);
  border: 1px solid rgba(255, 140, 58, 0.7);
}

.jumpBtn {
  position: fixed;
  left: 28px;
  bottom: 40px;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 140, 58, 0.2);
  border: 1px solid rgba(255, 140, 58, 0.6);
  color: rgba(239, 232, 217, 0.9);
  font-size: 22px;
  line-height: 1;
  z-index: 93;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jumpBtn:active {
  background: rgba(255, 140, 58, 0.4);
}
```

- [x] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/tests/touch-controls.test.tsx`
Expected: PASS (2 tests).

- [x] **Step 6: 커밋**

```bash
git add src/components/TouchControls/
git add src/tests/touch-controls.test.tsx
git commit -m "feat(touch): 플로팅 조이스틱 + 점프 버튼 컴포넌트"
```

---

## Task 3: BonfireScene 통합

**Files:**
- Modify: `src/components/BonfireScene/BonfireScene.tsx`
  - `135-154` 부근(ref 선언 구역): `joystickRef` 추가
  - `776-779`: 점프 로직을 `triggerJump`로 추출, keydown에서 호출
  - `798-810`: `joy.active` 분기로 `kx/ky` 대체
  - `pointer: coarse` 감지 effect + state 추가
  - 모닥불 클릭 div 등에 `data-no-joystick`
  - 렌더 트리에 `<TouchControls/>` 추가

**Interfaces:**
- Consumes: `TouchControls` default export (Task 2).

- [x] **Step 1: TouchControls import 추가**

`BonfireScene.tsx` 상단 import 구역에 추가:
```tsx
import TouchControls from '../TouchControls/TouchControls';
```

- [x] **Step 2: joystickRef 선언**

`motionRef` 선언(135-144 부근) 바로 아래에 추가:
```tsx
  const joystickRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
```

- [x] **Step 3: pointer:coarse 감지 추가**

다른 `useState`들 근처(예: `const [headFire, ...]` 부근)에 상태 추가:
```tsx
  const [coarsePointer, setCoarsePointer] = useState(false);
```
그리고 effect 추가(아무 effect 블록 사이, 예: 키보드 effect 위):
```tsx
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarsePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
```

- [x] **Step 4: triggerJump 추출 + 키보드에서 호출**

`useEffect`(754줄, jump.gameState 의존) **밖**, 컴포넌트 본문에 `useCallback` 추가:
```tsx
  const triggerJump = useCallback(() => {
    const m = motionRef.current;
    if (!m.jumping) {
      m.vy = 0.95;
      m.jumping = true;
    }
  }, []);
```
그리고 effect 내부 `onKeyDown`의 점프 블록(776-779)을 교체:
```tsx
      // 기존:
      // if (k === ' ' && !motion.jumping) { motion.vy = 0.95; motion.jumping = true; }
      // 변경:
      if (k === ' ') triggerJump();
```
effect 의존성 배열 `[jump.gameState]` → `[jump.gameState, triggerJump]`로 변경(triggerJump는 `useCallback([])`이라 안정, 재실행 유발 안 함).

- [x] **Step 5: kx/ky 조이스틱 분기**

같은 effect의 RAF 루프 안 `kx/ky` 산출(798-810)을 교체:
```tsx
      let kx = 0;
      let ky = 0;
      const joy = joystickRef.current;
      if (joy.active) {
        kx = joy.x;
        ky = joy.y;
      } else {
        if (motion.keys.has('ArrowLeft')) kx -= 1;
        if (motion.keys.has('ArrowRight')) kx += 1;
        if (motion.keys.has('ArrowUp')) ky += 1;
        if (motion.keys.has('ArrowDown')) ky -= 1;
        if (kx !== 0 && ky !== 0) {
          const k = Math.SQRT1_2;
          kx *= k;
          ky *= k;
        }
      }
```

- [x] **Step 6: 모닥불 클릭에 data-no-joystick 마커**

`onClick={pokeFire}` 가 달린 모닥불 div(1261 부근)에 속성 추가:
```tsx
      data-no-joystick
```
(같은 방식으로, 오른쪽 절반에 걸칠 수 있는 div+onClick 트리거 — 리더보드 구름 `onClick={jump.openLeaderboard}`(1238), 별똥별/달 트리거 div가 `<button>`이 아니라면 — 에도 `data-no-joystick` 추가. `<button>`/`<input>` 요소는 이미 양보되므로 불필요.)

- [x] **Step 7: TouchControls 렌더 추가**

렌더 트리 최상위 컨테이너 안, 마지막 오버레이류 근처(예: `<div className={styles.grain} />` 직전)에 추가:
```tsx
      <TouchControls
        joystickRef={joystickRef}
        onJump={triggerJump}
        enabled={coarsePointer && jump.gameState === 'idle'}
      />
```

- [x] **Step 8: 타입체크 + 단위테스트 + 빌드**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npx vitest run`
Expected: 전체 PASS(기존 29 + touch-vector 6 + touch-controls 2 = 37).

Run: `npx next build`
Expected: 성공.

- [x] **Step 9: 수동 시각검증**

`npm run dev:all` 후 `localhost:3000`을 Chrome DevTools 모바일 에뮬레이션(Device Toolbar, 터치 모드)으로 열어 확인:
1. 오른쪽 절반 빈 곳 드래그 → 조이스틱 베이스/노브 표시 + 캐릭터 그 방향 이동.
2. 살짝 vs 끝까지 드래그 → 속도 차이(아날로그).
3. 왼쪽 점프 버튼 탭 → 점프.
4. 오른쪽 드래그 + 왼쪽 점프 동시(두 손가락) → 이동하며 점프.
5. 채팅 input·전송 버튼·모닥불 탭 → 조이스틱 안 뜨고 원래 동작(양보 확인).
6. 별똥별 시작 → 조이스틱으로 회피 가능. 점프맵(달까지) 시작 → 조이스틱/점프버튼 사라짐.
7. 데스크톱(에뮬레이션 끔, 마우스) → 컨트롤 안 뜸, 키보드 이동 정상.

- [x] **Step 10: 커밋**

```bash
git add src/components/BonfireScene/BonfireScene.tsx
git commit -m "feat(touch): BonfireScene 에 모바일 터치 컨트롤 통합"
```

---

## 문서 업데이트 (마지막)

- [x] 설계 스펙(`docs/superpowers/specs/2026-06-21-mobile-touch-controls-design.md`)의 테스트 계획 수치/구현 현황을 실제와 일치시키고, 이 플랜의 체크박스를 모두 `- [x]`로 갱신.
- [x] AGENTS.md/CLAUDE.md에 터치 컨트롤 관련 추가 설명이 필요하면 반영(불필요하면 생략).

```bash
git add docs/superpowers/
git commit -m "docs: 모바일 터치 컨트롤 구현 반영"
```
