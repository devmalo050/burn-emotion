# 군고구마 굽기 · Burn Emotion

밤 들판의 모닥불 옆에서 채팅을 치면 군고구마가 익어갑니다. 익명으로, 조용히, 천천히.

> Phase 1: ✅ 단일 사용자 시각 클론
> Phase 2: ✅ 실시간(자체 WS) 멀티유저 + 카운터
> Phase 3: ✅ SEO/GEO 최적화
> Phase 4: ✅ 자체 컨테이너 배포 (Docker standalone / Coolify)

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000

`.env.local`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5435/burn_emotion
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 스택

- Next.js 16 (App Router) + React 19 + TypeScript
- CSS Modules + 디자인 토큰 (Pretendard, Special Elite, Space Grotesk)
- 자체 WebSocket 릴레이 서버 (ws, broadcast + presence) + Postgres (일자별 카운터)
- Web Audio API (효과음) + HTMLAudioElement (BGM)
- Vitest (유틸 함수 테스트)

## SEO/GEO

- 동적 OG 이미지 (`src/app/opengraph-image.tsx`)
- JSON-LD (`WebApplication` + `FAQPage`)
- sitemap, robots, llms.txt
- SSR 콘텐츠 (sr-only h1/FAQ — 크롤러용)

## 디렉토리

- `src/app/` — Next 라우트, 메타데이터, OG, sitemap, robots
- `src/components/` — UI 컴포넌트
- `src/lib/` — 도메인 로직, 데이터, 실시간 클라이언트, 오디오
- `public/audio/` — 모닥불 BGM
- `public/llms.txt` — 생성형 검색용
- `docs/superpowers/plans/` — 구현 플랜

## 테스트

```bash
npm test
```
