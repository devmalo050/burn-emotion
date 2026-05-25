# 채팅 UI 가시성 강화 설계

_2026-05-25_

## 개요

채팅 메시지(다른 사람·본인)가 너무 미니멀해서 잘 안 보이는 문제를 해결한다. 구조(우측 피드 + 캐릭터 위 말풍선 두 채널)는 유지하고 시각 강조를 "대폭" 수준으로 올린다. 입력창 자체는 손대지 않는다 (사용자 OK).

## 변경 영역

### 1. 우측 피드 (`.feed` + `.feedItem` + `.feedNick` + `.feedText`)

| 속성 | 현재 | 변경 |
|---|---|---|
| width | 250px | 360px |
| top | 140px | 140px (유지) |
| right | 36px | 36px (유지) |
| 배경 | 없음 | `rgba(11, 11, 16, 0.55)` + `backdrop-filter: blur(8px)` |
| 테두리 | 없음 | 1px `rgba(255, 140, 58, 0.18)` + border-radius 12px |
| padding | 0 | 16px |
| text-align | right | left |
| 표시 갯수 (slice) | 7 | 10 |
| feedNick font | mono 11px | mono 13px (weight 600) |
| feedNick 색 | `rgba(255, 184, 96, 1)` | `#ff9a50` (살짝 진하게) |
| feedText font | 14px (현재 inherits) | 16px, line-height 1.55 |
| feedText 색 | `var(--ink)` | `#f5ede0` (이미 ink 가깝지만 명시) |
| 표시 시간 (TS) | 6500ms | 12000ms |
| 모바일 처리 | `display: none` (≤820px) | 보이게 유지, ≤820px 폭 280px, ≤480px 폭 calc(100vw - 32px) top 80px |
| 헤더 | 없음 | `.feedHeader` 박스 안 최상단 — "모닥불 옆 속삭임" italic stencil 12px 모닥불 컬러 |

### 2. 캐릭터 위 말풍선 (`.silhouetteBubble`)

| 속성 | 현재 | 변경 |
|---|---|---|
| font-size | 11px | 14px |
| line-height | 1.35 | 1.5 |
| padding | 5px 10px | 8px 14px |
| background | `rgba(20, 18, 14, 0.78)` | `rgba(11, 11, 16, 0.85)` (더 진하게) |
| border | 1px `rgba(255, 140, 58, 0.16)` | 1px `rgba(255, 200, 150, 0.3)` (밝게) |
| box-shadow | `0 4px 14px rgba(0, 0, 0, 0.5)` | `0 6px 22px rgba(0, 0, 0, 0.6)` |
| ::after tail size | 5×5 | 7×7 (꼬리 명확) |
| 표시 시간 (TS) | 3000ms | 6000ms |
| CSS animation bubbleOut delay | 2.5s | 5.5s |
| max-width | 220px | 260px |

### 3. 전반 가독성

- `.inputHint` font-size: 9px → 11px, letter-spacing 그대로
- `.inputHint .nick` line-height 22 그대로

### 4. 모바일 (`@media (max-width: 820px)`)

기존: `.feed { display: none; }` 룰 제거. 대신:

```css
@media (max-width: 820px) {
  .feed { width: 280px; top: 100px; right: 16px; padding: 12px; }
  .feedNick { font-size: 12px; }
  .feedText { font-size: 14px; }
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

## 코드 변경 단위

- **CSS**: `src/components/BonfireScene/BonfireScene.module.css` — feed/feedItem/feedNick/feedText/silhouetteBubble/inputHint 블록 + `@media` 블록 + `.feedHeader` 신규
- **TS**: `src/components/BonfireScene/BonfireScene.tsx`
  - setActiveBubbles 의 setTimeout `3000` → `6000`
  - 본인 메시지 fading setTimeout `6500` → `12000`
  - feedMessages slice `(0, 7)` → `(0, 10)`
  - onBroadcast 핸들러의 다른 사람 메시지 fading/제거 시간도 같은 식으로 (있다면 정정)
  - 우측 피드 박스 안 최상단에 `<div className={styles.feedHeader}>모닥불 옆 속삭임</div>` 한 줄 추가

## 검증

- 메인 페이지에서 본인 메시지 보내기 → 캐릭터 위 말풍선 6초, 우측 피드에 들어가 12초 표시
- 다른 사람 메시지(시뮬레이션 어렵다면 본인 메시지 broadcast 받아 두 탭으로) → 우측 피드에 박스 안 정렬 + 헤더 보임
- 데스크탑 1440px / 1024px / 모바일 375px 폭에서 피드 박스 가독성·위치 확인
- 캔버스 미니게임 진입 시에도 박스가 자연스럽게 거기 있는지 (z-index 회귀 없음)

## 비범위

- 입력창(`.inputBar`) 디자인 — 사용자가 OK
- 채팅 메시지 영구 저장 / 채팅 기록 페이지
- 이모지·이미지·파일 첨부
