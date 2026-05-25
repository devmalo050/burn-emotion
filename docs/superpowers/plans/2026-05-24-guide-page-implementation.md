# 이용가이드 페이지 + 햄버거 메뉴 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/guide` 정적 페이지를 만들고 메인 페이지 좌상단 햄버거 메뉴에서 진입할 수 있게 한다. SEO 인프라(metadata, HowTo/BreadcrumbList JSON-LD, sitemap) 동시 강화 + 기존 FAQ stale 부분 정정.

**Architecture:** 모든 콘텐츠는 SSR 정적. `/guide` 는 서버 컴포넌트 (JS 번들 0), `AppMenu` 만 toggle 위해 'use client'. 가이드 페이지에 인라인 `HowTo` + `BreadcrumbList` JSON-LD 추가. 메인의 `FAQPage` schema 와 `SeoContent` 의 stale 한 미니게임 진입 설명(`/우주를 줄게` 잘못된 명령어) 같이 정정.

**Tech Stack:** Next 16 App Router, React 19 server/client components, CSS Modules, Vitest + @testing-library/react (jsdom).

**Spec:** [docs/superpowers/specs/2026-05-24-guide-page-design.md](../specs/2026-05-24-guide-page-design.md)

---

## File Map

| Action | Path | 책임 |
|---|---|---|
| Modify | `src/components/SeoContent/SeoContent.tsx` | FAQ stale 정정 + footer `/guide` 링크 |
| Modify | `src/components/JsonLd/JsonLd.tsx` | FAQPage schema stale 정정 |
| Create | `src/components/AppMenu/AppMenu.tsx` | 햄버거 + 드롭다운 토글 (클라) |
| Create | `src/components/AppMenu/AppMenu.module.css` | 햄버거 스타일 |
| Create | `src/tests/app-menu.test.tsx` | 토글/ESC/aria 테스트 |
| Modify | `src/app/page.tsx` | `<AppMenu />` 박기 |
| Create | `src/components/GuideJsonLd/GuideJsonLd.tsx` | HowTo + BreadcrumbList JSON-LD |
| Create | `src/app/guide/page.tsx` | 가이드 서버 컴포넌트 + metadata |
| Create | `src/app/guide/page.module.css` | 가이드 페이지 스타일 |
| Modify | `src/app/sitemap.ts` | `/guide` 추가 |

---

## Task 1: FAQ stale 정정 (SeoContent + JsonLd)

**Why first:** 가이드 페이지가 참조할 진실 소스 먼저 일치시킴. 가이드와 FAQ schema 가 모순되면 안 됨.

**Files:**
- Modify: `src/components/SeoContent/SeoContent.tsx`
- Modify: `src/components/JsonLd/JsonLd.tsx`

- [ ] **Step 1: SeoContent FAQ 항목 정정**

`src/components/SeoContent/SeoContent.tsx` 의 다음 `<dd>` 를 찾아서:

```tsx
<dd>채팅창에 &quot;/별똥별&quot;을 입력하면 별똥별 피하기 생존 게임, &quot;/우주를 줄게&quot;를 입력하면 위로 끝없이 점프하는 점프맵이 시작됩니다. 각각 글로벌 TOP 10 리더보드가 있습니다.</dd>
```

다음으로 교체:

```tsx
<dd>채팅창에 &quot;/별똥별&quot;을 입력하거나 밤하늘의 달을 클릭하면 별똥별 피하기 생존 게임이 시작됩니다. 좌측 상단의 열기구를 클릭하면 &quot;우주를 줄게&quot; 점프맵이 시작됩니다. 각각 글로벌 TOP 10 리더보드가 있습니다.</dd>
```

- [ ] **Step 2: JsonLd FAQ schema 같은 항목 정정**

`src/components/JsonLd/JsonLd.tsx` 의 마지막 mainEntity Question 의 `text` 를 같은 내용으로 교체:

```ts
{
  '@type': 'Question',
  name: '숨겨진 미니게임은 뭔가요?',
  acceptedAnswer: {
    '@type': 'Answer',
    text: '채팅창에 "/별똥별"을 입력하거나 밤하늘의 달을 클릭하면 별똥별 피하기 생존 게임이 시작됩니다. 좌측 상단의 열기구를 클릭하면 "우주를 줄게" 점프맵이 시작됩니다. 각각 글로벌 TOP 10 리더보드가 있습니다.',
  },
},
```

- [ ] **Step 3: lint + 기존 테스트 통과 확인**

Run: `npm run lint && npm test`
Expected: PASS (변경이 텍스트뿐이라 기존 테스트 영향 없음)

- [ ] **Step 4: Commit**

```bash
git add src/components/SeoContent/SeoContent.tsx src/components/JsonLd/JsonLd.tsx
git commit -m "fix(seo): 미니게임 진입 설명 정정 (점프맵은 명령어 아님)"
```

---

## Task 2: AppMenu 컴포넌트 (TDD)

**Files:**
- Create: `src/components/AppMenu/AppMenu.tsx`
- Create: `src/components/AppMenu/AppMenu.module.css`
- Create: `src/tests/app-menu.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/tests/app-menu.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppMenu } from '@/components/AppMenu/AppMenu';

describe('AppMenu', () => {
  it('초기에는 닫혀 있음 (aria-expanded=false)', () => {
    render(<AppMenu />);
    const button = screen.getByRole('button', { name: '메뉴' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('버튼 클릭 시 펼침 + 이용가이드 링크 노출', () => {
    render(<AppMenu />);
    const button = screen.getByRole('button', { name: '메뉴' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const link = screen.getByRole('link', { name: '이용가이드' });
    expect(link).toHaveAttribute('href', '/guide');
  });

  it('ESC 키로 닫힘', () => {
    render(<AppMenu />);
    const button = screen.getByRole('button', { name: '메뉴' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('한 번 더 누르면 닫힘 (토글)', () => {
    render(<AppMenu />);
    const button = screen.getByRole('button', { name: '메뉴' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run src/tests/app-menu.test.tsx`
Expected: FAIL — `Cannot find module '@/components/AppMenu/AppMenu'`

- [ ] **Step 3: AppMenu 구현**

Create `src/components/AppMenu/AppMenu.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './AppMenu.module.css';

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        aria-label="메뉴"
        aria-expanded={open}
        aria-controls="app-menu-panel"
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </button>
      <nav
        id="app-menu-panel"
        className={styles.panel}
        hidden={!open}
        aria-hidden={!open}
      >
        <ul className={styles.list}>
          <li>
            <Link href="/guide" className={styles.item} onClick={() => setOpen(false)}>
              이용가이드
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: CSS 작성**

Create `src/components/AppMenu/AppMenu.module.css`:

```css
.wrapper {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 50;
}

.button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 138, 61, 0.3);
  background: rgba(11, 11, 16, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.button:hover {
  background: rgba(11, 11, 16, 0.78);
  border-color: rgba(255, 138, 61, 0.55);
}

.button:focus-visible {
  outline: 2px solid #ff8a3d;
  outline-offset: 2px;
}

.bar {
  display: block;
  width: 20px;
  height: 2px;
  background: #ff8a3d;
  border-radius: 1px;
}

.panel {
  position: absolute;
  top: 52px;
  left: 0;
  min-width: 180px;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 138, 61, 0.2);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  padding: 6px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.item {
  display: block;
  padding: 10px 14px;
  border-radius: 6px;
  color: #e8e4dc;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease;
}

.item:hover,
.item:focus-visible {
  background: rgba(255, 138, 61, 0.12);
  color: #ff8a3d;
  outline: none;
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `npx vitest run src/tests/app-menu.test.tsx`
Expected: PASS — 4 tests passed

- [ ] **Step 6: Commit**

```bash
git add src/components/AppMenu/AppMenu.tsx src/components/AppMenu/AppMenu.module.css src/tests/app-menu.test.tsx
git commit -m "feat(ui): 좌상단 햄버거 메뉴 컴포넌트 (드롭다운 + ESC/외부 클릭 닫힘)"
```

---

## Task 3: 메인 page.tsx 에 AppMenu 박기

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: AppMenu 렌더 추가**

`src/app/page.tsx` 전체를 다음으로 교체:

```tsx
import { AppMenu } from '@/components/AppMenu/AppMenu';
import BonfireSceneClient from '@/components/BonfireScene/BonfireSceneClient';
import { JsonLd } from '@/components/JsonLd/JsonLd';
import { SeoContent } from '@/components/SeoContent/SeoContent';

export default function Page() {
  return (
    <>
      <JsonLd />
      <SeoContent />
      <AppMenu />
      <BonfireSceneClient />
    </>
  );
}
```

- [ ] **Step 2: 빌드 + 기존 테스트 통과 확인**

Run: `npm run lint && npm test`
Expected: PASS

- [ ] **Step 3: 수동 시각 검증**

Run dev: `npm run dev:all` (이미 떠 있으면 스킵)
브라우저로 `http://localhost:3000` 방문 → 좌상단 햄버거 보이는지, 클릭 시 "이용가이드" 드롭다운 뜨는지, ESC/바깥 클릭으로 닫히는지 확인.
(가이드 페이지는 아직 없으므로 클릭 시 404 — 정상)

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(scene): 메인 페이지에 햄버거 메뉴 노출"
```

---

## Task 4: GuideJsonLd 컴포넌트 (HowTo + BreadcrumbList)

**Files:**
- Create: `src/components/GuideJsonLd/GuideJsonLd.tsx`

- [ ] **Step 1: 컴포넌트 작성**

Create `src/components/GuideJsonLd/GuideJsonLd.tsx`:

```tsx
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://burn-emotion.vercel.app';

const howTo = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: '불멍 이용가이드 — 모닥불 옆 채팅 사용법',
  description: '익명 채팅부터 캐릭터 조작, 미니게임, 모닥불 이스터에그까지 단계별 사용법.',
  inLanguage: 'ko-KR',
  step: [
    {
      '@type': 'HowToStep',
      name: '모닥불 옆 채팅',
      text: '채팅창에 한 마디 보내면 모닥불 위에 군고구마 한 알이 생기고 약 18초 동안 천천히 익어 사라집니다. 다 익으면 오늘의 카운터가 +1 됩니다. 메시지는 어디에도 저장되지 않습니다.',
      url: `${SITE_URL}/guide#chat`,
    },
    {
      '@type': 'HowToStep',
      name: '캐릭터 조작',
      text: '채팅창을 비우고 방향키를 누르면 본인 캐릭터가 모닥불 옆을 걸어다닙니다. 스페이스바를 누르면 점프합니다.',
      url: `${SITE_URL}/guide#character`,
    },
    {
      '@type': 'HowToStep',
      name: '모닥불 통과 = 머리 위 불꽃',
      text: '캐릭터가 모닥불 zone 안을 통과하면 머리 위에 작은 불꽃이 5초 동안 따라다닙니다.',
      url: `${SITE_URL}/guide#headfire`,
    },
    {
      '@type': 'HowToStep',
      name: '모닥불 클릭 = 불멍가루',
      text: '모닥불을 클릭하면 컬러 불꽃이 5초간 일렁입니다. 구리·칼륨·리튬·나트륨 등 실제 컬러플레임 분말의 색조를 흉내냅니다.',
      url: `${SITE_URL}/guide#powder`,
    },
    {
      '@type': 'HowToStep',
      name: '미니게임 — 별똥별 피하기',
      text: '채팅창에 "/별똥별"을 입력하거나 밤하늘의 달을 클릭하면 시작됩니다. 떨어지는 별똥별을 피하며 생존, 50초마다 별똥별 다발이 쏟아집니다. 글로벌 TOP 10 리더보드.',
      url: `${SITE_URL}/guide#meteor`,
    },
    {
      '@type': 'HowToStep',
      name: '미니게임 — 우주를 줄게 (점프맵)',
      text: '좌측 상단의 열기구를 클릭하면 위로 끝없이 점프하는 점프맵이 시작됩니다. 8종 발판 메커니즘이 있고 글로벌 TOP 10 리더보드가 붙어 있습니다.',
      url: `${SITE_URL}/guide#jump`,
    },
  ],
};

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: '홈',
      item: SITE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: '이용가이드',
      item: `${SITE_URL}/guide`,
    },
  ],
};

export function GuideJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit** (가이드 페이지 작업에서 같이 import 할 거라 단일 커밋도 가능하나, 단위 분리)

```bash
git add src/components/GuideJsonLd/GuideJsonLd.tsx
git commit -m "feat(seo): 가이드 페이지용 HowTo + BreadcrumbList JSON-LD"
```

---

## Task 5: `/guide` 페이지 + 스타일

**Files:**
- Create: `src/app/guide/page.tsx`
- Create: `src/app/guide/page.module.css`

- [ ] **Step 1: 페이지 컴포넌트 작성**

Create `src/app/guide/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideJsonLd } from '@/components/GuideJsonLd/GuideJsonLd';
import styles from './page.module.css';

const TITLE = '이용가이드 — 불멍에서 노는 법';
const DESCRIPTION =
  '익명 채팅, 캐릭터 조작, 별똥별 피하기, 점프맵, 모닥불 이스터에그까지 — 불멍의 모든 사용법을 한 페이지에서.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/guide' },
  openGraph: {
    type: 'article',
    locale: 'ko_KR',
    url: '/guide',
    siteName: '불멍',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: '불멍 이용가이드',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
};

export default function GuidePage() {
  return (
    <main className={styles.page}>
      <GuideJsonLd />
      <div className={styles.container}>
        <nav className={styles.topNav} aria-label="페이지 이동">
          <Link href="/" className={styles.backLink}>
            ← 모닥불로 돌아가기
          </Link>
        </nav>

        <header className={styles.header}>
          <h1 className={styles.h1}>
            <span aria-hidden="true">🔥 </span>
            불멍에서 노는 법
          </h1>
          <p className={styles.lede}>
            모닥불 옆에 앉아 한 마디 던지고, 캐릭터를 움직이고, 숨겨진 미니게임까지.
            처음 왔다면 이 페이지 한 번 훑어보면 다 알아요.
          </p>
        </header>

        <section id="chat" className={styles.section}>
          <h2 className={styles.h2}>1. 모닥불 옆 채팅</h2>
          <p>
            화면 아래 채팅창에 한 마디 보내면 모닥불 위에 군고구마 한 알이 생기고
            <strong> 약 18초 동안 </strong>천천히 익어 갈라집니다. 다 익으면 사라지고
            오늘 구워진 고구마 카운터가 +1 됩니다.
          </p>
          <p>
            메시지는 어디에도 저장되지 않아요. 새로고침하거나 사이트를 떠나면 모두
            사라집니다. 닉네임은 들어오는 순간 무작위로 만들어지고 로그인은 필요하지 않아요.
          </p>
        </section>

        <section id="character" className={styles.section}>
          <h2 className={styles.h2}>2. 캐릭터 조작 (이스터에그)</h2>
          <p>
            채팅창을 비우고 <kbd>방향키</kbd>를 누르면 본인 캐릭터가 모닥불 옆을
            걸어다닙니다. <kbd>Space</kbd>를 누르면 점프해요. 다른 접속자들 캐릭터
            움직임도 실시간으로 보입니다.
          </p>
        </section>

        <section id="headfire" className={styles.section}>
          <h2 className={styles.h2}>3. 모닥불 통과 = 머리 위 불꽃</h2>
          <p>
            캐릭터가 모닥불 zone 안을 지나가면 머리 위에 작은 불꽃이 5초 동안
            따라다닙니다. 다른 사람한테도 보여요.
          </p>
        </section>

        <section id="powder" className={styles.section}>
          <h2 className={styles.h2}>4. 모닥불 클릭 = 불멍가루</h2>
          <p>
            모닥불을 마우스로 클릭하면 컬러 불꽃이 5초간 일렁입니다. 구리·칼륨·리튬·나트륨
            등 실제 컬러플레임 분말의 색조를 흉내낸 효과예요. 같이 접속한 사람들에게도
            broadcast 됩니다.
          </p>
        </section>

        <section id="bonfirekeeper" className={styles.section}>
          <h2 className={styles.h2}>5. 모닥지기 NPC</h2>
          <p>
            가끔 모닥지기라는 NPC가 채팅 버블로 말을 겁니다. 답할 필요는 없어요.
            그냥 흘려들으면 됩니다.
          </p>
        </section>

        <section id="meteor" className={styles.section}>
          <h2 className={styles.h2}>6. 미니게임 — 별똥별 피하기</h2>
          <p>
            <strong>진입:</strong> 채팅창에 <code>/별똥별</code>을 입력하거나
            밤하늘의 <strong>달</strong>을 클릭하세요.
          </p>
          <p>
            <strong>룰:</strong> 떨어지는 별똥별을 피하면서 최대한 오래 버티는 생존 게임.
            50초마다 별똥별 다발이 한꺼번에 쏟아져요. 캐릭터 이동은
            방향키, 점프는 <kbd>Space</kbd>.
          </p>
          <p>
            <strong>리더보드:</strong> 밤하늘 우측에 박힌 큰 별을 클릭하면 게임을
            시작하지 않고 글로벌 TOP 10 만 볼 수 있어요.
          </p>
        </section>

        <section id="jump" className={styles.section}>
          <h2 className={styles.h2}>7. 미니게임 — 우주를 줄게 (점프맵)</h2>
          <p>
            <strong>진입:</strong> 좌측 상단에 떠 있는 <strong>열기구</strong>를 클릭하세요.
            (채팅 명령어 아닙니다.)
          </p>
          <p>
            <strong>룰:</strong> 통나무판·재가 된 발판·떠다니는 통나무·사슬 그네·상하 리프트·
            금속 코일(스프링)·달궈진 철망(즉사)·깎인 통나무(밂) 등 8종 발판을 밟으며
            위로 끝없이 올라가는 점프맵.
          </p>
          <p>
            <strong>리더보드:</strong> 열기구 뒤 작은 구름을 클릭하면 게임 진입 없이
            글로벌 TOP 10 만 열립니다.
          </p>
        </section>

        <section id="faq" className={styles.section}>
          <h2 className={styles.h2}>자주 묻는 질문</h2>
          <dl className={styles.faq}>
            <dt>메시지가 저장되나요?</dt>
            <dd>
              아니요. 메시지는 broadcast 로만 흐르고 데이터베이스에 저장되지 않습니다.
              새로고침하거나 사이트를 떠나면 모두 사라집니다.
            </dd>

            <dt>로그인 없이 쓸 수 있나요?</dt>
            <dd>
              네. 들어오는 순간 무작위로 한국어 닉네임이 만들어지고 그대로 모닥불 옆 자리에 앉습니다.
            </dd>

            <dt>욕을 써도 되나요?</dt>
            <dd>
              네. 감정을 거칠게 털어놓는 공간으로 설계되어 있어 별도의 욕설 필터를 두지 않았습니다.
            </dd>

            <dt>비용이 드나요?</dt>
            <dd>무료입니다. 광고도 없습니다.</dd>
          </dl>
        </section>

        <nav className={styles.bottomNav} aria-label="페이지 이동">
          <Link href="/" className={styles.backLink}>
            ← 모닥불로 돌아가기
          </Link>
        </nav>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 스타일 작성**

Create `src/app/guide/page.module.css`:

```css
.page {
  min-height: 100vh;
  background: radial-gradient(at top, #1a1a2e 0%, #0b0b10 80%);
  color: #e8e4dc;
  font-family:
    'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 24px 96px;
}

.topNav {
  margin-bottom: 36px;
}

.bottomNav {
  margin-top: 56px;
  padding-top: 28px;
  border-top: 1px solid rgba(255, 138, 61, 0.15);
}

.backLink {
  color: #ff8a3d;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s ease;
}

.backLink:hover {
  color: #ffb27a;
}

.header {
  margin-bottom: 48px;
}

.h1 {
  margin: 0 0 16px;
  font-size: 36px;
  font-weight: 700;
  color: #ff8a3d;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.lede {
  margin: 0;
  font-size: 17px;
  line-height: 1.7;
  color: #c8c4bc;
}

.section {
  margin-bottom: 44px;
}

.h2 {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 600;
  color: #ffb27a;
  letter-spacing: -0.01em;
}

.section p {
  margin: 0 0 12px;
  font-size: 16px;
  line-height: 1.75;
}

.section strong {
  color: #f5e9d8;
  font-weight: 600;
}

.section code,
.section kbd {
  display: inline-block;
  padding: 1px 8px;
  margin: 0 2px;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
  font-size: 0.9em;
  background: rgba(255, 138, 61, 0.12);
  border: 1px solid rgba(255, 138, 61, 0.25);
  border-radius: 4px;
  color: #ffb27a;
}

.faq {
  margin: 0;
}

.faq dt {
  margin-top: 18px;
  font-weight: 600;
  color: #f5e9d8;
}

.faq dt:first-child {
  margin-top: 0;
}

.faq dd {
  margin: 6px 0 0;
  padding-left: 0;
  font-size: 15px;
  line-height: 1.7;
  color: #c8c4bc;
}

@media (max-width: 480px) {
  .container {
    padding: 40px 18px 72px;
  }
  .h1 {
    font-size: 28px;
  }
  .h2 {
    font-size: 19px;
  }
  .lede {
    font-size: 15px;
  }
}
```

- [ ] **Step 3: 빌드 통과 확인**

Run: `npm run lint && npm run build`
Expected: PASS, build 출력에 `/guide` 라우트 포함

- [ ] **Step 4: 수동 시각 검증**

`npm run dev:all` 띄워두고 브라우저로 `http://localhost:3000/guide` 직접 방문 →
- 밤하늘 톤 배경 + 모닥불 오렌지 강조 보이는지
- 모든 섹션 (1~7 + FAQ) 노출
- `← 모닥불로 돌아가기` 링크 동작
- 모바일 폭(375px DevTools) 가독성

브라우저 "페이지 소스 보기" 로:
- `<title>이용가이드 — 불멍에서 노는 법 · 불멍</title>` 확인
- `<script type="application/ld+json">` 안에 `"@type":"HowTo"` 와 `"@type":"BreadcrumbList"` 둘 다 inline 으로 들어 있는지 확인

- [ ] **Step 5: 메인 햄버거에서 가이드 진입 동작 확인**

`http://localhost:3000` 햄버거 → 이용가이드 클릭 → `/guide` 로 이동 → 가이드에서 `← 모닥불로 돌아가기` 클릭 → `/` 로 복귀.

- [ ] **Step 6: Commit**

```bash
git add src/app/guide/page.tsx src/app/guide/page.module.css
git commit -m "feat(guide): /guide 이용가이드 페이지 (정적 SSR + HowTo JSON-LD)"
```

---

## Task 6: sitemap + SeoContent footer 링크

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/components/SeoContent/SeoContent.tsx`

- [ ] **Step 1: sitemap.ts 에 /guide 추가**

`src/app/sitemap.ts` 전체를 교체:

```ts
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://burn-emotion.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/guide`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
```

- [ ] **Step 2: SeoContent footer 에 /guide 링크 추가**

`src/components/SeoContent/SeoContent.tsx` 의 `<footer>` 블록을 찾아 다음으로 교체:

```tsx
<footer>
  <p>
    한국어 전용 서비스 · 익명 · 회원가입 없음 · 메시지 비저장 · 18초 휘발 · 이스터에그 미니게임
  </p>
  <p>
    <a href="/guide">이용가이드 — 불멍에서 노는 법</a>
  </p>
</footer>
```

- [ ] **Step 3: lint + 테스트 통과**

Run: `npm run lint && npm test`
Expected: PASS

- [ ] **Step 4: sitemap 확인**

`npm run dev:all` 띄우고 `http://localhost:3000/sitemap.xml` 방문 → `<loc>` 두 개 (`/` 와 `/guide`) 보이는지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/app/sitemap.ts src/components/SeoContent/SeoContent.tsx
git commit -m "feat(seo): sitemap 에 /guide 추가 + SeoContent footer 링크"
```

---

## Task 7: 최종 통합 검증

코드 수정 없음. 모든 task 끝난 뒤 한 번에 확인.

- [ ] **Step 1: 전체 빌드 + 테스트 통과**

Run: `npm run lint && npm test && npm run build`
Expected: 모두 PASS, build 출력에 `/guide` 라우트 SSG 표시

- [ ] **Step 2: 메인 페이지 시각 회귀 확인**

`npm run dev:all` 띄우고 `http://localhost:3000` 방문:
- 모닥불 캔버스 씬 정상 (햄버거가 가리지 않음)
- 좌상단 햄버거 정상 노출 + 클릭 시 드롭다운
- 채팅 + 미니게임 (`/별똥별` 입력, 달 클릭, 열기구 클릭) 모두 정상 동작 (회귀 없음)
- 게임 진행 중에도 햄버거 계속 노출됨

- [ ] **Step 3: 가이드 페이지 시각 검증**

`http://localhost:3000/guide`:
- 다크 밤하늘 톤 배경 + 모닥불 오렌지 헤더
- 모든 섹션 가독성
- 모바일 폭(375px) 에서 깨지지 않음
- `← 모닥불로 돌아가기` 양쪽 (상·하단) 동작

- [ ] **Step 4: SEO 인프라 검증**

- `http://localhost:3000/sitemap.xml` → `/` + `/guide` 둘 다 포함
- `http://localhost:3000/guide` view-source →
  - `<title>이용가이드 — 불멍에서 노는 법 · 불멍</title>`
  - `<link rel="canonical" href=".../guide">`
  - `<meta property="og:title" .../>`, `og:description`, `og:image` 모두 가이드용
  - `<script type="application/ld+json">` 안에 `HowTo` + `BreadcrumbList` (이 페이지 전용) + `WebApplication` + `FAQPage` (layout 공통) 총 4종
- `http://localhost:3000` view-source → `FAQPage` 의 미니게임 항목이 정정된 문구로 출력되는지 (열기구 / 달 클릭 명시)

- [ ] **Step 5: (옵션) Lighthouse SEO 점수**

Chrome DevTools Lighthouse → SEO 95+ 목표 (메인/가이드 둘 다).

검증이 모두 통과하면 끝. 별도 통합 커밋 없음 (task 별로 이미 커밋).

---

## Self-Review Notes

- **Spec coverage:** spec 의 모든 섹션(라우트/SEO/햄버거/콘텐츠/디자인 토큰/SeoContent 정정/검증) 모두 task 에 매핑됨.
- **Placeholder scan:** "TBD"/"TODO"/"등등" 없음. 모든 step 에 실제 코드 또는 명확한 액션.
- **Type consistency:** `AppMenu` 컴포넌트명, `GuideJsonLd` 컴포넌트명, `metadata` export 패턴 모두 일관.
- **이스터에그 진실 소스 확인:** `/별똥별` (BonfireScene:921), 달 클릭 (StarrySky onMoonClick), 열기구 클릭 (BonfireScene:1186), 별똥별 리더보드 별 (StarrySky landmarkStar), 점프맵 리더보드 구름 (BonfireScene:1216~) — 모두 실제 코드 grep 으로 확인됨.
