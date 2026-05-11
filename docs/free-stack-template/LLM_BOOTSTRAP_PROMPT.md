# LLM 부트스트랩 프롬프트

이 폴더의 `PLAYBOOK.md` 가 정한 "도메인 갱신비만 무료" 아키텍처로 새 한국어 웹 서비스를 만들 때, **아래 프롬프트를 LLM (Claude / ChatGPT / Gemini) 에 그대로 붙여넣고 빈칸만 채워 넣는다.**

---

## 사용법

1. 새 GitHub 레포를 만들고 빈 폴더에서 LLM CLI 또는 채팅을 띄운다.
2. 아래 `## 프롬프트 본문` 의 코드 블록 전체를 복사해 LLM 에 입력한다.
3. `<<...>>` 표시된 빈칸을 본인 컨셉으로 바꾼다.
4. LLM 이 만든 첫 패스를 검토하고, 필요한 부분은 자연어로 더 시킨다.

빈칸이 다 채워지면 LLM 이 알아서 단계별 작업을 시작한다. 검수는 사람이 한다.

---

## 빈칸 작성 가이드

| 빈칸 | 채울 내용 예시 |
|---|---|
| `<<SERVICE_NAME_KO>>` | 한국어 서비스명 (예: "오늘의 감정 정리") |
| `<<SERVICE_NAME_SHORT>>` | URL/패키지명용 영문 슬러그 (예: `today-mood`) |
| `<<ONE_LINER>>` | 한 줄 요약 (검색 결과에 노출됨) |
| `<<CORE_LOOP>>` | 사용자가 하는 핵심 행동 1-3줄 (예: "한 마디 보내면 화면에 카드가 생기고 30초 후 사라진다") |
| `<<MAIN_METAPHOR>>` | 시각적 메타포 (예: "밤하늘에 별이 떠올랐다 진다") |
| `<<KEYWORDS_KO>>` | 한국어 SEO 키워드 5-10개 (콤마 구분) |
| `<<DOMAIN>>` | 도메인 (있으면 — 없으면 빈 칸 그대로 두면 됨) |
| `<<ANONYMOUS_OR_AUTH>>` | "익명 (회원가입 없음)" / "Supabase Auth 로 이메일 로그인" 등 |
| `<<PERSISTENCE>>` | "메시지는 broadcast 만 — 저장 없음" / "DB 에 저장하고 조회 가능" 등 |
| `<<FILTER_POLICY>>` | "욕설 필터 없음 (감정 분출 컨셉)" / "기본 욕설 필터 적용" 등 |

---

## 프롬프트 본문

````
당신은 한국어 사용자를 위한 웹 서비스를 만드는 풀스택 개발자다.
아래 명세대로 Next.js + Supabase + Cloudflare Workers 무료 스택으로
프로젝트를 부트스트랩하고, 동작하는 첫 버전까지 완성한다.

## 서비스 명세

- 한국어 이름: <<SERVICE_NAME_KO>>
- 영문 슬러그: <<SERVICE_NAME_SHORT>>
- 한 줄 요약: <<ONE_LINER>>
- 핵심 인터랙션: <<CORE_LOOP>>
- 비주얼 메타포: <<MAIN_METAPHOR>>
- 한국어 SEO 키워드: <<KEYWORDS_KO>>
- 도메인 (선택): <<DOMAIN>>
- 인증 방식: <<ANONYMOUS_OR_AUTH>>
- 데이터 영속성: <<PERSISTENCE>>
- 콘텐츠 필터 정책: <<FILTER_POLICY>>

## 강제 제약

1. **언어**: UI 와 모든 사용자 향 텍스트는 한국어. 코드 식별자/주석도 한국어 환영.
2. **스택**: Next.js 16 App Router + React 19 + TypeScript + CSS Modules. Tailwind/UI 라이브러리 금지.
3. **백엔드**: 별도 서버 없음. 클라이언트가 Supabase 와 직접 통신. 실시간은 Supabase Realtime (broadcast / presence).
4. **인증/DB 비밀**: `anon` 키만 클라이언트에 노출. `service_role` 키는 절대 금지. 민감 데이터는 RLS.
5. **배포**: Cloudflare Workers via `@opennextjs/cloudflare`. `output: 'export'` 같은 거 쓰지 말 것.
6. **운영비**: 도메인 외 무료 한도 안에 머무를 것. (Supabase Realtime 동시 200, Workers 일 100K req)
7. **SEO**:
   - `<html lang="ko">`
   - `metadata` + `openGraph` (`locale: 'ko_KR'`, `images: [{url:'/opengraph-image', width:1200, height:630, type:'image/png'}]`)
   - `viewport` 별도 export
   - `verification.other['naver-site-verification']` 자리 (값은 placeholder)
   - `src/app/sitemap.ts`, `src/app/robots.ts`
   - `src/app/opengraph-image.tsx` (Satori 동적 1200x630 — 한글 폰트 필요 시 fetch 해서 옵션 전달)
   - `src/app/icon.tsx` (transparent 배경 emoji favicon 가능)
   - 클라이언트 전용 인터랙션은 sr-only 한국어 본문 (h1/h2/FAQ) 과 JSON-LD WebApplication+FAQPage 를 함께 렌더
   - `public/llms.txt` 작성 (GEO)
8. **Next 16 주의**: 학습 데이터의 Next 13/14 API 와 다를 수 있음. 헷갈리면 `node_modules/next/dist/docs/` 를 먼저 읽는다.

## 코딩 원칙

- 클라이언트 전용 컴포넌트는 `'use client'` + 필요 시 `next/dynamic({ ssr: false })`.
- `setState((prev) => ...)` 업데이터 안의 부작용은 idempotent. 외부 flag 의존 금지.
- 시간 기반 진행 (애니메이션, 타이머)은 wall-clock (`now - startedAt`) 으로 계산. RAF 단독 의존 금지 (백그라운드 탭에서 멈춤). `setInterval` 백업 같이.
- Supabase RPC 반환의 bigint 는 클라이언트에서 문자열 → 숫자 파싱.
- Realtime presence key 는 세션 UUID. 닉네임 키 금지.
- pagehide/beforeunload 정리는 best-effort.
- Supabase 클라이언트는 lazy-init + `isSupabaseConfigured()` 가드.
- 환경변수 빠진 빌드도 터지지 않게.

## 환경변수 (사용자가 나중에 채움)

`.env.local` 과 Cloudflare Worker 양쪽에:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GA_ID` (선택)

## 산출물 순서

1. `package.json` + `next.config.ts` + `tsconfig.json` + `wrangler.jsonc` + `open-next.config.ts`
2. `src/app/layout.tsx` (metadata/viewport/폰트 link/GA)
3. `src/app/page.tsx`
4. `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx`, `src/app/icon.tsx`
5. `src/lib/supabase/client.ts` (lazy-init)
6. 핵심 인터랙티브 컴포넌트 (위 비주얼 메타포 구현)
7. `src/components/SeoContent/...` (sr-only 한국어 본문)
8. `src/components/JsonLd/...` (WebApplication + FAQPage)
9. `public/llms.txt`
10. `README.md` (한국어, 로컬 실행/배포 가이드)
11. `AGENTS.md` 또는 `CLAUDE.md` (Next 16 임을 명시하는 짧은 안내)

각 단계 끝나면 `npx tsc --noEmit` 과 `npx eslint .` 무에러를 보장하고 다음 단계로 간다.
짧은 README 의 마지막 줄에 "이 프로젝트는 docs/free-stack-template/PLAYBOOK.md 기반" 임을 명시.

## 함정 미리 경고 (네가 만들면서 마주칠 가능성이 큰 것들)

- Realtime postgres_changes 안 흘러옴 → broadcast 로 우회.
- presence ghost 30초 → 세션 UUID 키.
- 백그라운드 탭에서 시간 진행 멈춤 → setInterval 백업 + placedAt 기반 계산.
- Satori 한글 깨짐 → Pretendard 등 한글 폰트 fetch.
- React 18+ setState 업데이터 안 flag → 안에서 직접 처리.
- Cloudflare `NEXT_PUBLIC_*` 변경 시 재배포 필요.

## 작업 시작

위 명세를 만족하는 부트스트랩을 단계별로 만들어라.
모르거나 결정해야 할 게 있으면 코드 내려놓고 사용자에게 묻는다 (한국어로).
````

---

## 후속 프롬프트 (필요 시)

처음 부트스트랩 후, LLM 에게 추가로 시킬 만한 자연어 명령 예시:

- "현재 main 컴포넌트에 \<\<NEW_INTERACTION\>\> 을 추가해줘. wall-clock 기반으로 진행되게."
- "도메인 \<\<DOMAIN\>\> 으로 메타데이터/sitemap 갱신하고 Cloudflare custom domain 연결 절차 알려줘."
- "현재 SEO 점수 점검하고 부족한 거 채워줘. PLAYBOOK.md 의 6장 체크리스트 기준으로."
- "Realtime 채널 메시지가 받는 쪽에서 안 보인다. 디버깅 도와줘."
- "낮은 트래픽에선 정상인데 동시 접속 50명 넘으면 끊긴다. presence 로직 다시 봐줘."
