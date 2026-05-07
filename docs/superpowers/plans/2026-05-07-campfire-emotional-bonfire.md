# 감정 군고구마 캠프파이어 (Burn Emotion) 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude Design 핸드오프 번들 `Emotional Trash Can v2.html` 디자인을 Next.js 15 App Router + Supabase Realtime 기반의 한국어 메인 / 영어 보조 운영 가능한 익명 감정 채팅 캠프파이어 서비스로 구현한다.

**Architecture:**
- **Frontend:** Next.js 15 App Router(SSR) + React 19 + TypeScript. SVG·CSS keyframes 기반 캠프파이어 씬을 클라이언트 컴포넌트로 캡슐화하고, 정적 컨텐츠(About, FAQ 등)는 서버 컴포넌트로 SEO/GEO 최적화.
- **Realtime:** Supabase `messages` 테이블 + `postgres_changes` 채널로 익명 채팅 broadcast. Presence 채널로 접속자 수 동기화.
- **CSS 전략:** 디자인 번들의 vanilla CSS keyframes를 거의 그대로 보존(불꽃 leap, 별 blink, 고구마 등장 등). 전역 시드는 `app/globals.css`, 컴포넌트 특화 스타일은 CSS Modules.
- **i18n:** 기본 `/`(ko) + `/en` 미러 라우트. KR이 메인 도메인 시그널.

**Tech Stack:**
- Next.js 15.x (App Router) / React 19 / TypeScript 5
- @supabase/ssr + @supabase/supabase-js (Realtime + DB)
- CSS Modules + globals.css (Tailwind 사용 X — pixel-perfect 보존 우선)
- Vitest + React Testing Library (최소 유닛 테스트 — RNG/seed/유틸 함수)
- Playwright (E2E 시각 회귀 — Phase 4 옵션)
- 폰트: Pretendard, Space Grotesk, JetBrains Mono, Special Elite (디자인 동일)

**Phasing:**
- **Phase 1 (이 플랜의 본체):** 정적 디자인 클론. 가짜 트래픽으로 단일 사용자 시각 충실도 100% 재현.
- **Phase 2 (별도 플랜):** Supabase Realtime 연동, 진짜 익명 멀티유저 채팅·presence.
- **Phase 3 (별도 플랜):** SEO/GEO — metadata, JSON-LD, sitemap, llms.txt, About/FAQ 페이지, /en 미러.
- **Phase 4 (별도 플랜):** Vercel 배포, 도메인, 분석, 시각 회귀 테스트.

**디자인 소스:** `/tmp/design-extract/emotional-trash-can/project/` — 실제 작동하는 React-via-Babel 프로토타입. 포팅 시 1차 진리(source of truth).

---

## 사전 조건

- Node.js 20+ (`node -v`로 확인)
- npm 10+ 또는 pnpm/yarn (이 플랜은 npm 기준)
- 디자인 번들 디렉토리 `/tmp/design-extract/emotional-trash-can/project/` 가 존재 (없으면 사용자에게 다시 디자인 zip 추출 요청)

## 파일 구조 (Phase 1 종료 시점)

```
burn-emotion/
├── .gitignore
├── .npmrc
├── README.md
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs           # 비활성 (Tailwind 안 씀이지만 next bootstrapping 산출물 정리)
├── tsconfig.json
├── vitest.config.ts
├── docs/superpowers/plans/2026-05-07-campfire-emotional-bonfire.md  # 본 플랜
├── public/
│   └── audio/
│       └── fireplace-bgm.mp3
└── src/
    ├── app/
    │   ├── layout.tsx              # KR root 레이아웃 + 폰트
    │   ├── page.tsx                # 메인 캠프파이어 페이지 (서버 셸 + 클라이언트 BonfireScene)
    │   ├── globals.css             # 디자인 토큰 + 글로벌 keyframes
    │   └── opengraph-image.tsx     # OG 동적 이미지 (Phase 3에서 본격 작업, Phase 1은 placeholder)
    ├── components/
    │   ├── BonfireScene/
    │   │   ├── BonfireScene.tsx        # 'use client' 오케스트레이터
    │   │   ├── BonfireScene.module.css # 씬 레이아웃 전용 스타일
    │   │   └── useBonfireState.ts      # pile / silhouettes / fake traffic 상태 훅
    │   ├── Campfire/
    │   │   ├── Campfire.tsx
    │   │   └── Campfire.module.css
    │   ├── SweetPotato/
    │   │   ├── SweetPotato.tsx
    │   │   └── SweetPotato.module.css
    │   ├── PersonSilhouette/
    │   │   └── PersonSilhouette.tsx
    │   ├── StarrySky/
    │   │   ├── StarrySky.tsx
    │   │   └── StarrySky.module.css
    │   ├── NightField/
    │   │   └── NightField.tsx
    │   ├── ChatInput/
    │   │   ├── ChatInput.tsx
    │   │   └── ChatInput.module.css
    │   ├── SideFeed/
    │   │   ├── SideFeed.tsx
    │   │   └── SideFeed.module.css
    │   ├── ComfortQuote/
    │   │   ├── ComfortQuote.tsx
    │   │   └── ComfortQuote.module.css
    │   ├── SoundToggle/
    │   │   ├── SoundToggle.tsx
    │   │   └── SoundToggle.module.css
    │   ├── Header/
    │   │   ├── Header.tsx
    │   │   └── Header.module.css
    │   └── Embers/
    │       └── Embers.tsx
    ├── lib/
    │   ├── audio/
    │   │   └── audio-engine.ts     # Web Audio 엔진 싱글턴
    │   ├── nickname.ts             # makeNickname()
    │   ├── seed-rng.ts             # 시드 기반 결정적 RNG
    │   ├── data/
    │   │   ├── fake-messages.ts
    │   │   ├── comfort-lines.ts
    │   │   └── placeholder-lines.ts
    │   ├── layout/
    │   │   └── silhouette-layout.ts  # layoutPos
    │   └── types.ts
    └── tests/
        ├── nickname.test.ts
        ├── seed-rng.test.ts
        └── silhouette-layout.test.ts
```

**파일 책임:**
- `BonfireScene.tsx`: 모든 상태(pile, silhouettes, embers, comfort, online count, fake traffic)를 모음. SSR 안 됨(`'use client'`).
- `useBonfireState.ts`: BonfireScene이 너무 비대해지면 분리할 훅. Phase 1 작성 시점에 분리.
- `Campfire.tsx` 등 SVG 컴포넌트: presentational. props로만 행동 결정. SSR 안전.
- `audio-engine.ts`: Web Audio 싱글턴. 첫 사용자 인터랙션 후 lazy-init. SSR 안전(브라우저 전용 함수는 가드).
- `lib/data/*`: 정적 데이터. tree-shaking을 위해 named export.
- `lib/seed-rng.ts`: SweetPotato 모양 등에 쓰이는 결정적 PRNG. 테스트 가능.

---

## Task 1: Node 버전 및 npm 확인

**Files:** N/A (사전 검증)

- [x] **Step 1: Node와 npm 버전 확인**

Run: `node -v && npm -v`
Expected: Node v20.x 이상, npm 10.x 이상. 그 이하면 사용자에게 알리고 중단.

---

## Task 2: Next.js 프로젝트 초기화 + git init

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` (Next.js 스캐폴딩)

- [x] **Step 1: 디렉토리에서 Next.js 15 초기화**

Run:
```bash
cd /Users/ain/Projects/burn-emotion
npx create-next-app@latest . \
  --ts \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-tailwind \
  --use-npm \
  --turbopack \
  --skip-install
```

Expected: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/{layout.tsx,page.tsx,globals.css}` 생성됨.

⚠ `docs/`, `.gitignore` 등 기존 파일 충돌 시 create-next-app이 거부할 수 있음. 그 경우 `--force` 추가 후 docs는 임시로 백업 → 복원.

- [x] **Step 2: 의존성 설치**

Run:
```bash
npm install
```

Expected: `node_modules/` 생성, `package-lock.json` 생성.

- [x] **Step 3: 개발 서버 시동 확인**

Run: `npm run dev`
Expected: `http://localhost:3000`에서 기본 Next 페이지 노출. Ctrl-C로 종료.

- [x] **Step 4: git 초기화 및 첫 커밋**

Run:
```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 15 app router project"
```

Expected: 첫 커밋 생성. `git log --oneline` 으로 확인.

---

## Task 3: 폰트 및 글로벌 스타일 시드

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [x] **Step 1: layout.tsx 작성 — KR `<html lang="ko">` + 폰트 link**

`src/app/layout.tsx` 전체 교체:
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '감정 쓰레기통 · 모닥불에서 군고구마를 굽는 익명 채팅',
  description: '오늘의 감정을 모닥불에 던지면 군고구마가 됩니다. 익명으로, 조용히, 천천히.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Special+Elite&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [x] **Step 2: globals.css 교체 — 디자인 번들의 styles-v2.css에서 디자인 토큰/글로벌만 추출**

`src/app/globals.css` 전체 교체. 다음 영역만 포함하고 나머지(컴포넌트 종속 스타일)는 각 컴포넌트의 모듈 CSS로 이관:

- `:root` 디자인 토큰 (--night-0 ~ --warn-yellow, --font-* )
- `* { box-sizing: border-box; ... }` 리셋
- `html, body, #root` (단 `#root` → Next는 `next` 루트라 제거)
- `.stage` 배경 그라데이션
- 글로벌 keyframes: `pulse`, `twinkle`, `fogDrift`, `glowPulse`, `comfortFade`, `feedIn`, `feedOut`, `bubbleIn`, `bubbleOut`, `paperBurn`, `paperFlame`, `paperFlameSide`, `paperFlameSideR`, `leap1`, `leap2`, `leap3`, `burnFlash`, `hintBlink`, `pileBadgeIn`, `pileBurn`, `starBlink`, `drumShake`, `silhouetteShimmer`, `potatoAppear`, `flyToTrashArc`, `emberRise`
- 반응형 미디어쿼리 일부

⚠ 키프레임은 모듈 CSS scope 안에서 동작하지 않을 수 있어 globals에 두는 것이 안전. 컴포넌트 모듈 CSS는 layout/positioning만 담당.

전체 텍스트는 `/tmp/design-extract/emotional-trash-can/project/styles-v2.css` 1~999행 중 위 항목만 발췌. (에이전트는 해당 파일을 직접 read한 뒤 발췌해서 globals.css에 작성한다.)

- [x] **Step 3: SSR 안전 확인 — `npm run dev` 후 첫 화면이 검은 배경(`--night-0`)으로 변경되는지 확인**

Expected: 콘솔 에러 0, 화면 배경이 디자인 토큰의 어두운 색.

- [x] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: add design tokens, fonts, global keyframes from v2 design"
```

---

## Task 4: 정적 자산 — fireplace BGM 복사

**Files:**
- Create: `public/audio/fireplace-bgm.mp3`

- [x] **Step 1: BGM 파일 복사**

Run:
```bash
mkdir -p public/audio
cp /tmp/design-extract/emotional-trash-can/project/fireplace-bgm.mp3 public/audio/fireplace-bgm.mp3
```

- [x] **Step 2: 파일 크기 확인**

Run: `ls -la public/audio/fireplace-bgm.mp3`
Expected: 약 253KB (디자인 번들 원본과 동일).

- [x] **Step 3: 커밋**

```bash
git add public/audio/fireplace-bgm.mp3
git commit -m "feat: add fireplace BGM audio asset"
```

---

## Task 5: Vitest + React Testing Library 셋업 (유틸 함수 TDD용)

**Files:**
- Modify: `package.json` (devDependencies, scripts)
- Create: `vitest.config.ts`
- Create: `src/tests/setup.ts`

- [x] **Step 1: 의존성 설치**

Run:
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [x] **Step 2: `vitest.config.ts` 작성**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
  },
});
```

- [x] **Step 3: setup 파일 작성**

`src/tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [x] **Step 4: package.json scripts 추가 — `test`, `test:watch`**

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [x] **Step 5: 첫 테스트 동작 확인 — 빈 더미 테스트 추가**

`src/tests/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 passed.

- [x] **Step 6: 더미 테스트 삭제 후 커밋**

```bash
rm src/tests/sanity.test.ts
git add -A
git commit -m "chore: configure vitest + testing-library"
```

---

## Task 6: 시드 기반 PRNG 유틸 (TDD)

**Files:**
- Create: `src/lib/seed-rng.ts`
- Create: `src/tests/seed-rng.test.ts`

디자인 번들의 SweetPotato에서 `rng = (n) => { let x = Math.sin(seed * 9301 + n * 49297) * 233280; return x - Math.floor(x); }` 가 사용된다. 이걸 별도 모듈로 분리해서 결정성 보장.

- [x] **Step 1: 실패하는 테스트 작성**

`src/tests/seed-rng.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { seededRandom } from '@/lib/seed-rng';

describe('seededRandom', () => {
  it('returns deterministic values for same seed and index', () => {
    const r = seededRandom(42);
    expect(r(1)).toBe(r(1));
    expect(r(2)).toBe(r(2));
  });

  it('returns different values for different indices', () => {
    const r = seededRandom(42);
    expect(r(1)).not.toBe(r(2));
  });

  it('returns values in [0, 1)', () => {
    const r = seededRandom(7);
    for (let i = 0; i < 50; i++) {
      const v = r(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const r1 = seededRandom(1);
    const r2 = seededRandom(2);
    expect(r1(5)).not.toBe(r2(5));
  });
});
```

- [x] **Step 2: 테스트 실패 확인**

Run: `npm test -- seed-rng`
Expected: FAIL — module not found.

- [x] **Step 3: 구현**

`src/lib/seed-rng.ts`:
```ts
export function seededRandom(seed: number): (index: number) => number {
  return (index: number) => {
    const x = Math.sin(seed * 9301 + index * 49297) * 233280;
    return x - Math.floor(x);
  };
}
```

- [x] **Step 4: 테스트 통과 확인**

Run: `npm test -- seed-rng`
Expected: 4 passed.

- [x] **Step 5: 커밋**

```bash
git add src/lib/seed-rng.ts src/tests/seed-rng.test.ts
git commit -m "feat(lib): add seeded PRNG utility"
```

---

## Task 7: 닉네임 생성기 (TDD)

**Files:**
- Create: `src/lib/nickname.ts`
- Create: `src/tests/nickname.test.ts`

- [x] **Step 1: 실패하는 테스트 작성**

`src/tests/nickname.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { makeNickname } from '@/lib/nickname';

describe('makeNickname', () => {
  it('returns Korean nickname when random < 0.65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const nick = makeNickname();
    expect(nick).toMatch(/^[가-힣]+_[가-힣]+_\d{2}$/);
    vi.restoreAllMocks();
  });

  it('returns English nickname when random >= 0.65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const nick = makeNickname();
    expect(nick).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    vi.restoreAllMocks();
  });

  it('zero-pads number to 2 digits', () => {
    const nick = makeNickname();
    const num = nick.match(/(\d{2})$/)?.[1];
    expect(num?.length).toBe(2);
  });
});
```

- [x] **Step 2: 테스트 실패 확인**

Run: `npm test -- nickname`
Expected: FAIL — module not found.

- [x] **Step 3: 구현 — 디자인 번들 `data.jsx` 의 makeNickname을 TS로 포팅**

`src/lib/nickname.ts`:
```ts
const ADJ_KR = [
  '지친', '흐린', '무거운', '조용한', '외로운', '젖은', '흩어진', '굽은', '텅 빈',
  '느린', '차가운', '어슴푸레한', '낡은', '조각난', '흔들리는', '잔잔한', '헝클어진',
  '깜빡이는', '눅눅한', '삐걱이는', '고요한', '찢어진', '남겨진',
];

const NOUN_KR = [
  '구름', '달팽이', '고양이', '우산', '라디오', '촛불', '가로등', '그림자', '주전자',
  '엽서', '상자', '파도', '스웨터', '안개', '전구', '노트', '봉투', '청바지',
  '테이프', '양말', '수첩', '유리병', '지하철',
];

const ADJ_EN = [
  'tired', 'blue', 'muffled', 'quiet', 'lonely', 'soggy', 'scattered', 'bent',
  'hollow', 'slow', 'fading', 'creaky', 'dim', 'torn', 'wobbly', 'still', 'tangled',
];

const NOUN_EN = [
  'cloud', 'snail', 'lamp', 'kettle', 'envelope', 'wave', 'sweater', 'fog',
  'bulb', 'note', 'ribbon', 'tape', 'sock', 'jar', 'ticket', 'page',
];

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pad2 = (n: number) => String(n).padStart(2, '0');

export function makeNickname(): string {
  if (Math.random() >= 0.65) {
    return `${pick(ADJ_EN)}-${pick(NOUN_EN)}-${pad2(Math.floor(Math.random() * 99))}`;
  }
  return `${pick(ADJ_KR)}_${pick(NOUN_KR)}_${pad2(Math.floor(Math.random() * 99))}`;
}
```

⚠ 테스트의 `< 0.65 → 한국어` 분기 임계값과 구현의 `>= 0.65 → 영어` 분기 임계값을 일치시킨다. 디자인 번들의 0.35는 영어 비율이지만 분기 방향이 거꾸로라 가독성 향상을 위해 이렇게 작성. (테스트의 mock 값과 정확히 호환됨.)

- [x] **Step 4: 테스트 통과 확인**

Run: `npm test -- nickname`
Expected: 3 passed.

- [x] **Step 5: 커밋**

```bash
git add src/lib/nickname.ts src/tests/nickname.test.ts
git commit -m "feat(lib): port nickname generator from design bundle"
```

---

## Task 8: 정적 데이터 모듈 (메시지/위로/플레이스홀더)

**Files:**
- Create: `src/lib/data/fake-messages.ts`
- Create: `src/lib/data/comfort-lines.ts`
- Create: `src/lib/data/placeholder-lines.ts`

- [x] **Step 1: fake-messages.ts**

`src/lib/data/fake-messages.ts`:
```ts
export const FAKE_MESSAGES: readonly string[] = [
  '월요일이 또 시작됐다',
  '팀장 메일 진짜 맥락 없음',
  '아 적금 깨야하나',
  '왜 나만 이래 진짜',
  'today was a lot',
  '엄마한테 또 화냈음 죄책감',
  '전화 안 받는 친구 진짜 서운하다',
  '내일 회의 7개라니 미친',
  "i'm just so tired",
  '지하철에서 울 뻔',
  '다이어트 또 실패',
  '시험 망했다 그냥 망했다',
  '왜 이렇게 눈치 봐야 해',
  '그냥 다 그만두고 싶다',
  "can't sleep again",
  '월급이 통장을 스쳐갔다',
  '전남친 인스타 또 들어가버림 한심',
  '발표 망쳤다 진짜 도망가고 싶음',
  '엄마 아빠 또 싸웠다',
  '고양이만 있으면 살만하다',
  '왜 나는 이렇게 자존감이 낮을까',
  '친구가 결혼한대 축하해주고 집 와서 울었다',
  '비교 그만하기로 했는데 또 했다',
  '운동 시작한지 3일 째 그만둠',
  'i hate small talk so much',
  '면접 떨어졌다 5번째',
  '일은 많은데 인정은 없네',
  '주말이 너무 짧다',
  '통장 잔고가 무서움',
  '왜 모든 게 다 어렵냐',
  'today i cried in the bathroom at work',
  '또 야근이다 ㅎㅎ',
  '내가 왜 그랬을까 진짜',
  '사람이 미워질 때가 있다',
  '오늘 하루도 견뎠다',
] as const;
```

- [x] **Step 2: comfort-lines.ts**

`src/lib/data/comfort-lines.ts`:
```ts
export interface ComfortLine {
  kr: string;
  en: string;
}

export const COMFORT_LINES: readonly ComfortLine[] = [
  { kr: '오늘 여기까지 온 것만으로도 충분해요.', en: 'Just getting here today is enough.' },
  { kr: '감정은 쓰레기가 아니에요. 다만 잠시 내려놓아도 돼요.', en: "Feelings aren't trash — but you can put them down for now." },
  { kr: '괜찮지 않아도 괜찮아요.', en: "It's okay not to be okay." },
  { kr: '당신의 무게를 잠시 맡겨두세요.', en: 'Leave the weight here, just for a moment.' },
  { kr: '이 불빛은 당신만 보고 있어요.', en: 'This flame is only watching you.' },
  { kr: '타고 남은 자리에 새로운 공간이 생겨요.', en: 'Where it burns, space opens up.' },
  { kr: '조용히, 천천히, 충분히.', en: 'Quiet. Slow. Enough.' },
  { kr: '오늘은 이만큼만 해도 잘한 거예요.', en: 'This much, today, is well done.' },
] as const;
```

- [x] **Step 3: placeholder-lines.ts**

`src/lib/data/placeholder-lines.ts`:
```ts
export const PLACEHOLDER_LINES: readonly string[] = [
  '오늘 무슨 일이 있었나요…',
  "what's on your mind tonight…",
  '쏟아내도 괜찮아요…',
  "let it out, no one's keeping score…",
  '구겨서 던져도 돼요…',
] as const;
```

- [x] **Step 4: 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공. 타입 에러 없음.

- [x] **Step 5: 커밋**

```bash
git add src/lib/data
git commit -m "feat(data): add fake messages, comfort lines, placeholder lines"
```

---

## Task 9: silhouette-layout 함수 (TDD)

**Files:**
- Create: `src/lib/layout/silhouette-layout.ts`
- Create: `src/tests/silhouette-layout.test.ts`

디자인 번들의 `app-v2.jsx` 의 `layoutPos` 함수를 분리. 이 함수는 결정적이지 않은 부분(Math.random)이 일부 포함되어있으나, 결과의 `flip`/`variant`/대략적 좌표는 결정적이다. 테스트 가능한 부분만 검증.

- [x] **Step 1: 실패하는 테스트 작성**

`src/tests/silhouette-layout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { layoutPos } from '@/lib/layout/silhouette-layout';

describe('layoutPos', () => {
  it('flips horizontally when x > 50', () => {
    // 큰 N에서 i가 후반이면 right side로 가서 x>50 인 경우가 보장됨
    const total = 20;
    const positions = Array.from({ length: total }, (_, i) => layoutPos(i, total));
    const rightSiders = positions.filter(p => p.x > 50);
    expect(rightSiders.length).toBeGreaterThan(0);
    expect(rightSiders.every(p => p.flip)).toBe(true);
  });

  it('returns variant in [0, 4]', () => {
    for (let i = 0; i < 30; i++) {
      const p = layoutPos(i, 30);
      expect(p.variant).toBeGreaterThanOrEqual(0);
      expect(p.variant).toBeLessThan(5);
    }
  });

  it('back ring (first 60%) has smaller scale than 1', () => {
    const total = 10;
    const backCount = Math.ceil(total * 0.6);
    for (let i = 0; i < backCount; i++) {
      const p = layoutPos(i, total);
      expect(p.scale).toBeLessThan(1);
    }
  });

  it('front ring uses fixed scale 0.85', () => {
    const total = 10;
    const backCount = Math.ceil(total * 0.6);
    for (let i = backCount; i < total; i++) {
      const p = layoutPos(i, total);
      expect(p.scale).toBe(0.85);
    }
  });
});
```

- [x] **Step 2: 테스트 실패 확인**

Run: `npm test -- silhouette-layout`
Expected: FAIL — module not found.

- [x] **Step 3: 구현 — design bundle의 layoutPos를 TS 함수로 포팅**

`src/lib/layout/silhouette-layout.ts`:
```ts
export interface SilhouettePosition {
  x: number;       // % units
  y: number;       // px above bottom
  scale: number;
  variant: number; // 0..4
  flip: boolean;
}

export function layoutPos(i: number, total: number): SilhouettePosition {
  const backCount = Math.ceil(total * 0.6);
  const frontCount = total - backCount;
  let x: number;
  let y: number;
  let scale: number;

  if (i < backCount) {
    const t = backCount === 1 ? 0.5 : i / (backCount - 1);
    const theta = ((160 - t * 140) * Math.PI) / 180;
    x = 50 + Math.cos(theta) * 42;
    y = 100 + Math.sin(theta) * 30;
    scale = 0.5 + Math.sin(theta) * 0.15;
  } else {
    const t = frontCount === 1 ? 0.5 : (i - backCount) / (frontCount - 1);
    let theta: number;
    if (t < 0.5) {
      theta = ((200 + t * 2 * 45) * Math.PI) / 180;
    } else {
      theta = ((295 + (t - 0.5) * 2 * 45) * Math.PI) / 180;
    }
    x = 50 + Math.cos(theta) * 32;
    y = 30 + Math.sin(theta) * 12;
    scale = 0.85;
  }

  const flip = x > 50;
  const variant = (i * 7 + 3) % 5;
  return { x, y, scale, variant, flip };
}
```

- [x] **Step 4: 테스트 통과 확인**

Run: `npm test -- silhouette-layout`
Expected: 4 passed.

- [x] **Step 5: 커밋**

```bash
git add src/lib/layout src/tests/silhouette-layout.test.ts
git commit -m "feat(layout): add silhouette-layout helper with tests"
```

---

## Task 10: 공통 타입 정의

**Files:**
- Create: `src/lib/types.ts`

- [x] **Step 1: 도메인 타입 정의**

`src/lib/types.ts`:
```ts
export interface ChatMessage {
  id: number;
  text: string;
  nick: string;
  /** silhouette index (-1 for self / no avatar) */
  sIdx: number;
  /** unix ms */
  time: number;
  isMe?: boolean;
  /** UI: feed item leaving */
  fading?: boolean;
}

export interface PotatoState {
  id: number;
  seed: number;
  text: string;
  /** 0..1 */
  roast: number;
  cracked: boolean;
  /** performance.now() when cracked */
  crackedAt: number;
  /** performance.now() when added */
  placedAt: number;
  wobble: number;
}

export interface SilhouetteEntity {
  id: string;
  nick: string;
  /** position (overridden by layoutPos result on layout) */
  x: number;
  y: number;
  scale: number;
  variant: number;
  flip: boolean;
}

export interface ActiveBubble {
  text: string;
  /** unique key per bubble for animation */
  key: number;
}

export interface EmberParticle {
  id: number;
  startX: number;
  endX: number;
  endY: number;
  duration: number;
}
```

- [x] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [x] **Step 3: 커밋**

```bash
git add src/lib/types.ts
git commit -m "feat(types): define domain types for chat/potatoes/silhouettes"
```

---

## Task 11: AudioEngine TS 모듈

**Files:**
- Create: `src/lib/audio/audio-engine.ts`

디자인 번들의 `audio.jsx`를 TS 싱글턴으로 포팅. SSR 안전(브라우저 가드 추가). Phase 1에서는 BGM 재생만 사용하지만, 추후 효과음용 메서드도 일부 보존.

- [x] **Step 1: 모듈 작성**

`src/lib/audio/audio-engine.ts`:
```ts
type Ctx = AudioContext;
type FireNodes = {
  src: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  crackleTimeout: ReturnType<typeof setTimeout> | null;
};

class AudioEngineImpl {
  private ctx: Ctx | null = null;
  private masterGain: GainNode | null = null;
  private fireNodes: FireNodes | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private bgmEl: HTMLAudioElement | null = null;

  ensure(): Ctx | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
    return this.ctx;
  }

  private noiseBuffer(): AudioBuffer | null {
    const ctx = this.ensure();
    if (!ctx) return null;
    if (this.noise) return this.noise;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
    return buf;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(m ? 0 : 0.6, this.ctx.currentTime + 0.2);
    }
    if (this.bgmEl) {
      if (m) this.bgmEl.pause();
      else void this.bgmEl.play().catch(() => {});
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  startBgm(src = '/audio/fireplace-bgm.mp3', volume = 0.55): void {
    if (typeof window === 'undefined') return;
    if (!this.bgmEl) {
      const a = new Audio(src);
      a.loop = true;
      a.volume = volume;
      this.bgmEl = a;
    }
    if (this.muted) return;
    void this.bgmEl.play().catch(() => {});
  }

  stopBgm(): void {
    if (this.bgmEl) this.bgmEl.pause();
  }

  /** quick crackle burst for ambience or interaction */
  playCrackle(intensity = 1): void {
    if (this.muted) return;
    const ctx = this.ensure();
    const buf = this.noiseBuffer();
    if (!ctx || !buf || !this.masterGain) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + Math.random() * 4000;
    bp.Q.value = 5 + Math.random() * 8;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    const peak = (0.05 + Math.random() * 0.1) * intensity;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.04 + Math.random() * 0.06);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(t);
    src.stop(t + 0.15);
  }
}

export const AudioEngine = new AudioEngineImpl();
```

- [x] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공. SSR에서 `window` 참조로 인한 에러 없음.

- [x] **Step 3: 커밋**

```bash
git add src/lib/audio
git commit -m "feat(audio): port AudioEngine to TS singleton with SSR guard"
```

---

## Task 12: Campfire SVG 컴포넌트

**Files:**
- Create: `src/components/Campfire/Campfire.tsx`

- [x] **Step 1: 컴포넌트 포팅**

소스: `/tmp/design-extract/emotional-trash-can/project/svg-v2.jsx` 의 `Campfire` 컴포넌트 (line ~3-87).

`src/components/Campfire/Campfire.tsx`:
```tsx
interface CampfireProps {
  width?: number;
  fireIntensity?: number;
}

export function Campfire({ width = 260, fireIntensity = 1 }: CampfireProps) {
  const stones: ReadonlyArray<readonly [number, number, number, number]> = [
    [20, 168, 18, 9],
    [54, 175, 16, 8],
    [92, 178, 18, 9],
    [134, 178, 20, 9],
    [176, 177, 18, 9],
    [216, 173, 17, 8],
    [240, 168, 14, 7],
  ];
  return (
    <svg width={width} height={width * 0.75} viewBox="0 0 260 195" fill="none">
      <defs>
        <linearGradient id="logBark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b4226" />
          <stop offset="50%" stopColor="#3e2614" />
          <stop offset="100%" stopColor="#1f130a" />
        </linearGradient>
        <linearGradient id="logEnd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c98b54" />
          <stop offset="60%" stopColor="#8a5a32" />
          <stop offset="100%" stopColor="#3a2414" />
        </linearGradient>
        <radialGradient id="emberGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffcf66" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#ff7a26" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff4010" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="130" cy="180" rx="120" ry="12" fill="rgba(0,0,0,0.7)" />
      <ellipse cx="130" cy="178" rx="140" ry="20" fill="rgba(255, 140, 58, 0.25)" opacity={fireIntensity} />

      {stones.map(([cx, cy, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#3a3026" />
          <ellipse cx={cx - 2} cy={cy - 2} rx={rx - 4} ry={ry - 4} fill="#5a4a3a" />
          <ellipse cx={cx - 3} cy={cy - 3} rx={rx - 8} ry={ry - 6} fill="#7a6a52" opacity="0.7" />
        </g>
      ))}

      <ellipse cx="130" cy="155" rx="60" ry="12" fill="url(#emberGlow)" opacity={0.85 * fireIntensity}>
        <animate
          attributeName="opacity"
          values={`${0.6 * fireIntensity};${0.95 * fireIntensity};${0.6 * fireIntensity}`}
          dur="2s"
          repeatCount="indefinite"
        />
      </ellipse>

      <ellipse cx="130" cy="158" rx="54" ry="8" fill="#1a0e06" />

      <g transform="translate(130 145) rotate(-22)">
        <rect x="-70" y="-7" width="140" height="14" rx="7" fill="url(#logBark)" />
        <ellipse cx="-70" cy="0" rx="3" ry="7" fill="url(#logEnd)" />
        <ellipse cx="70" cy="0" rx="3" ry="7" fill="url(#logEnd)" />
        <path d="M -60 -3 L 60 -3 M -50 3 L 50 3" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
      </g>
      <g transform="translate(130 145) rotate(22)">
        <rect x="-70" y="-7" width="140" height="14" rx="7" fill="url(#logBark)" />
        <ellipse cx="-70" cy="0" rx="3" ry="7" fill="url(#logEnd)" />
        <ellipse cx="70" cy="0" rx="3" ry="7" fill="url(#logEnd)" />
        <path d="M -55 -3 L 55 -3 M -45 3 L 45 3" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
      </g>
      <g transform="translate(130 138) rotate(72)">
        <rect x="-60" y="-6" width="120" height="12" rx="6" fill="url(#logBark)" />
        <ellipse cx="-60" cy="0" rx="2.5" ry="6" fill="url(#logEnd)" />
        <ellipse cx="60" cy="0" rx="2.5" ry="6" fill="url(#logEnd)" />
      </g>
      <g transform="translate(130 138) rotate(108)">
        <rect x="-60" y="-6" width="120" height="12" rx="6" fill="url(#logBark)" />
        <ellipse cx="-60" cy="0" rx="2.5" ry="6" fill="url(#logEnd)" />
        <ellipse cx="60" cy="0" rx="2.5" ry="6" fill="url(#logEnd)" />
      </g>

      <g opacity={0.9 * fireIntensity}>
        <path d="M 100 138 Q 130 132 160 140" stroke="#ff7026" strokeWidth="1.5" fill="none" />
        <path d="M 110 148 Q 130 142 150 148" stroke="#ffaa44" strokeWidth="1" fill="none" />
      </g>
    </svg>
  );
}
```

⚠ 디자인 원본의 `filter="blur(0.5)"` 같은 inline filter 속성은 React에서는 string으로 바로 적용 가능하나 일부 브라우저에서 SVG에 적용 안 됨. 불필요해서 제거.

- [x] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [x] **Step 3: 커밋**

```bash
git add src/components/Campfire
git commit -m "feat(ui): port Campfire SVG component"
```

---

## Task 13: SweetPotato SVG 컴포넌트

**Files:**
- Create: `src/components/SweetPotato/SweetPotato.tsx`

소스: `/tmp/design-extract/emotional-trash-can/project/svg-v2.jsx` line ~88-369.

- [x] **Step 1: 컴포넌트 포팅**

이 컴포넌트는 길지만 props만 타이핑해서 그대로 옮기면 된다. 핵심:
- `seed` 기반으로 모양 결정 → `seededRandom(seed)` 사용
- `roastLevel` 0..1 에 따라 skin 색상 보간
- `cracked` 가 true면 가로로 갈라진 고구마 + 노란 속살 + steam

`src/components/SweetPotato/SweetPotato.tsx`:
```tsx
import { seededRandom } from '@/lib/seed-rng';

interface SweetPotatoProps {
  size?: number;
  roastLevel?: number;
  cracked?: boolean;
  seed?: number;
}

export function SweetPotato({
  size = 70,
  roastLevel = 0,
  cracked = false,
  seed = 0,
}: SweetPotatoProps) {
  const rng = seededRandom(seed);
  const tipTopX = 40 + (rng(20) - 0.5) * 10;
  const tipBotX = 40 + (rng(21) - 0.5) * 12;
  const bulgeUp = 0.95 + rng(22) * 0.3;
  const bulgeMid = 1.1 + rng(23) * 0.3;
  const bulgeLow = 0.85 + rng(24) * 0.3;
  const sideR = 1.0 + (rng(25) - 0.5) * 0.25;
  const sideL = 1.0 + (rng(26) - 0.5) * 0.25;

  const r = roastLevel;
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  let cR: number, cG: number, cB: number;
  if (r < 0.5) {
    const t = r * 2;
    cR = lerp(196, 150, t);
    cG = lerp(78, 60, t);
    cB = lerp(72, 40, t);
  } else {
    const t = (r - 0.5) * 2;
    cR = lerp(150, 50, t);
    cG = lerp(60, 25, t);
    cB = lerp(40, 18, t);
  }
  const skinMain = `rgb(${cR}, ${cG}, ${cB})`;
  const skinDark = `rgb(${Math.max(10, cR - 55)}, ${Math.max(8, cG - 40)}, ${Math.max(6, cB - 22)})`;
  const skinLight = `rgb(${Math.min(255, cR + 50)}, ${Math.min(255, cG + 38)}, ${Math.min(255, cB + 38)})`;
  const charSpots = r > 0.55;
  const tilt = (rng(10) - 0.5) * 18;
  const w = 80;
  const h = 140;

  const lx1 = 40 - 14 * bulgeUp * sideL;
  const lx2 = 40 - 22 * bulgeMid * sideL;
  const lx3 = 40 - 18 * bulgeLow * sideL;
  const lx4 = 40 - 7 * sideL;
  const rx1 = 40 + 14 * bulgeUp * sideR;
  const rx2 = 40 + 22 * bulgeMid * sideR;
  const rx3 = 40 + 18 * bulgeLow * sideR;
  const rx4 = 40 + 7 * sideR;

  const bodyPath = `
    M ${tipTopX} 6
    C ${lx1} 16, ${lx2 - 2} 44, ${lx2} 68
    C ${lx3} 96, ${lx4} 122, ${tipBotX} 134
    C ${tipBotX + 2} 136, ${tipBotX - 2} 136, ${tipBotX} 134
    C ${rx4} 122, ${rx3} 96, ${rx2} 68
    C ${rx2 - 2} 44, ${rx1} 16, ${tipTopX} 6 Z`;

  const topHalfPath = `
    M ${tipTopX} 6
    C ${lx1} 16, ${lx2 - 2} 44, ${lx2} 68
    L ${rx2} 68
    C ${rx2 - 2} 44, ${rx1} 16, ${tipTopX} 6 Z`;

  const botHalfPath = `
    M ${lx2} 72
    C ${lx3} 100, ${lx4} 124, ${tipBotX} 134
    C ${tipBotX + 2} 136, ${tipBotX - 2} 136, ${tipBotX} 134
    C ${rx4} 124, ${rx3} 100, ${rx2} 72
    L ${lx2} 72 Z`;

  const skinId = `skin-${seed}`;
  const fleshId = `flesh-${seed}`;

  return (
    <svg
      width={size}
      height={size * 1.75}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={skinId} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0%" stopColor={skinLight} />
          <stop offset="40%" stopColor={skinMain} />
          <stop offset="100%" stopColor={skinDark} />
        </radialGradient>
        <radialGradient id={fleshId} cx="0.5" cy="0.4" r="0.65">
          <stop offset="0%" stopColor="#fff0b0" />
          <stop offset="35%" stopColor="#ffd668" />
          <stop offset="70%" stopColor="#e6a832" />
          <stop offset="100%" stopColor="#8a5018" />
        </radialGradient>
      </defs>

      <g transform={`rotate(${tilt} ${w / 2} ${h / 2})`}>
        {!cracked && (
          <>
            <path d={bodyPath} fill={`url(#${skinId})`} />
            <path
              d={`M ${tipTopX + 1} 8
                  C ${rx1} 18, ${rx2} 50, ${rx2} 78
                  C ${rx3} 110, ${rx4} 138, ${tipBotX} 152
                  L ${tipTopX} 8 Z`}
              fill={skinDark}
              opacity="0.4"
            />
            <path
              d={`M ${lx1 + 4} 24 Q ${lx2 + 2} 70 ${lx3 + 4} 120`}
              stroke={skinLight}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
            <path
              d={`M ${lx1 + 5} 30 Q ${lx2 + 4} 70 ${lx3 + 5} 110`}
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.18"
            />
            <g opacity="0.55" fill={skinDark}>
              <ellipse cx={36 + rng(1) * 4} cy={28} rx="1.6" ry="1" />
              <ellipse cx={44 + rng(2) * 4} cy={42} rx="1.4" ry="0.9" />
              <ellipse cx={34 + rng(3) * 4} cy={62} rx="1.8" ry="1.1" />
              <ellipse cx={48 + rng(4) * 4} cy={78} rx="1.5" ry="1" />
              <ellipse cx={36 + rng(5) * 4} cy={96} rx="1.4" ry="0.9" />
              <ellipse cx={46 + rng(6) * 4} cy={116} rx="1.6" ry="1" />
              <ellipse cx={40 + rng(7) * 4} cy={134} rx="1.2" ry="0.8" />
            </g>
            {r < 0.4 && (
              <g fill="#2a0e10" opacity="0.7">
                <circle cx={38 + rng(8) * 4} cy={36 + rng(9) * 6} r="0.9" />
                <circle cx={44 + rng(14) * 4} cy={70 + rng(15) * 6} r="0.8" />
                <circle cx={38 + rng(16) * 4} cy={108 + rng(17) * 4} r="0.9" />
              </g>
            )}
            <g stroke={skinDark} strokeWidth="0.35" fill="none" opacity="0.3">
              <path d={`M ${lx2 + 4} 30 Q ${lx2 + 6} 80 ${lx3 + 6} 130`} />
              <path d="M 40 14 Q 40 80 40 146" />
              <path d={`M ${rx2 - 4} 30 Q ${rx2 - 6} 80 ${rx3 - 6} 130`} />
            </g>
            {charSpots && (
              <g fill="#0a0805" opacity={(r - 0.55) * 1.6}>
                <ellipse cx="36" cy="50" rx="5" ry="4" />
                <ellipse cx="46" cy="84" rx="6" ry="5" />
                <ellipse cx="38" cy="118" rx="5" ry="4" />
              </g>
            )}
            {r > 0.65 && (
              <g opacity={(r - 0.65) * 2} stroke="#ff6020" strokeWidth="0.7" fill="none">
                <path d="M 36 40 Q 42 70 38 100" />
                <path d="M 44 60 Q 48 95 44 130" />
              </g>
            )}
          </>
        )}

        {cracked && (
          <g>
            <g transform="translate(0 -6) rotate(-4 40 40)">
              <path d={topHalfPath} fill={`url(#${skinId})`} />
              <path
                d={`M ${tipTopX + 1} 8
                    C ${rx1} 18, ${rx2} 46, ${rx2} 68
                    L 40 68 L ${tipTopX} 8 Z`}
                fill={skinDark}
                opacity="0.35"
              />
              <path
                d={`M ${lx2 + 1} 68 L ${rx2 - 1} 68`}
                stroke="#1a0805"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              {charSpots && (
                <path
                  d={`M ${lx2 + 2} 67 L ${rx2 - 2} 67`}
                  stroke="#0a0604"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity={Math.min(1, (r - 0.5) * 2)}
                />
              )}
            </g>

            <g transform="translate(0 6) rotate(4 40 110)">
              <path d={botHalfPath} fill={`url(#${skinId})`} />
              <path
                d={`M 40 72
                    C ${rx3} 100, ${rx4} 134, ${tipBotX} 134
                    L ${tipBotX} 134 L 40 72 Z`}
                fill={skinDark}
                opacity="0.35"
              />
              <path
                d={`M ${lx2 + 1} 72 L ${rx2 - 1} 72`}
                stroke="#1a0805"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              {charSpots && (
                <path
                  d={`M ${lx2 + 2} 73 L ${rx2 - 2} 73`}
                  stroke="#0a0604"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity={Math.min(1, (r - 0.5) * 2)}
                />
              )}
            </g>

            <g>
              <ellipse cx="40" cy="70" rx="22" ry="10" fill="#a86a26" />
              <ellipse cx="40" cy="70" rx="20" ry="8" fill={`url(#${fleshId})`} />
              <ellipse cx="40" cy="69" rx="14" ry="5" fill="#ffe89a" opacity="0.7" />
              <g stroke="#c98a26" strokeWidth="0.5" fill="none" opacity="0.5">
                <path d="M 26 70 Q 40 68 54 70" />
                <path d="M 28 72 Q 40 70 52 72" />
                <path d="M 30 68 Q 40 66 50 68" />
              </g>
              <g fill="#5a3010" opacity="0.5">
                <circle cx="32" cy="70" r="0.6" />
                <circle cx="44" cy="71" r="0.6" />
                <circle cx="48" cy="69" r="0.6" />
              </g>
              <ellipse cx="38" cy="68" rx="10" ry="1.2" fill="#fff5cc" opacity="0.7" />
            </g>

            <g opacity="0.85" fill="none" stroke="#fff5e8" strokeWidth="1.6" strokeLinecap="round">
              <path d="M 32 60 Q 28 46 34 30">
                <animate
                  attributeName="opacity"
                  values="0.85;0.2;0.85"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </path>
              <path d="M 40 58 Q 44 44 40 26">
                <animate
                  attributeName="opacity"
                  values="0.7;0.15;0.7"
                  dur="2.4s"
                  repeatCount="indefinite"
                  begin="0.4s"
                />
              </path>
              <path d="M 48 60 Q 52 46 46 30">
                <animate
                  attributeName="opacity"
                  values="0.8;0.2;0.8"
                  dur="2.2s"
                  repeatCount="indefinite"
                  begin="0.8s"
                />
              </path>
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
```

⚠ `filter` 속성에 `blur(0.4)` 같은 inline 필터는 모든 브라우저에서 SVG 안에 안전하지 않으므로 제거. 디자인 원본에 있던 `filter="blur(0.4)"` 만 빼고 동일.

- [x] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [x] **Step 3: 커밋**

```bash
git add src/components/SweetPotato
git commit -m "feat(ui): port SweetPotato SVG with seed-driven shape"
```

---

## Task 14: PersonSilhouette 컴포넌트

**Files:**
- Create: `src/components/PersonSilhouette/PersonSilhouette.tsx`

- [x] **Step 1: 컴포넌트 포팅**

소스: `svg-v2.jsx` line ~371-419.

`src/components/PersonSilhouette/PersonSilhouette.tsx`:
```tsx
import type { ReactNode } from 'react';

interface PersonSilhouetteProps {
  variant?: number;
  scale?: number;
}

const VARIANTS: ReadonlyArray<ReactNode> = [
  // 1) 무릎 안기 (가장 흔한 캠핑 자세)
  <g key="v0">
    <circle cx="40" cy="20" r="12" />
    <path d="M 28 32 Q 22 50 20 80 L 14 110 Q 12 130 18 140 L 64 140 Q 70 130 68 110 L 60 80 Q 56 60 52 32 Q 46 28 40 28 Q 34 28 28 32 Z" />
    <path d="M 18 90 Q 26 100 34 108 L 36 124 Q 30 124 24 120 Q 16 112 14 100 Z" />
    <path d="M 62 90 Q 54 100 46 108 L 44 124 Q 50 124 56 120 Q 64 112 66 100 Z" />
  </g>,
  // 2) 책상다리, 무릎 손
  <g key="v1">
    <circle cx="40" cy="22" r="13" />
    <path d="M 26 36 Q 20 60 18 90 L 12 130 L 24 142 L 56 142 L 68 130 L 62 90 Q 60 60 54 36 Q 48 32 40 32 Q 32 32 26 36 Z" />
    <path d="M 14 130 Q 8 138 14 142 L 30 142 L 32 130 Z" />
    <path d="M 66 130 Q 72 138 66 142 L 50 142 L 48 130 Z" />
  </g>,
  // 3) 작은 후드 좌상
  <g key="v2">
    <path d="M 30 12 Q 22 6 32 -2 Q 40 -8 48 -2 Q 58 6 50 12 Q 56 22 52 32 Q 56 60 54 90 L 60 130 L 50 145 L 30 145 L 20 130 L 26 90 Q 24 60 28 32 Q 24 22 30 12 Z" />
    <path d="M 24 100 Q 16 112 22 124 L 32 130 L 36 120 Q 30 110 28 100 Z" />
    <path d="M 56 100 Q 64 112 58 124 L 48 130 L 44 120 Q 50 110 52 100 Z" />
  </g>,
  // 4) 살짝 뒤로 기댄 자세
  <g key="v3" transform="rotate(-4 40 80)">
    <circle cx="42" cy="22" r="12" />
    <path d="M 30 34 Q 24 56 22 88 L 16 128 L 22 142 L 60 142 L 66 128 L 62 88 Q 60 56 54 34 Q 48 30 42 30 Q 36 30 30 34 Z" />
    <path d="M 22 96 Q 14 108 20 122 L 30 130 Z" />
    <path d="M 62 96 Q 70 108 64 122 L 54 130 Z" />
  </g>,
  // 5) 무릎 위 턱 (컴팩트)
  <g key="v4">
    <circle cx="40" cy="24" r="11" />
    <path d="M 30 34 Q 22 56 22 88 L 18 124 Q 18 138 24 142 L 56 142 Q 62 138 62 124 L 58 88 Q 58 56 50 34 Q 46 30 40 30 Q 34 30 30 34 Z" />
    <path d="M 22 90 Q 14 100 20 116 L 32 122 Z" />
    <path d="M 58 90 Q 66 100 60 116 L 48 122 Z" />
  </g>,
];

export function PersonSilhouette({ variant = 0, scale = 1 }: PersonSilhouetteProps) {
  return (
    <svg
      width={80 * scale}
      height={170 * scale}
      viewBox="-10 -10 100 160"
      fill="#0a0805"
      stroke="#1a0e08"
      strokeWidth="1"
    >
      {VARIANTS[variant % VARIANTS.length]}
    </svg>
  );
}
```

- [x] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [x] **Step 3: 커밋**

```bash
git add src/components/PersonSilhouette
git commit -m "feat(ui): port PersonSilhouette with 5 sitting variants"
```

---

## Task 15: StarrySky 컴포넌트

**Files:**
- Create: `src/components/StarrySky/StarrySky.tsx`
- Create: `src/components/StarrySky/StarrySky.module.css`

- [x] **Step 1: 모듈 CSS 작성 — globals.css에서 별 관련 스타일을 옮김**

`src/components/StarrySky/StarrySky.module.css`:
```css
.starrySky {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 60%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  user-select: none;
}
.skyGrad {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 90% 70% at 50% 110%, #2a1a1c 0%, #1a1126 35%, #0c0a1f 70%, #050416 100%);
}
.moon {
  position: absolute;
  right: 14%;
  top: 16%;
  width: 18px;
  height: 18px;
  background: radial-gradient(circle, #fff5d8 0%, #f5e4b0 60%, #d8c280 100%);
  border-radius: 50%;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.2) inset;
}
.moonGlow {
  position: absolute;
  right: calc(14% - 30px);
  top: calc(16% - 30px);
  width: 78px;
  height: 78px;
  background: radial-gradient(circle, rgba(255, 245, 210, 0.18) 0%, transparent 65%);
  border-radius: 50%;
}
.starDot {
  position: absolute;
  background: #fff5e8;
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(255, 245, 220, 0.6);
}
.blink {
  animation: starBlink ease-in-out infinite;
}
```

⚠ `starBlink` keyframe은 globals.css에 정의되어 있으므로 모듈 CSS에서 참조만 한다 (모듈 CSS는 keyframe 이름을 글로벌로 안 띄움. CSS Modules에서 `:global(starBlink)` 사용해서 글로벌 keyframe 참조).

수정: `.blink { animation-name: starBlink; ... }` 가 안 먹으면, keyframe 자체를 모듈 CSS에 두고 클래스에서만 사용:

`.blink { animation: blink ease-in-out infinite; } @keyframes blink { 0%,100% { opacity: var(--op,0.8); transform: scale(1); } 50% { opacity: 0.15; transform: scale(0.6); } }`

- [x] **Step 2: 컴포넌트 작성**

`src/components/StarrySky/StarrySky.tsx`:
```tsx
'use client';
import { useMemo } from 'react';
import styles from './StarrySky.module.css';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  op: number;
  blink: boolean;
  dur: number;
  delay: number;
}

export function StarrySky() {
  const stars = useMemo<Star[]>(() => {
    const arr: Star[] = [];
    for (let i = 0; i < 180; i++) {
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 65,
        size: 0.5 + Math.random() * 1.6,
        op: 0.3 + Math.random() * 0.7,
        blink: Math.random() > 0.7,
        dur: 2 + Math.random() * 5,
        delay: Math.random() * 5,
      });
    }
    return arr;
  }, []);

  return (
    <div className={styles.starrySky}>
      <div className={styles.skyGrad} />
      <div className={styles.moon} />
      <div className={styles.moonGlow} />
      {stars.map((s) => (
        <div
          key={s.id}
          className={`${styles.starDot} ${s.blink ? styles.blink : ''}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.op,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
```

⚠ `'use client'` 필수 — Math.random은 SSR/CSR mismatch를 유발한다. useMemo로 mount-after only 한 번만 계산.

⚠ Hydration 안전: 첫 SSR에서 별 0개 렌더 → mount 후 채움. 또는 `'use client'` 단독으로도 충분(클라이언트에서만 처음 렌더).

- [x] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공. hydration 에러 없음.

- [x] **Step 4: 커밋**

```bash
git add src/components/StarrySky
git commit -m "feat(ui): port StarrySky with deterministic-after-mount stars"
```

---

## Task 16: NightField 컴포넌트

**Files:**
- Create: `src/components/NightField/NightField.tsx`

소스: `svg-v2.jsx` line ~469-494. SSR 안전 (useMemo 안 씀).

- [x] **Step 1: 컴포넌트 작성**

`src/components/NightField/NightField.tsx`:
```tsx
export function NightField() {
  return (
    <svg
      preserveAspectRatio="none"
      viewBox="0 0 100 30"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '30%',
        pointerEvents: 'none',
        zIndex: 1,
        userSelect: 'none',
      }}
    >
      <defs>
        <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1a18" />
          <stop offset="40%" stopColor="#15100a" />
          <stop offset="100%" stopColor="#080403" />
        </linearGradient>
      </defs>
      <path d="M 0 4 Q 30 2 50 5 Q 70 7 100 4 L 100 30 L 0 30 Z" fill="url(#fieldGrad)" />
    </svg>
  );
}
```

- [x] **Step 2: 커밋**

```bash
git add src/components/NightField
git commit -m "feat(ui): port NightField ground gradient"
```

---

## Task 17: BonfireScene 오케스트레이터 — 첫 골격 (가짜 트래픽 없음)

**Files:**
- Create: `src/components/BonfireScene/BonfireScene.tsx`
- Create: `src/components/BonfireScene/BonfireScene.module.css`
- Modify: `src/app/page.tsx`

이 태스크는 페이지가 일단 보이게 하는 것. 데이터/효과 없이 정적 씬만.

- [x] **Step 1: 모듈 CSS — 스테이지/모닥불/실루엣/입력바/피드 레이아웃**

`src/components/BonfireScene/BonfireScene.module.css`: 디자인 번들 `styles-v2.css`의 다음 클래스를 옮긴다(`.starry-sky` 류 등 별도 컴포넌트로 이미 옮긴 것 제외):
- `.stage` (이미 globals에 있음 — 모듈에는 두지 않음)
- `.fog-layer` → `.fogLayer`
- `.header`, `.brand`, `.signBoard`, `.brandTitle`, `.brandSub`, `.meta`, `.metaCard`, `.metaLabel`, `.metaValue` (Header 분리 시 옮김)
- `.bonfireZone`, `.shake`, `.dragover`
- `.campfireFlames`, `.flame`, `.fBack`, `.fMid`, `.fFront`, `.fCore` (필요 시 globals에 keyframe)
- `.potatoRow`, `.potatoItem`, `.cracked`
- `.silhouettes`, `.silhouette`, `.silhouetteNick`, `.silhouetteBubble`
- `.flames`, `.fireGlow`, `.emberLayer`, `.emberParticle`
- `.dragHint`, `.show`
- `.comfort`, `.comfortQuote`, `.comfortQuoteEn`
- `.feed`, `.feedHeader`, `.feedItem`, `.fading`, `.feedMeta`, `.feedNick`, `.feedTime`, `.blink`
- `.soundToggle`
- `.stokeButton`
- `.inputZone`, `.inputBar`, `.glow`, `.inputHint`, `.nick`
- `.pileCounter`, `.grain`

⚠ CSS Modules에서 카멜케이스 클래스명을 권장. 디자인 원본의 케밥케이스를 카멜로 변환.
⚠ keyframe 이름은 모두 globals.css에 두기 — CSS Modules가 keyframe 이름을 자동 mangling해서 커스텀 props (`--target-x` 등) 와 호환이 깨질 수 있음.

이 단계에서 module CSS는 디자인 번들 styles-v2.css 의 모든 컴포넌트 클래스를 1:1로 옮긴다. 매우 길지만 1회성 작업. 변환 시:
- 클래스 이름을 카멜케이스로
- `:root` 토큰 참조는 그대로(`var(--ember)`) — globals.css에서 정의되어 있음
- keyframe 호출은 그대로 — globals.css의 글로벌 keyframe 사용

- [x] **Step 2: BonfireScene 첫 버전 작성 — 정적 더미 상태로 모든 시각 요소 렌더**

`src/components/BonfireScene/BonfireScene.tsx`:
```tsx
'use client';
import { Campfire } from '@/components/Campfire/Campfire';
import { SweetPotato } from '@/components/SweetPotato/SweetPotato';
import { PersonSilhouette } from '@/components/PersonSilhouette/PersonSilhouette';
import { StarrySky } from '@/components/StarrySky/StarrySky';
import { NightField } from '@/components/NightField/NightField';
import styles from './BonfireScene.module.css';

export function BonfireScene() {
  // 더미: 사람 6명, 고구마 3개
  const dummyPotatoes = [0, 1, 2];
  const dummySilhouettes = [
    { x: 20, y: 80, scale: 0.7, variant: 0, flip: false, nick: '지친_구름_07' },
    { x: 35, y: 100, scale: 0.6, variant: 1, flip: false, nick: 'tired-cloud-12' },
    { x: 50, y: 110, scale: 0.5, variant: 2, flip: false, nick: '조용한_고양이_03' },
    { x: 65, y: 100, scale: 0.6, variant: 3, flip: true, nick: 'lonely-lamp-44' },
    { x: 80, y: 80, scale: 0.7, variant: 4, flip: true, nick: '흩어진_엽서_28' },
    { x: 50, y: 30, scale: 0.85, variant: 0, flip: false, nick: '낡은_라디오_91' },
  ];

  const slots: Array<{ x: number; y: number; z: number; s: number; r: number }> = [
    { x: -48, y: 0, z: 1, s: 0.95, r: -68 },
    { x: -18, y: 6, z: 2, s: 1.0, r: 22 },
    { x: 12, y: 4, z: 1, s: 0.92, r: -18 },
    { x: 38, y: 0, z: 2, s: 1.05, r: 70 },
    { x: -32, y: -4, z: 0, s: 1.0, r: -28 },
    { x: 24, y: -2, z: 0, s: 0.98, r: 32 },
    { x: -2, y: 10, z: 3, s: 1.05, r: 0 },
  ];

  return (
    <div className="stage">
      <StarrySky />
      <NightField />
      <div className={styles.fogLayer} />

      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.signBoard}>
            <span className={styles.triangle} />
            <span>CAMP 04 · 감정 군고구마</span>
          </div>
          <div className={styles.brandTitle}>감정 쓰레기통</div>
          <div className={styles.brandSub}>throw it in the campfire · 익명 군고구마</div>
        </div>
        <div className={styles.meta}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Around fire</span>
            <span className={styles.metaValue}>
              <span className={styles.liveDot} />24
            </span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Roasted tonight</span>
            <span className={styles.metaValue}>8,421</span>
          </div>
        </div>
      </header>

      <div className={styles.silhouettes}>
        {dummySilhouettes.map((s, i) => (
          <div
            key={i}
            className={styles.silhouette}
            style={{
              left: `calc(${s.x}% - 40px)`,
              bottom: `${s.y}px`,
              transform: s.flip ? 'scaleX(-1)' : 'none',
            }}
          >
            <div
              className={styles.silhouetteNick}
              style={{ transform: `translateX(-50%) ${s.flip ? 'scaleX(-1)' : ''}` }}
            >
              @{s.nick}
            </div>
            <PersonSilhouette variant={s.variant} scale={s.scale} />
          </div>
        ))}
      </div>

      <div className={styles.fireGlow} style={{ opacity: 0.7 }} />

      <div className={styles.bonfireZone}>
        <Campfire width={280} fireIntensity={1} />
        <div className={styles.potatoRow}>
          {dummyPotatoes.map((id, i) => {
            const slot = slots[i % slots.length];
            return (
              <div
                key={id}
                className={styles.potatoItem}
                style={{
                  left: `calc(50% + ${slot.x}px)`,
                  bottom: `${slot.y}px`,
                  zIndex: 16 + slot.z,
                  transform: `translateX(-50%) rotate(${slot.r}deg) scale(${slot.s})`,
                }}
              >
                <SweetPotato size={36} seed={id + 1} roastLevel={id * 0.3} />
              </div>
            );
          })}
        </div>
        <div className={styles.campfireFlames} style={{ ['--intensity' as string]: '1' }}>
          <div className={`${styles.flame} ${styles.fBack}`} />
          <div className={`${styles.flame} ${styles.fMid}`} />
          <div className={`${styles.flame} ${styles.fFront}`} />
          <div className={`${styles.flame} ${styles.fCore}`} />
        </div>
      </div>

      <div className={styles.grain} />
    </div>
  );
}
```

- [x] **Step 3: page.tsx 교체**

`src/app/page.tsx`:
```tsx
import { BonfireScene } from '@/components/BonfireScene/BonfireScene';

export default function Page() {
  return <BonfireScene />;
}
```

- [x] **Step 4: 개발 서버 띄워 시각 확인**

Run: `npm run dev`
Expected: 별, 모닥불, 사람 실루엣 6명, 고구마 3개가 나타나고 불꽃이 leap 애니메이션, 별이 blink. 콘솔 hydration warning 없음.

- [x] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(ui): static BonfireScene with all visual elements wired"
```

---

## Task 18: BonfireScene — 진짜 상태 / 가짜 트래픽 / 인터랙션

**Files:**
- Modify: `src/components/BonfireScene/BonfireScene.tsx`

이제 디자인 번들의 `app-v2.jsx` 의 모든 React 상태와 effect를 옮긴다. SSR/CSR mismatch 방지를 위해 `Date.now()`/`Math.random()` 호출은 useEffect 내부 또는 mount 후로 미룬다.

- [x] **Step 1: 상태/훅 추가 — 디자인 번들의 모든 상태 1:1**

대상 상태(소스 `app-v2.jsx`):
- `feedMessages: ChatMessage[]`
- `comfortMsg: ComfortLine | null`
- `embers: EmberParticle[]`
- `shake: boolean`
- `muted: boolean`
- `audioStarted: boolean`
- `onlineCount: number` (초기 24)
- `totalBurned: number` (초기 8421)
- `placeholder: string`
- `draftMessage: string`
- `myNick: string` (mount 후 makeNickname())
- `dragOverFire: boolean`
- `silhouettes: SilhouetteEntity[]`
- `activeBubbles: Record<number, ActiveBubble>`
- `pile: PotatoState[]`

ID generators는 `useRef(1)`.

- [x] **Step 2: 모든 useEffect 포팅**
  1. **silhouettes 동기화** — `onlineCount` 변경 시 visualMax=30까지 추가/제거 + `layoutPos` 적용
  2. **fake online drift** — 6초마다 ±1
  3. **fake stream** — 2.4~6.4초 랜덤 간격으로 `pushMessageFromCrowd`
  4. **comfort drift** — 6초 후 시작, 26초마다 7초 표시
  5. **placeholder rotate** — 7초마다
  6. **sparse embers** — 600ms마다 ember 추가, duration 후 제거
  7. **roast ticker** — `requestAnimationFrame` 루프로 모든 pile의 roast 진행, 1.0 도달 시 cracked, CRACK_DURATION_MS 후 제거 + totalBurned++
  8. **BGM 자동 시작** — 첫 pointerdown/keydown 후 `AudioEngine.startBgm()`
  9. **muted 동기화** — `muted` 변화 시 AudioEngine에 반영

- [x] **Step 3: 핸들러 함수 포팅**
  - `pushMessageFromCrowd({ text, nick, sIdx })`
  - `spawnPotatoAtFire(msg)` (MAX_POTATOES=7, 가장 오래된 비-cracked 것 pop)
  - `pokeFire()` (shake + 모든 pile roast +18% + 추가 ember 8개 burst)
  - `submit(e)`
  - `onFireDragOver/Leave/Drop`
  - `onInputDragStart`

- [x] **Step 4: JSX 확장 — 피드/Comfort/입력바/Sound·Stoke 토글/말풍선 활성화**

소스 `app-v2.jsx` line ~367-587의 JSX 구조를 그대로 옮긴다. Tweaks 패널은 이번 Phase에서 생략(별도 Task 21 옵션).

- [x] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 성공. 타입 에러 없음.

- [x] **Step 6: 개발 서버에서 시각/인터랙션 확인**

Run: `npm run dev`

확인 체크리스트:
- 별 깜빡임 + 달 + 안개
- 모닥불 X자 통나무 + 돌 둘레 + 불꽃 leap 애니
- 사람 실루엣들이 모닥불 둘러싸고 있음. 닉네임 라벨 보임
- 가짜 채팅이 사이드 피드에 등장 → 1.5초 뒤 고구마가 모닥불 위에 등장
- 고구마는 18초 정도에 걸쳐 색이 진해지고, 다 익으면 가로로 쪼개져서 노란 속살 + 김
- 클릭(또는 stoke 버튼)하면 모닥불이 흔들리고 모든 고구마 굽기 18% 점프
- 입력 → Enter 시 본인 메시지 즉시 모닥불 위 고구마로
- Comfort 메시지가 가끔 페이드인/아웃
- BGM이 첫 클릭 후 재생됨
- Sound on/off 토글 동작
- 콘솔 에러/경고 없음

- [x] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat(ui): wire BonfireScene with state, fake traffic, interactions"
```

---

## Task 19: Hydration 안전 가드 — 클라이언트 초기값

**Files:**
- Modify: `src/components/BonfireScene/BonfireScene.tsx`

`Date.now()`, `Math.random()`, `performance.now()` 등이 첫 렌더에 호출되면 SSR/CSR 불일치 발생. SSR 비활성화 또는 mount-after 가드.

- [x] **Step 1: page.tsx에서 BonfireScene을 동적 import + ssr:false 로 마운트 후 로드**

`src/app/page.tsx`:
```tsx
import dynamic from 'next/dynamic';

const BonfireScene = dynamic(
  () => import('@/components/BonfireScene/BonfireScene').then((m) => m.BonfireScene),
  { ssr: false, loading: () => <div className="stage" /> }
);

export default function Page() {
  return <BonfireScene />;
}
```

⚠ Next.js 15에서 server component는 `ssr: false`를 직접 못 쓴다. 한번 wrapping이 필요. 한 가지 방법:

`src/app/page.tsx`를 server component로 두고, 그 안에서 client wrapper를 import:

`src/components/BonfireScene/BonfireSceneClient.tsx`:
```tsx
'use client';
import dynamic from 'next/dynamic';

const BonfireScene = dynamic(
  () => import('./BonfireScene').then((m) => m.BonfireScene),
  { ssr: false, loading: () => <div className="stage" /> }
);

export default function BonfireSceneClient() {
  return <BonfireScene />;
}
```

`src/app/page.tsx`:
```tsx
import BonfireSceneClient from '@/components/BonfireScene/BonfireSceneClient';

export default function Page() {
  return <BonfireSceneClient />;
}
```

- [x] **Step 2: 빌드/런타임 확인**

Run: `npm run dev`
Expected: hydration warning 0건. 검은 stage가 잠시 보이고 곧 씬 등장.

- [x] **Step 3: 커밋**

```bash
git add -A
git commit -m "fix(hydration): defer BonfireScene client-only render to avoid SSR mismatch"
```

---

## Task 20: README — 프로젝트 소개 및 실행 방법

**Files:**
- Modify: `README.md`

- [x] **Step 1: README 작성**

`README.md` 전체 교체:
````markdown
# 감정 쓰레기통 · Burn Emotion 🔥🍠

밤 들판의 모닥불에 감정을 던지면 군고구마가 됩니다. 익명으로, 조용히, 천천히.

> Phase 1: 단일 사용자 시각 클론 + 가짜 트래픽
> Phase 2 (예정): Supabase Realtime 멀티유저 채팅
> Phase 3 (예정): SEO/GEO 최적화 + /en 미러
> Phase 4 (예정): Vercel 배포

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000

## 스택

- Next.js 15 (App Router) + React 19 + TypeScript
- CSS Modules + 디자인 토큰 (Pretendard, Special Elite, Space Grotesk)
- Web Audio API (효과음) + HTMLAudioElement (BGM)
- Vitest (유틸 함수 테스트)

## 디자인 출처

Claude Design 핸드오프 번들 `Emotional Trash Can v2`. 캠프파이어 + 군고구마 컨셉.

## 디렉토리

- `src/app/`        — Next 라우트
- `src/components/` — UI 컴포넌트 (PascalCase 폴더 단위)
- `src/lib/`        — 도메인 로직, 데이터, 오디오
- `public/audio/`   — 모닥불 BGM
- `docs/superpowers/plans/` — 구현 플랜

## 테스트

```bash
npm test
```
````

- [x] **Step 2: 커밋**

```bash
git add README.md
git commit -m "docs: write README with project intro and run instructions"
```

---

## Task 21: 시각 회귀 — 디자인 번들 스크린샷과 직접 비교 (수동 검증)

**Files:** N/A (검증)

- [x] **Step 1: 디자인 번들 스크린샷 확인**

레퍼런스: `/tmp/design-extract/emotional-trash-can/project/screenshots/v5.png` (가장 최신 디자인 결과로 추정).

- [x] **Step 2: dev 서버에서 동일 viewport(1280x800)로 스크린샷 캡처 시도**

Run: `npm run dev` 후 사용자에게 시각 확인 요청. (자동 시각 회귀는 Phase 4에서 Playwright로 추가.)

- [x] **Step 3: 시각 차이 항목 트래킹**

차이가 있으면 각각을 별도 follow-up 태스크로 만든다(예: "별 크기가 너무 큼", "고구마 위치 보정", "사람 실루엣 색감"). 이번 플랜이 아니라 follow-up 플랜으로.

---

## Self-Review (플랜 작성자)

**Spec coverage:**
- ✅ 캠프파이어(X자 통나무 + 돌) — Task 12
- ✅ 호박고구마(자동 굽기 + 가로 쪼개짐 + 김) — Task 13, 18
- ✅ 별/달/안개 — Task 15, 17
- ✅ 사람 실루엣(접속자 수만큼) + 닉네임 라벨 + 말풍선 — Task 14, 17, 18
- ✅ 사이드 피드 — Task 17, 18
- ✅ Comfort 메시지 페이드 — Task 17, 18
- ✅ Stoke 버튼 + 흔들림 — Task 18
- ✅ BGM + Sound on/off — Task 11, 18
- ✅ 입력바 + Enter/Drag — Task 18
- ✅ 한국어 메인 lang — Task 3
- ✅ Hydration 안전 — Task 19
- 🔜 Tweaks 패널 — Phase 1 범위 외 (UX 노출 안 됨)
- 🔜 Realtime — Phase 2
- 🔜 SEO 메타 디테일/JSON-LD/llms.txt/sitemap — Phase 3
- 🔜 /en 미러 — Phase 3
- 🔜 배포 — Phase 4

**Placeholder 스캔:** "TBD" / "implement later" / "similar to Task N" 사용 0건. ✅

**Type 일관성:** `ChatMessage`, `PotatoState`, `SilhouetteEntity`, `ActiveBubble`, `EmberParticle` — Task 10에서 정의 후 Task 18에서 사용. 이름 통일. ✅

**프로젝트 구조 분리:** UI/lib/data/types/audio가 명확히 분리되고, BonfireScene이 비대해지면 useBonfireState 훅으로 분리하도록 미리 명시. ✅

**Phase 분할 적정성:** Phase 1만으로도 사용자에게 보여줄 수 있는 단일 사용자 데모 완성. Phase 2~4는 별도 spec 추출 후 별도 plan으로 작성. ✅
