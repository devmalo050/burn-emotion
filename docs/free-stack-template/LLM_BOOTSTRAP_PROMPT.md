# LLM 부트스트랩 프롬프트 (메타 템플릿)

같은 폴더 [`PLAYBOOK.md`](./PLAYBOOK.md) 의 §0~§3 결정을 기반으로 빈칸을 채워, 아래 프롬프트를 LLM (Claude / ChatGPT / Gemini 등) 에 그대로 던진다. 컨셉·언어·스택·인증·영속성 모두 빈칸이다.

---

## 사용법

1. PLAYBOOK §0~§3 을 먼저 읽고 결정값 메모.
2. 새 GitHub 빈 레포 클론한 폴더에서 LLM 에이전트를 띄움.
3. 아래 `## 프롬프트 본문` 코드 블록 전체를 복사 → LLM 입력.
4. `<<...>>` 빈칸을 메모한 결정값으로 치환.
5. LLM 이 만든 첫 패스를 검토. 부족하면 자연어로 추가 명령.

---

## 빈칸 작성 가이드

### 컨셉 / 산출물

| 빈칸 | 채울 내용 |
|---|---|
| `<<SERVICE_NAME_DISPLAY>>` | 사용자에게 보이는 서비스명 (산출물 언어로) |
| `<<SERVICE_NAME_SLUG>>` | 영문 슬러그 (URL/패키지명용 소문자+하이픈) |
| `<<ONE_LINER>>` | 한 줄 요약 — 검색 결과 description 으로 그대로 쓰임 |
| `<<CORE_LOOP>>` | 사용자의 핵심 행동 1~3 줄 |
| `<<VISUAL_METAPHOR_OR_LAYOUT>>` | 메인 화면의 비주얼 컨셉 (또는 "정보 위주 / 비주얼 강조 안 함") |
| `<<TARGET_AUDIENCE_REGION>>` | 주 타깃 시장 (예: 글로벌 / 한국 / 일본 / 영어권 / 다국어) |

### 언어 / 지역화

| 빈칸 | 채울 내용 |
|---|---|
| `<<UI_LANGUAGE_PRIMARY>>` | UI/콘텐츠 1차 언어 (BCP47 코드: `en`, `ko`, `ja`, `de` 등) |
| `<<UI_LANGUAGE_LOCALE>>` | 로케일 (`en-US`, `ko-KR`, `ja-JP` 등 — OG locale 용) |
| `<<UI_LANGUAGE_OTHERS>>` | 추가 지원 언어 또는 "없음" |
| `<<KEYWORDS>>` | SEO 키워드 5~10 개 (산출물 언어로, 콤마 구분) |
| `<<SEARCH_ENGINES_TO_REGISTER>>` | 등록할 검색엔진 목록 (예: "Google + Naver" / "Google + Bing + Yandex" / "Google 만") |

### 기술 스택

각 레이어 하나만 골라 적는다. 모르겠으면 LLM 에게 PLAYBOOK §1 컴포넌트 매트릭스를 보여주고 추천받는다.

| 빈칸 | 채울 내용 |
|---|---|
| `<<FRONTEND_FRAMEWORK>>` | 예: `Next.js 16 (App Router)`, `Astro 5`, `SvelteKit 2`, `Remix v2`, `Nuxt 3` |
| `<<UI_STYLE_APPROACH>>` | 예: `CSS Modules`, `Tailwind`, `vanilla-extract`, `styled-components`, `plain CSS` |
| `<<LANGUAGE>>` | `TypeScript` / `JavaScript` |
| `<<BACKEND_AND_DB>>` | 예: `Supabase (Postgres+Realtime+Auth)`, `Firebase`, `PocketBase`, `Convex`, `Neon + Clerk`, `없음 (정적 사이트)` |
| `<<HOSTING>>` | 예: `Cloudflare Workers via @opennextjs/cloudflare`, `Cloudflare Pages`, `Vercel`, `Netlify`, `Fly.io`, `Render` |
| `<<ANALYTICS>>` | `Google Analytics 4` / `Plausible (셀프호스팅)` / `Cloudflare Web Analytics` / `없음` |
| `<<DOMAIN>>` | 사용자 도메인 (있으면) 또는 "호스팅 기본 서브도메인" |

### 정책 / 데이터

| 빈칸 | 채울 내용 |
|---|---|
| `<<AUTH_MODEL>>` | 예: `익명 (회원가입 없음)` / `이메일+패스워드` / `OAuth (Google)` / `이메일 매직링크` |
| `<<PERSISTENCE>>` | 예: `메시지는 broadcast 만 — 저장 없음` / `DB 영구 저장` / `세션 24시간 보존 후 삭제` |
| `<<REALTIME_NEED>>` | 예: `다중 사용자 실시간 동기화 필요` / `단일 사용자라 불필요` |
| `<<CONTENT_POLICY>>` | 예: `필터 없음 (의도된 자유 표현 공간)` / `기본 욕설/스팸 필터` / `사용자 신고 기능 포함` |
| `<<RATE_LIMITING>>` | 예: `5초 내 10건 초과 시 잠시 차단` / `없음` |

### 환경변수 / 시크릿 (LLM 이 placeholder 만 만들고 사용자가 채움)

LLM 이 알아서 필요한 환경변수 목록을 만들도록 위 스택 빈칸만 채우면 된다. 일반적으로:
- 백엔드 공개 키 (anon / public)
- 사이트 URL
- 분석 ID

비밀 키는 절대 클라이언트/레포에 안 들어가야 한다.

---

## 프롬프트 본문

````
너는 한 명의 개인 개발자가 도메인 갱신비 외 운영비 0원으로 운영할 수 있는
웹 서비스를 부트스트랩하는 풀스택 엔지니어다. 아래 명세대로 첫 동작 버전까지
완성한다.

## 서비스 명세

- 표시명: <<SERVICE_NAME_DISPLAY>>
- 슬러그: <<SERVICE_NAME_SLUG>>
- 한 줄 요약: <<ONE_LINER>>
- 핵심 인터랙션: <<CORE_LOOP>>
- 화면 컨셉: <<VISUAL_METAPHOR_OR_LAYOUT>>
- 타깃 시장: <<TARGET_AUDIENCE_REGION>>

## 언어 / 지역화

- UI 1차 언어: <<UI_LANGUAGE_PRIMARY>> (locale: <<UI_LANGUAGE_LOCALE>>)
- 추가 언어: <<UI_LANGUAGE_OTHERS>>
- SEO 키워드: <<KEYWORDS>>
- 등록할 검색엔진: <<SEARCH_ENGINES_TO_REGISTER>>

산출물의 모든 사용자 향 텍스트는 위 1차 언어로 작성한다. 코드 식별자와
주석은 사용자 편의에 따른다 (별도 지시가 없으면 영문 코드 + 주석은 1차
언어로 OK).

## 기술 스택

- 프론트엔드: <<FRONTEND_FRAMEWORK>>
- 스타일링: <<UI_STYLE_APPROACH>>
- 언어: <<LANGUAGE>>
- 백엔드/DB: <<BACKEND_AND_DB>>
- 호스팅: <<HOSTING>>
- 분석: <<ANALYTICS>>
- 도메인: <<DOMAIN>>

위 스택을 모두 무료 티어에서 운영한다고 가정한다. 가격 페이지 최신 정보를
모를 수 있으니 무료 한도가 의심되면 코드를 멈추고 사용자에게 확인을 요청.

## 정책

- 인증: <<AUTH_MODEL>>
- 데이터 영속성: <<PERSISTENCE>>
- 실시간성: <<REALTIME_NEED>>
- 콘텐츠 정책: <<CONTENT_POLICY>>
- 레이트 리밋: <<RATE_LIMITING>>

## 강제 제약 (모든 스택 공통)

1. **시크릿 분리**: 클라이언트에 들어가도 되는 공개 키만 클라이언트로. 비밀
   키는 절대 노출 금지. `.env*` 는 `.gitignore` 첫 줄.
2. **lazy-init 가드**: 백엔드 클라이언트는 환경변수 누락 시 코드가 터지지
   않도록 옵셔널 초기화. `isConfigured()` 가드.
3. **타입 안전**: TS 라면 `tsc --noEmit` 무에러. JS 라면 lint 무에러.
4. **빈 환경에서 빌드 성공**: 환경변수 없이도 빌드/dev 서버 기동 가능해야
   함. 기능만 비활성.
5. **SEO 기본** (산출물 1차 언어 기준):
   - `<html lang="...">` 정확히
   - title / description / canonical / keywords
   - openGraph + twitter (images width/height/type 명시)
   - viewport + themeColor
   - 1차 시장 검색엔진의 verification 메타 placeholder
   - `robots.txt` + `sitemap.xml` (정적 또는 라우트)
   - JSON-LD 구조화 데이터 (컨셉에 맞는 schema.org 타입)
   - 동적 OG 이미지 1200×630 (비영문 텍스트면 해당 폰트 임베드)
   - favicon (투명 배경 권장)
6. **GEO**: `/llms.txt` 평문 작성. 사이트 한 줄 요약 + 핵심 Q&A + 주요 URL.
7. **클라이언트 전용 인터랙션이 메인일 때**: 시각적으로 안 보이는 sr-only
   본문 (h1/h2/단락/FAQ) 을 SSR 로 동시 렌더. 크롤러에 빈 화면 노출 금지.
8. **다국어가 명시되면** hreflang + 별도 라우트 구조.

## 산출물 함정 (네가 코드 짜며 마주칠 가능성이 큼)

- 실시간 채널의 DB 변경 이벤트가 안 흘러올 때 → broadcast 우회.
- 접속자 presence key 는 세션 UUID. 사람 단위 키 금지 (ghost 발생).
- `pagehide`/`beforeunload` 는 일부 브라우저에서 못 받음. 정리는 best-effort.
- 함수형 setState 의 부작용은 render 시점에 실행. setState 호출 직후
  외부 flag 읽지 말 것. 부작용은 업데이터 안에서 (idempotent 하게).
- `requestAnimationFrame` 은 백그라운드 탭에서 정지. 시간 기반 진행은
  wall-clock 계산 + setInterval 백업.
- 64-bit 정수 RPC 반환은 JSON 직렬화 시 문자열. 명시 파싱.
- 호스팅의 `PUBLIC_` 접두 환경변수는 빌드 시 박힘. 값 변경 후 재배포 필수.
- 프레임워크 메이저 버전이 LLM 학습 시점보다 신선할 수 있음. 헷갈리면
  `node_modules/<framework>/docs/` 또는 공식 docs 우선 참조.

## 코딩 원칙

- 클라이언트 전용 컴포넌트는 적절한 프레임워크 directive (`'use client'` 등)
  로 명시. hydration mismatch 회피.
- StrictMode/이중 호출에서 안전한 부작용 (Set.add 같은 멱등 연산).
- 환경변수는 명시적 이름 + 호스팅 측에 production / preview 양쪽 등록 안내.
- 디자인 토큰 (색/간격/폰트) 은 한 곳에 모아 둠.
- `README.md` 한국어/산출물 언어 둘 다 안 되면 일단 1차 언어로.

## 산출물 순서

1. 패키지 매니페스트 / 프레임워크 설정 / 호스팅 설정
2. 루트 레이아웃 + 메타데이터 + 폰트/Analytics 삽입
3. 메인 페이지 골격 (sr-only 본문 동시 렌더)
4. SEO 라우트 4종 (sitemap / robots / opengraph-image / favicon)
5. 백엔드 클라이언트 lazy-init
6. 핵심 인터랙티브 컴포넌트
7. JSON-LD 구조화 데이터 컴포넌트
8. `/llms.txt`
9. `README.md` (산출물 언어로, 로컬 실행/배포 안내)
10. `AGENTS.md` 또는 `CLAUDE.md` — 프레임워크 메이저 버전 주의 + docs 우선
    참조 지시

각 단계 끝마다 타입체크 + lint 무에러 보장 후 다음으로.

## 작업 시작

위 명세를 따르는 부트스트랩을 단계별로 만들어라. 결정해야 할 게 있으면
코드 내려놓고 사용자에게 묻는다 (1차 언어로).
````

---

## 후속 자연어 명령 예시

부트스트랩 이후 LLM 에 자연어로 시킬 만한 것들:

- "메인 컴포넌트에 `<<NEW_FEATURE>>` 를 추가. 시간 기반 진행이면 wall-clock 계산으로."
- "`<<DOMAIN>>` 으로 metadata/sitemap 갱신하고 호스팅의 custom domain 연결 절차 단계별로 안내."
- "현재 SEO 상태를 PLAYBOOK §5 체크리스트로 점검하고 부족한 항목만 채워줘."
- "Realtime 채널에서 보내는 쪽은 동작하는데 받는 쪽이 못 받는다. 디버깅 도와줘."
- "동시 접속 50명 넘으면 끊긴다. presence/heartbeat 로직 다시 봐줘."
- "현재 의존성 outdated 점검 후 메이저 업그레이드 안전한 것만 PR 단위로 분리."
- "PLAYBOOK §6 함정 체크리스트로 전체 코드 감사."
