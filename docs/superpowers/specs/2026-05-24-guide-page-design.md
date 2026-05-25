# 이용가이드 페이지 + 햄버거 메뉴 설계

_2026-05-24_

## 개요

신규 방문자가 "어떻게 노는 거지?" 했을 때 한 페이지에서 다 알 수 있는 정적 가이드 페이지(`/guide`)를 만들고, 메인(`/`) 왼쪽 상단 햄버거 메뉴에서 진입할 수 있게 한다. 이스터에그까지 전부 공개(다 까는 버전). SEO 측면에서는 `HowTo` JSON-LD + `BreadcrumbList` + 페이지별 metadata + sitemap 보강으로 검색 유입 잡는다.

## 목적

- 1순위: **How-to (사용법)** — 처음 온 사용자가 채팅/캐릭터 조작/미니게임/이스터에그까지 알 수 있게
- 2순위: 검색 유입 — 한국어 키워드 풍부한 정적 콘텐츠 + 구조화 데이터로 노출

## 라우트 / 파일 구조

```
src/
  app/
    guide/
      page.tsx              # 서버 컴포넌트, 메타데이터 + 정적 JSX
      page.module.css       # 밤하늘 그라데이션 + 모닥불 컬러
  components/
    AppMenu/
      AppMenu.tsx           # 'use client' 햄버거 + 드롭다운
      AppMenu.module.css
    GuideJsonLd/
      GuideJsonLd.tsx       # HowTo + BreadcrumbList JSON-LD
```

- `/guide` 는 100% 정적 서버 컴포넌트 (JS 번들 없음 → SEO/성능 최강)
- `AppMenu` 는 메인 페이지 `src/app/page.tsx` 에 SSR 로 직접 박음 (nav 트리는 SSR, 토글만 클라이언트)

## SEO 인프라

### 페이지 metadata (`src/app/guide/page.tsx`)

```ts
export const metadata: Metadata = {
  title: '이용가이드 — 불멍에서 노는 법',
  description: '익명 채팅, 캐릭터 조작, 별똥별 피하기, 점프맵, 모닥불 이스터에그까지 — 불멍의 모든 사용법을 한 페이지에서.',
  alternates: { canonical: '/guide' },
  openGraph: {
    type: 'article',
    locale: 'ko_KR',
    url: '/guide',
    siteName: '불멍',
    title: '이용가이드 — 불멍에서 노는 법',
    description: '익명 채팅, 캐릭터 조작, 별똥별 피하기, 점프맵, 모닥불 이스터에그까지 — 불멍의 모든 사용법을 한 페이지에서.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, type: 'image/png', alt: '불멍 이용가이드' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '이용가이드 — 불멍에서 노는 법',
    description: '익명 채팅, 캐릭터 조작, 별똥별 피하기, 점프맵, 모닥불 이스터에그까지 — 불멍의 모든 사용법을 한 페이지에서.',
    images: ['/opengraph-image'],
  },
};
```

### sitemap.ts

기존 `/` 한 건에 `/guide` 추가. priority 0.8, changeFrequency `monthly`.

### JSON-LD (페이지 내 inline)

- **HowTo** — 가이드 섹션을 step 으로 매핑. 검색 결과에 단계 리스트 노출 가능.
- **BreadcrumbList** — `홈 > 이용가이드`. 빵부스러기 표시.

루트 layout 의 `JsonLd`(WebApplication + FAQPage) 는 그대로 둠 — 모든 페이지에서 공통.

### 진입 링크

- 메인 페이지 햄버거 메뉴 → `/guide`
- 가이드 페이지 상단/하단에 `← 모닥불로 돌아가기` 링크 (`/`)
- SeoContent(sr-only) 푸터에도 `<a href="/guide">이용가이드</a>` 한 줄 추가 (크롤러용 보조)

## 햄버거 메뉴 (`AppMenu`)

### UX

- 위치: `position: fixed; top: 16px; left: 16px;`
- z-index: BonfireScene 위, 모달들 아래 (예: 50). 게임 진행 중에도 항상 노출.
- 버튼: 모닥불 컬러 3줄 햄버거 아이콘, 반투명 어둑한 원형 배경(`rgba(11,11,16,0.6)`)
- 클릭 시 버튼 바로 아래 **드롭다운 패널** 펼침 (사이드 슬라이드 X)
- 닫힘 트리거: 바깥 클릭, ESC, 메뉴 항목 클릭
- 항목(현재): **이용가이드** → `/guide`
  - 향후 항목 추가될 수 있게 nav `<ul><li><a>` 트리 구조

### 접근성

- `<button aria-label="메뉴" aria-expanded={open} aria-controls="app-menu-panel">`
- 드롭다운 패널 `<nav id="app-menu-panel" hidden={!open}>`
- 키보드: Tab 으로 항목 순회, Enter/Space 로 선택

### 디자인

- 드롭다운 배경: 밤하늘 톤 (`#1a1a2e` 95% opacity, blur 약간)
- 항목 텍스트: `#e8e4dc`, hover 시 모닥불 오렌지 (`#ff8a3d`)
- 모서리 둥글게, 옅은 박스 섀도우

## 가이드 콘텐츠 구조

진실 소스는 **현재 코드**. 메모리/README/기존 SeoContent FAQ stale 부분 있음 (아래 §SeoContent 동시 수정 참조).

### 섹션 구성

1. **인사 + 한 줄 요약** — 불멍이 뭐고 이 페이지가 뭔지
2. **§1 모닥불 옆 채팅** — 한 마디 보내면 군고구마 → 18초 익음 → 카운터 +1. 메시지는 비저장 휘발.
3. **§2 캐릭터 조작 (이스터에그)** — 채팅창 비우면 방향키로 이동, 스페이스바로 점프
4. **§3 모닥불 통과 (이스터에그)** — 모닥불 zone 지나면 머리 위 불꽃 5초
5. **§4 모닥불 클릭 = 불멍가루** — 모닥불 클릭 시 컬러 splash (구리·칼륨·리튬·나트륨 색조) 5초
6. **§5 모닥지기 NPC** — 가끔 채팅 버블로 말 거는 NPC
7. **§6 미니게임: 별똥별 피하기**
   - 진입: 채팅창에 `/별똥별` 입력 **또는 밤하늘 달 클릭**
   - 룰: 떨어지는 별똥별 피하며 생존, 50초마다 별똥별 burst
   - 리더보드: 밤하늘 우측 큰 별(`landmarkStar`) 클릭하면 게임 진입 없이 TOP 10 만 열림
   - 글로벌 TOP 10 리더보드
8. **§7 미니게임: 우주를 줄게 (점프맵)**
   - 진입: 좌측 상단 **열기구 클릭** (명령어 아님 — 기존 FAQ 잘못된 정보 정정)
   - 룰: 위로 끝없이 점프하며 올라감, 8종 발판
   - 리더보드: 열기구 뒤 작은 구름 클릭하면 게임 진입 없이 리더보드만 열림
   - 글로벌 TOP 10 리더보드
9. **§8 자주 묻는 질문** — 기존 SeoContent FAQ 항목 + 위 정정 반영 (`/우주를 줄게` 명령어 표현 제거)

### 마크업

- 각 섹션: `<section>` + `<h2>` + 짧은 본문 `<p>` 1-2개
- 명령어/트리거는 `<kbd>` 또는 `<code>` 로 감싸 가독성
- 모닥불 SVG/이모지 아이콘은 h1 옆 정도 한두 개 (캔버스 X)

## 디자인 토큰

- 배경: `background: radial-gradient(at top, #1a1a2e 0%, #0b0b10 80%);`
- 본문 컨테이너: `max-width: 720px; margin: 0 auto; padding: 64px 24px;`
- h1: 모닥불 오렌지 (`#ff8a3d`), Pretendard 700, 큼
- h2: 모닥불 옅은 앰버 (`#ffb27a`), 600
- 본문: `#e8e4dc`, line-height 1.7
- 링크: 모닥불 오렌지, hover 시 밝아짐
- 폰트는 layout.tsx 에 이미 로드된 Pretendard 사용 (추가 로드 X)

## SeoContent FAQ 동시 수정 (작은 곁가지)

`src/components/SeoContent/SeoContent.tsx` 의 FAQ 한 항목 stale:

> 채팅창에 "/별똥별"을 입력하면 별똥별 피하기 생존 게임, "/우주를 줄게"를 입력하면 위로 끝없이 점프하는 점프맵이 시작됩니다.

→ 정정: `/우주를 줄게` 명령어는 존재하지 않음. 점프맵 진입은 열기구 클릭. 이 텍스트를 정확하게 고치고, `JsonLd.tsx` 의 동일 FAQ schema 항목도 같이 갱신.

## 검증

- `npm run build` 통과 — Next 라우트 등록, metadata 생성, sitemap.xml 에 `/guide` 포함 확인
- 브라우저에서 `/guide` 직접 방문 → 디자인/콘텐츠 확인
- View source 로 HowTo + BreadcrumbList JSON-LD inline 확인
- 모바일 폭(375px) 에서 가독성/햄버거 동작 확인
- Lighthouse SEO 점수 (메인/가이드 둘 다 95+ 목표)
- 햄버거: 바깥 클릭/ESC 닫힘, 게임 중에도 노출

## 비범위 (out of scope)

- 영어 버전 (i18n) — 사이트 자체가 한국어 전용
- 가이드 내 인터랙티브 데모 / 비디오
- 햄버거 메뉴 다국어/추가 항목 (이용가이드 외) — 향후
- 가이드 페이지 자체에 캔버스 씬 재사용 (메인 톤만 약하게 유지하는 B안)
