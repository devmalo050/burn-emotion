# 군고구마 굽기 · Burn Emotion

밤 들판의 모닥불 옆에서 채팅을 치면 군고구마가 익어갑니다. 익명으로, 조용히, 천천히.

> Phase 1: 단일 사용자 시각 클론 + 가짜 트래픽 (현재)
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

- Next.js 16 (App Router) + React 19 + TypeScript
- CSS Modules + 디자인 토큰 (Pretendard, Special Elite, Space Grotesk)
- Web Audio API (효과음) + HTMLAudioElement (BGM)
- Vitest (유틸 함수 테스트)

## 디자인 출처

Claude Design 핸드오프 번들 `Emotional Trash Can v2`. 캠프파이어 + 군고구마 컨셉.

## 디렉토리

- `src/app/` — Next 라우트
- `src/components/` — UI 컴포넌트 (PascalCase 폴더 단위)
- `src/lib/` — 도메인 로직, 데이터, 오디오
- `public/audio/` — 모닥불 BGM
- `docs/superpowers/plans/` — 구현 플랜

## 테스트

```bash
npm test
```

***REMOVED***