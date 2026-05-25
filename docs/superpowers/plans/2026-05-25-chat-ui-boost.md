# 채팅 UI 가시성 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우측 피드(다른 사람 메시지)와 캐릭터 위 말풍선(본인/타인 메시지)의 시각 가시성을 대폭 올린다. 구조는 그대로, 박스·테두리·폰트·표시 시간만 강화.

**Architecture:** 단일 컴포넌트(`BonfireScene`)의 CSS module 과 TS 두 핸들러(메시지 수신·전송)만 손봄. 본인/타인 메시지 라이프사이클이 같은 값(`3000ms` bubble, `6500ms` feed fade, `slice(0, 7)`)을 두 핸들러에 중복 작성된 상태 — 이 두 군데를 동시에 갱신.

**Tech Stack:** React 19, CSS Modules, 기존 `setTimeout` 라이프사이클 (state 관리 변경 없음).

**Spec:** [docs/superpowers/specs/2026-05-25-chat-ui-boost-design.md](../specs/2026-05-25-chat-ui-boost-design.md)

---

## File Map

| Action | Path | 책임 |
|---|---|---|
| Modify | `src/components/BonfireScene/BonfireScene.module.css` | `.feed` 박스화, `.feedHeader` 추가, `.feedNick`/`.feedText` 크기·색, `.silhouetteBubble` 강화, `.inputHint` 폰트, 모바일 미디어 |
| Modify | `src/components/BonfireScene/BonfireScene.tsx` | 두 핸들러(receiveMessage:275-303, submit:916-966)의 setTimeout 값/slice 값 갱신, JSX 에 `<div className={styles.feedHeader}>` 추가 |

---

## Task 1: 우측 피드 박스화 + 헤더 + 타이밍

**Files:**
- Modify: `src/components/BonfireScene/BonfireScene.module.css` (`.feed`, `.feedHeader`(신규), `.feedItem`, `.feedNick`, `.feedText`, `@media` 두 군데)
- Modify: `src/components/BonfireScene/BonfireScene.tsx` (두 핸들러의 slice·setTimeout, JSX 피드 박스 안 헤더 1줄 추가)

- [ ] **Step 1: CSS 의 `.feed` 블록을 박스화**

`src/components/BonfireScene/BonfireScene.module.css` 의 기존 `.feed`(line 471~) 와 그 형제들을 다음으로 교체:

```css
.feed {
  position: absolute;
  top: 140px;
  right: 36px;
  width: 360px;
  z-index: 15;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 280px);
  overflow: hidden;
  text-align: left;
  padding: 16px;
  background: rgba(11, 11, 16, 0.55);
  border: 1px solid rgba(255, 140, 58, 0.18);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.feedHeader {
  font-family: var(--font-stencil);
  font-size: 12px;
  letter-spacing: 0.16em;
  font-weight: 400;
  font-style: italic;
  color: rgba(255, 154, 80, 0.9);
  margin-bottom: 4px;
  pointer-events: none;
}
.feedItem {
  font-family: var(--font-kr);
  color: #f5ede0;
  animation: feedIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.feedItem.fading { animation: feedOut 0.5s ease-in forwards; }
.feedNick {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #ff9a50;
  margin-bottom: 3px;
}
.feedText {
  font-family: var(--font-kr);
  font-size: 16px;
  line-height: 1.55;
  letter-spacing: -0.005em;
  color: #f5ede0;
}
```

(기존 `.feedItem` 에 `text-shadow: 0 1px 6px rgba(0,0,0,0.85)` 가 있었는데, 박스 배경이 생기면서 더 이상 안 필요. 위 교체본에서 제거됨.)

- [ ] **Step 2: 모바일 미디어 쿼리 갱신**

같은 파일의 `@media (max-width: 820px)` 블록을 찾아 `.feed { display: none; }` 줄을 다음으로 교체하고, 480px 쿼리는 신규 추가:

```css
@media (max-width: 820px) {
  .feed {
    width: 280px;
    top: 100px;
    right: 16px;
    padding: 12px;
    gap: 10px;
  }
  .feedHeader { font-size: 11px; }
  .feedNick { font-size: 12px; }
  .feedText { font-size: 14px; }
  .header { padding: 12px 18px; flex-wrap: wrap; gap: 12px; }
  .meta { gap: 8px; }
  .meta-card { padding: 6px 10px; min-width: 70px; }
  .meta-value { font-size: 13px; }
  .brand-title { font-size: 22px; }
  .silhouettes { width: 100%; }
}
@media (max-width: 480px) {
  .feed {
    top: 72px;
    right: 16px;
    left: 16px;
    width: auto;
    max-height: 40vh;
  }
}
```

(기존 `@media (max-width: 820px)` 블록은 한 곳에 모여 있음 — 그 안의 `.feed { display: none; }` 줄만 위처럼 풀어주고 나머지(`.header`, `.meta`, ...)는 보존.)

- [ ] **Step 3: TS 의 두 핸들러에서 slice 와 timeout 갱신**

`src/components/BonfireScene/BonfireScene.tsx` 의 두 군데를 각각 정정:

**(A) receiveMessage 핸들러 (line ~275~)**

Before:
```ts
        }, 3000);
      }

      setFeedMessages((prev) => [msg, ...prev].slice(0, 7));
      setTimeout(() => spawnPotatoAtFire(msg), 150 + Math.random() * 250);
      setTimeout(() => {
        setFeedMessages((prev) => prev.map((x) => (x.id === id ? { ...x, fading: true } : x)));
        setTimeout(
          () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
          400,
        );
      }, 6500);
```

After:
```ts
        }, 6000);
      }

      setFeedMessages((prev) => [msg, ...prev].slice(0, 10));
      setTimeout(() => spawnPotatoAtFire(msg), 150 + Math.random() * 250);
      setTimeout(() => {
        setFeedMessages((prev) => prev.map((x) => (x.id === id ? { ...x, fading: true } : x)));
        setTimeout(
          () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
          400,
        );
      }, 12000);
```

**(B) submit 핸들러 (line ~916~)**

Before:
```ts
        }, 3000);
      }
      setFeedMessages((prev) => [{ ...msg, nick: msg.nick + ' (나)' }, ...prev].slice(0, 7));
```

After:
```ts
        }, 6000);
      }
      setFeedMessages((prev) => [{ ...msg, nick: msg.nick + ' (나)' }, ...prev].slice(0, 10));
```

같은 핸들러의 fading setTimeout 도:

Before:
```ts
      setTimeout(() => {
        setFeedMessages((prev) => prev.map((x) => (x.id === id ? { ...x, fading: true } : x)));
        setTimeout(
          () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
          400,
        );
      }, 6500);
```

After:
```ts
      setTimeout(() => {
        setFeedMessages((prev) => prev.map((x) => (x.id === id ? { ...x, fading: true } : x)));
        setTimeout(
          () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
          400,
        );
      }, 12000);
```

- [ ] **Step 4: JSX 에 피드 헤더 1줄 추가**

같은 파일의 JSX 에서 `<div className={styles.feed}>` 바로 안 최상단에 헤더 한 줄 추가:

Before:
```tsx
      {/* Side feed — quiet whispers heard around the fire */}
      <div className={styles.feed}>
        {feedMessages.map((m) => (
```

After:
```tsx
      {/* Side feed — quiet whispers heard around the fire */}
      <div className={styles.feed}>
        <div className={styles.feedHeader}>모닥불 옆 속삭임</div>
        {feedMessages.map((m) => (
```

- [ ] **Step 5: 테스트 + 시각 확인**

Run: `npm test`
Expected: `Tests  14 passed (14)` (이 작업은 기존 테스트와 무관, PASS 유지)

`npm run dev:all` 떠 있는 상태에서 브라우저:
- `http://localhost:3000` → 우측 상단에 다크 박스 + "모닥불 옆 속삭임" 헤더가 보임
- 채팅 한 마디 입력 → 피드에 들어와 12초간 유지되고 사라짐
- 데스크탑 1280px / 모바일 375px(DevTools) 둘 다 박스 깨지지 않음

- [ ] **Step 6: Commit**

```bash
git add src/components/BonfireScene/BonfireScene.module.css src/components/BonfireScene/BonfireScene.tsx
git commit -m "feat(chat): 우측 피드 박스화 + 헤더 + 표시 시간 12s · 슬롯 10개"
```

---

## Task 2: 캐릭터 위 말풍선 + inputHint 폰트 강화

**Files:**
- Modify: `src/components/BonfireScene/BonfireScene.module.css` (`.silhouetteBubble`, `.silhouetteBubble::after`, `.inputHint`)

- [ ] **Step 1: `.silhouetteBubble` 강화**

`src/components/BonfireScene/BonfireScene.module.css` 의 기존 `.silhouetteBubble`(line 245~) 와 `::after`(line 274~) 를 다음으로 교체:

```css
.silhouetteBubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 34px;
  font-family: var(--font-kr);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: -0.005em;
  line-height: 1.5;
  color: rgba(244, 237, 224, 0.98);
  background: rgba(11, 11, 16, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 200, 150, 0.3);
  border-radius: 8px;
  padding: 8px 14px;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: break-word;
  max-width: 260px;
  text-align: center;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  animation: bubbleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1),
             bubbleOut 0.5s ease-in 5.5s forwards;
  z-index: 14;
}
.silhouetteBubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 7px;
  height: 7px;
  background: rgba(11, 11, 16, 0.85);
  border-right: 1px solid rgba(255, 200, 150, 0.3);
  border-bottom: 1px solid rgba(255, 200, 150, 0.3);
  transform: translateX(-50%) rotate(45deg);
}
```

(핵심 변경: `font-size 11→14`, `line-height 1.35→1.5`, `padding 5/10→8/14`, `background 0.78→0.85`, `border-color 모닥불 옅음→밝은 살구`, `border-radius 7→8`, `max-width 220→260`, `box-shadow 강화`, `tail 5→7px`, `bubbleOut delay 2.5s→5.5s`.)

- [ ] **Step 2: `.inputHint` 폰트 살짝 키우기**

같은 파일의 `.inputHint`(line 399~) 의 `font-size: 9px;` 만 `11px` 로 교체. 다른 속성은 그대로:

Before:
```css
.inputHint {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  ...
}
```

After:
```css
.inputHint {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  ...
}
```

(letter-spacing/색/display 등 다른 줄은 그대로.)

- [ ] **Step 3: 테스트 + 시각 확인**

Run: `npm test`
Expected: `Tests  14 passed (14)`

브라우저:
- 채팅 보내기 → 자기 캐릭터 위 말풍선이 더 큰 글자/진한 배경/명확한 꼬리로 6초간 떠 있음
- 입력창 아래 닉네임/토글 아이콘 줄이 살짝 더 읽기 좋음
- 모바일 폭에서도 말풍선 깨지지 않음

- [ ] **Step 4: Commit**

```bash
git add src/components/BonfireScene/BonfireScene.module.css
git commit -m "feat(chat): 캐릭터 위 말풍선 강화 + inputHint 11px"
```

---

## Task 3: 통합 시각 회귀 검증

코드 수정 없음.

- [ ] **Step 1: 전체 lint·test·build**

Run: `npm test && npm run build`
Expected: 테스트 14/14, build 통과 (lint 는 기존 React 19 hooks 룰 위반이 있어 무시하기로 합의됨)

- [ ] **Step 2: 데스크탑 시각 회귀**

`http://localhost:3000` 1280×800:
- 우측 박스 + 헤더 정상 노출, 캔버스 모닥불/별/캐릭터 회귀 없음
- 메시지 보내고 12초 유지 확인
- 캐릭터 위 말풍선 6초 + 큰 글자 + 진한 배경 확인
- 햄버거 메뉴/열기구/구름 클릭 회귀 없음

- [ ] **Step 3: 모바일 시각 회귀**

DevTools 375×667:
- 우측 박스가 화면 위쪽 좌우 마진 16 으로 정렬되어 보임 (480 이하 룰)
- 메시지 가독성 확인
- 캐릭터/모닥불 캔버스 그대로

- [ ] **Step 4: 미니게임 회귀**

달 클릭 → 별똥별 게임, 열기구 클릭 → 점프맵: 게임 진행 중 우측 박스가 자연스럽게 같이 있는지 (z-index 50 햄버거 / 25 입력창 / 15 피드 박스 / 14 말풍선 → 박스가 미니게임 오버레이 아래로 들어가는지 visually 확인)

검증 통과면 단위 커밋 외 추가 커밋 없음.

---

## Self-Review

**Spec coverage**
- 우측 피드 크기/배경/테두리/표시 시간/슬롯/정렬/헤더 → Task 1
- 캐릭터 위 말풍선 폰트/배경/테두리/그림자/타이밍/꼬리 → Task 2
- inputHint 폰트 → Task 2
- 모바일 미디어 (820, 480) → Task 1
- 회귀 검증 → Task 3

**Placeholder scan**
- TBD/TODO/"~ 그대로" 같은 모호 표현 없음. 모든 step 에 실제 코드 또는 명확한 액션.

**Type consistency**
- `setActiveBubbles`/`setFeedMessages` 등 식별자 코드와 1:1 매칭. setTimeout 인자 값과 CSS `bubbleOut delay 5.5s` 가 일치(6000ms ≈ 5500ms delay + 500ms animation duration).

**시각 변경이라 unit test 없음**
- TDD 표준 패턴은 시각 변경에 적용 어려움. build/test 통과 + 수동 시각 검증 두 축으로 대체. 기존 14 테스트는 회귀 가드로 작동.
