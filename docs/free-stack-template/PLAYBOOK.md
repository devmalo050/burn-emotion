# 무료 한국어 웹 서비스 부트스트랩 매뉴얼

이 문서는 **개인 개발자 한 명이 도메인 갱신비 외 운영비 0원으로** 익명/소규모 한국어 웹 서비스를 띄우고 운영하기 위한 단계별 매뉴얼이다. 특정 서비스 컨셉에 의존하지 않는다.

---

## 0. 아키텍처

| 레이어 | 선택 | 무료 한도 | 초과 시 |
|---|---|---|---|
| Frontend / Edge SSR | **Next.js 16 (App Router) + Cloudflare Workers** | 일 100,000 요청, CPU 10ms/req | $5/월~ |
| Backend / Realtime / DB | **Supabase** (Postgres + Realtime + RPC) | DB 500MB, 대역폭 2GB/월, Realtime 동시 200명·메시지 2M/월 | $25/월~ (Pro) |
| 코드 저장소 | **GitHub** (private repo) | 무제한 | 협업자 늘 때만 유료 |
| CI/CD | **Cloudflare 자동 빌드** (git push 트리거) | 빌드 분 무제한 | — |
| 분석 | **Google Analytics 4** | 월 1000만 이벤트 | 사실상 무제한 |
| 검색 등록 | Google Search Console + Naver SearchAdvisor | 무제한 | — |
| 도메인 | Cloudflare Registrar / 가비아 / 후이즈 | **유료** (`.net` 연 ~$10) | — |

전제: **JS 클라이언트 ↔ Supabase 직접 통신**. 별도 백엔드 서버 없음. 인증/RLS 필요한 데이터는 Supabase Row Level Security 로 보호.

---

## 1. 사전 준비 (모두 무료 가입)

1. GitHub 계정
2. Cloudflare 계정 (배포용)
3. Supabase 계정 (DB/Realtime)
4. Google 계정 (Analytics + Search Console)
5. Naver 계정 (SearchAdvisor)
6. 도메인 (필요할 때만)

CLI 도구 (로컬):
```bash
node -v          # 20+ 권장
npm i -g wrangler
```

---

## 2. 프로젝트 부트스트랩

```bash
npx create-next-app@latest my-service --typescript --tailwind=false --app --src-dir
cd my-service
npm i @supabase/supabase-js
npm i -D @opennextjs/cloudflare wrangler
```

`next.config.ts` 는 기본값 그대로 둔다 (output: 'export' 같은 거 추가하지 말 것).

### Next 가이드 위치
**중요**: Next.js 16 은 학습 데이터의 Next 13/14 와 API 가 다르다. 코드 짤 때 `node_modules/next/dist/docs/` 안의 가이드를 먼저 읽는 습관을 들인다.

---

## 3. Supabase 셋업

### 3.1 프로젝트 생성
`supabase.com → New project`. 리전은 **Tokyo (ap-northeast-1)** 권장 (한국에서 가장 가까움).

### 3.2 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
`anon key` 는 클라이언트에 노출돼도 되는 키. **service_role key 는 절대 클라이언트에 두지 말 것.**

### 3.3 클라이언트 lazy-init 패턴
```ts
// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
export function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}
```
**이유**: 환경변수 빠진 빌드 환경에서도 코드가 터지지 않게.

### 3.4 Realtime 사용 패턴
- **broadcast** — 휘발성 메시지. DB 안 거치고 채널로만 흐름. 채팅 메시지 같은 거.
- **presence** — 누가 들어와 있나. key 는 닉네임이 아니라 **세션 UUID** 로. 새로고침 시 옛 슬롯이 timeout 까지 ghost 로 남는 걸 막음.
- **postgres_changes** — DB 변경 이벤트. replica identity / RLS 설정 잘못하면 안 흘러옴. 가능하면 broadcast 로 우회.

### 3.5 RPC 패턴 (서버 카운터 등)
- Postgres function 으로 정의 → 클라이언트에서 `supabase.rpc('함수명')` 호출.
- 함수 정의는 Supabase Dashboard → SQL Editor 에서 실행.
- bigint 리턴은 클라이언트에 **문자열로 옴**. `parseInt(String(data), 10)` 로 변환.

---

## 4. Cloudflare Workers 배포

### 4.1 OpenNext 어댑터 설정
```ts
// open-next.config.ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
export default defineCloudflareConfig({});
```

```jsonc
// wrangler.jsonc
{
  "name": "my-service",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" }
}
```

```json
// package.json (scripts)
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

### 4.2 Cloudflare 대시보드에서 Worker 만들기
`Workers & Pages → Create → Connect to Git`.
- Build command: `npm run deploy` 를 직접 쓰지 말고 **`opennextjs-cloudflare build`** 만.
- Build output: `.open-next/assets`
- Worker entry: `.open-next/worker.js`
- Production branch: `main`

### 4.3 환경변수
Cloudflare Worker → Settings → Variables 에서 **production / preview 양쪽에 다 추가**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (도메인 붙이면 그걸로, 아니면 workers.dev URL)
- `NEXT_PUBLIC_GA_ID` (선택)

**`NEXT_PUBLIC_*` 변수 변경 후엔 무조건 재배포해야 반영된다.** 변화 없으면 `git commit --allow-empty -m "redeploy"` 로 트리거.

---

## 5. 도메인 연결 (선택)

1. 도메인 등록자에서 도메인 구입 (Cloudflare Registrar 추천 — 갱신비 가장 저렴).
2. Cloudflare 대시보드 → Worker → Settings → Triggers → Custom Domains → Add → 도메인 입력.
3. DNS 가 다른 등록자라면 NS 를 Cloudflare 로 변경 후 자동 SSL 발급.
4. `NEXT_PUBLIC_SITE_URL` 를 새 도메인으로 업데이트하고 재배포.

전파에 수 분~수 시간 걸릴 수 있음 (KT/SKT DNS 캐시 등).

---

## 6. SEO / GEO 기본 셋업

### 6.1 metadata + viewport
```tsx
// src/app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: '...', template: '%s · 사이트명' },
  description: '...',
  keywords: ['키워드1', ...],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', locale: 'ko_KR', url: SITE_URL, siteName: '사이트명',
    title: '...', description: '...',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, type: 'image/png', alt: '...' }],
  },
  twitter: { card: 'summary_large_image', title: '...', description: '...', images: ['/opengraph-image'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  verification: { other: { 'naver-site-verification': '...' } },
};
export const viewport: Viewport = { themeColor: '#000', width: 'device-width', initialScale: 1 };
```

### 6.2 동적 이미지
- `src/app/opengraph-image.tsx` — Satori 로 1200×630 OG 이미지 생성.
- `src/app/icon.tsx` — favicon. emoji 사용 가능 (`fontSize: 28`, `background: 'transparent'`).
- **Satori 는 한국어 한글 폰트 자동 미포함**. 한글 텍스트가 깨지면 폰트를 fetch 해서 옵션으로 넘겨야 함.

### 6.3 sitemap / robots
- `src/app/sitemap.ts`, `src/app/robots.ts` — Next 16 의 metadata route.
- `SITE_URL` 만 환경변수에서 빼서 쓰면 됨.

### 6.4 JSON-LD 구조화 데이터
`src/components/JsonLd/JsonLd.tsx` 만들어서 `<script type="application/ld+json">` 두 개 (WebApplication, FAQPage). 검색 리치 결과 노출 가능성 ↑.

### 6.5 SSR 안전 콘텐츠 (sr-only 패턴)
클라이언트 전용 컴포넌트 (`dynamic({ ssr: false })`) 만 페이지에 있으면 크롤러가 빈 화면을 본다. 시각적으론 안 보이지만 DOM 엔 있는 `sr-only` 콘텐츠 (h1/h2/p/FAQ) 를 같이 렌더해서 SEO 본문 확보.

### 6.6 GEO (Generative Engine Optimization)
- `public/llms.txt` — Perplexity/ChatGPT/Claude 가 사이트 의미를 빨리 파악하게 하는 평문. 사이트 한 줄 요약 + 핵심 FAQ.
- 본문에 자연어 Q&A 패턴 (sr-only) 이 LLM 인용에도 유리.

### 6.7 검색엔진 등록
- **Google Search Console** → URL 접두어 / 도메인 모두 등록 → `verification.other` 또는 DNS TXT 로 인증 → sitemap 제출.
- **Naver SearchAdvisor** → 사이트 등록 → 메타 태그 인증 → sitemap 제출.
- 색인까지 수일~수주.

---

## 7. Google Analytics 4

1. analytics.google.com → 속성 생성 → 측정 ID (`G-XXXXXXXXXX`).
2. `NEXT_PUBLIC_GA_ID` 환경변수에 넣음.
3. `@next/third-parties` 설치 후 `<GoogleAnalytics gaId={GA_ID} />` 를 `layout.tsx body` 에 추가.

---

## 8. 운영 시 함정 / 체크리스트

이 스택을 처음 만지면 마주칠 가능성이 높은 함정들.

### Realtime / 동기화
- **presence key 는 세션 UUID 로** — 닉네임을 키로 쓰면 새로고침 시 ghost 30초.
- **pagehide / beforeunload 는 못 받는 브라우저 있음** (Whale 등). 못 받아도 Supabase 자체 timeout (~30s) 으로 정리는 됨.
- **heartbeat + stale filter 패턴은 위험** — background tab throttling 으로 false positive 발생 (멀쩡한 사람도 사라짐). 가능한 한 Supabase native presence 신뢰.
- **postgres_changes 안 흘러올 때** — replica identity / RLS / publication 설정 확인. 안 풀리면 broadcast 로 우회.

### React 18+
- **`setState((prev) => ...)` 업데이터 안의 side effect 는 render 시점에 호출됨**. setState 호출 직후 외부 flag 읽으면 거짓 값 보임. 옆 변수에 의존하지 말고 업데이터 안에서 직접 처리.
- **`requestAnimationFrame` 은 백그라운드 탭에서 멈춤**. 시간 기반 진행이 필요한 경우 `setInterval` 백업 + wall-clock 계산 (`now - startedAt`) 으로 보완.
- **StrictMode 에서 effect/updater 두 번 호출** — 부작용은 idempotent 하게.

### Supabase
- **무료 플랜 7일 비활성 시 paused**. 본인이 자주 들어가면 paused 안 됨. paused 되면 대시보드에서 재개.
- **DB 비밀번호는 절대 클라이언트/레포에 두지 말 것**. 노출되면 즉시 회전 + `git filter-repo` 로 history 청소 + force-push.
- **bigint RPC 반환은 문자열** — 클라이언트에서 파싱.

### Cloudflare
- **환경변수 변경 후 재배포 필수**. push 없을 땐 `--allow-empty` 커밋.
- **Workers Free 일 100K req 제한** — 정상 운영 중에 도달하면 좋은 신호. 도달 임박 시 알람 설정.

### Next 16
- App Router · React 19 기반. 학습 데이터의 Next 13/14 API 와 다름. `node_modules/next/dist/docs/` 먼저 확인.
- 클라이언트 전용 컴포넌트는 `'use client'` + 가능하면 `next/dynamic({ ssr: false })` 로 hydration mismatch 회피.

---

## 9. 유지보수 사이클

- **주 1회**: Cloudflare Analytics 에서 일 요청 수 확인 (무료 한도 근접 여부).
- **주 1회**: Supabase 대시보드에서 DB/스토리지 사용량 확인 + paused 안 됐는지.
- **월 1회**: `npm outdated` → 메이저 버전 업그레이드는 별도 브랜치에서.
- **검색 등록 후 2-4주**: GSC / SearchAdvisor 색인 상태 점검.

---

## 10. 백업 / 종료 시나리오

- 종료할 거면: Supabase 프로젝트 일시 정지 (paused 두면 데이터 90일 보존), Cloudflare Worker 삭제, 도메인 갱신 끄기.
- 데이터 백업: `pg_dump` 로 한 번 받아 두면 끝.
- 코드는 GitHub 에 그대로 남아 있으므로 부활 가능.
