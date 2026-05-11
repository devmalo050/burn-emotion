# 무료 풀스택 부트스트랩 매뉴얼 (메타)

이 문서는 **개인 개발자 한 명이 도메인 갱신비 외 운영비 0원**으로 웹 서비스를 띄울 때 따라가는 보편 가이드다. 특정 언어/지역/기술 스택/컨셉에 의존하지 않는다.

> 산출물의 코드/UI 언어, 스택, 컨셉은 **`LLM_BOOTSTRAP_PROMPT.md` 의 빈칸으로 채워 LLM 에 위임**한다. 이 매뉴얼은 그 위 단계의 의사결정과 함정만 다룬다.

---

## 0. 시작 전에 결정해야 할 것

| 항목 | 결정 시점 | 메모 |
|---|---|---|
| 산출물의 UI/콘텐츠 언어 | 0일차 | SEO/검색엔진 등록 선택을 좌우 |
| 인증 방식 | 0일차 | 익명 / 이메일 / OAuth |
| 데이터 영속성 | 0일차 | 휘발 broadcast / 영구 DB / 혼합 |
| 실시간성 | 0일차 | 단일 사용자 / 멀티 사용자 동기화 |
| 도메인 사용 | 언제든 변경 가능 | 무료 서브도메인으로도 시작 가능 |
| 트래픽 기대치 | 1주~1개월 | 무료 한도 초과 시 유료 전환 임계 |

모든 결정은 LLM 부트스트랩 프롬프트의 빈칸으로 전달한다.

---

## 1. 컴포넌트 후보 매트릭스

각 레이어를 **하나만 골라** 조합한다. 모두 무료 티어 존재.

### 1.1 프론트엔드 / 메타 프레임워크
| 후보 | 특징 |
|---|---|
| Next.js (App Router) | 풀스택 SSR/SSG 모두. 동적 OG 이미지 (`opengraph-image`) 강력. 학습 자원 풍부. |
| Astro | 콘텐츠 중심 / 정적 우선. island 아키텍처. |
| SvelteKit | 번들 작고 빠름. |
| Remix / React Router v7 | 데이터 로딩 모델 명확. |
| Nuxt | Vue 진영. |

### 1.2 백엔드 / DB / 실시간
| 후보 | 특징 |
|---|---|
| Supabase | Postgres + Realtime + Auth + Storage. 모두 한 곳. anon key 클라이언트 노출 가능. |
| Firebase | NoSQL + Realtime. 구글 통합. |
| PocketBase | 단일 바이너리. 자기 호스팅. |
| Convex | TS 친화. 백엔드 없이 함수. |
| Neon + (별도 인증) | Postgres 만 필요할 때. |
| Cloudflare D1 + Durable Objects | Workers 와 같은 엣지. |

### 1.3 호스팅 / 배포
| 후보 | 무료 한도 (대략) | 적합 |
|---|---|---|
| Cloudflare Workers | 일 100K req, CPU 10ms/req | Edge SSR, 글로벌 |
| Cloudflare Pages | 빌드 분 무제한, 정적 우선 | 정적 사이트 / Astro |
| Vercel | 호비 무료 (대역폭/함수 제한) | Next.js 가장 매끈 |
| Netlify | 빌드 분 300/월 | 정적 / Jamstack |
| Render | 일정 시간 idle 후 sleep | 컨테이너형 |
| Fly.io | 소규모 free | 도커 / 영구 프로세스 |

### 1.4 코드 저장소 / CI
- **GitHub** (private repo 무제한) — 사실상 표준.
- 호스팅 서비스가 git push 트리거 자동 빌드를 제공하므로 별도 CI 불필요.

### 1.5 분석 / 검색
- Analytics: Google Analytics 4 / Plausible (자기 호스팅) / Cloudflare Web Analytics.
- 검색 등록: 산출물 언어/지역에 맞춰 선택.
  - 글로벌: Google Search Console.
  - 한국 시장: + Naver SearchAdvisor.
  - 일본: + Bing Webmaster (Yahoo Japan).
  - 중국: + Baidu (가능한 경우).
  - 러시아: + Yandex.

### 1.6 도메인 등록자
- Cloudflare Registrar (갱신비 가장 저렴, 마진 0). 단 호스팅도 Cloudflare 면 시너지.
- Porkbun / Namecheap / Gabia / Hover 등.

---

## 2. 스택 조합 휴리스틱

| 컨셉 성격 | 추천 조합 (예시일 뿐, 절대 아님) |
|---|---|
| 실시간 멀티유저 인터랙션 | Next/SvelteKit + Supabase Realtime + Cloudflare Workers |
| 콘텐츠/블로그/포트폴리오 | Astro + (DB 불필요) + Cloudflare Pages |
| 양식 수집 + 관리 | Next + PocketBase 자기호스팅 + Fly.io |
| 인증 무거운 SaaS | Next + Supabase Auth + Vercel |

**선택 기준 우선순위**:
1. **컴포넌트 간 호환**. 같은 회사 서비스끼리(예: Cloudflare Workers + Cloudflare R2)가 통합이 매끈.
2. **무료 한도 헤드룸**. 예상 트래픽의 5-10배 여유가 있나.
3. **개인 익숙도**. 새 도구 학습 시간 ≤ 절약 시간일 때만.
4. **종속성 회피**. lock-in 이 큰 서비스(예: BaaS 의 비표준 함수)는 마이그레이션 비용 고려.

---

## 3. 무료 한도 사전 점검 체크리스트

선택 직후 각 서비스의 가격 페이지에서 다음을 표로 메모해 두고, **본인의 예상 트래픽을 옆 칸에 적어 비교**한다.

- [ ] 요청 수 / 함수 호출 (일·월)
- [ ] 동시 접속 / WebSocket 동시 연결
- [ ] 빌드 분 / 배포 횟수
- [ ] 대역폭 (egress)
- [ ] DB 용량
- [ ] DB 행 수 또는 데이터 쓰기 횟수
- [ ] 비활성 자동 정지/슬립 정책 (몇 일 / 몇 분)
- [ ] 백업 보존 정책
- [ ] 무료 → 유료 최소 가격 (트래픽 폭발 시 즉시 막힐지 / 자동 청구로 갈지)

**자동 청구 정책**은 특히 조심. 어떤 서비스는 한도 초과 시 자동으로 유료 전환되어 청구가 발생한다. "한도 도달 시 차단" 모드가 있는지 확인.

---

## 4. 보편 부트스트랩 절차 (스택 무관)

1. **GitHub 빈 레포** 생성 (private). 라이선스/`.gitignore` 만 둠.
2. **로컬 클론** → 선택한 프레임워크의 CLI 부트스트랩 (예: `create-X-app`). 첫 커밋 즉시 푸시.
3. **`README.md` 한 페이지**: 컨셉 한 줄, 로컬 실행 명령, 배포 흐름. 매뉴얼은 그 다음.
4. **에이전트/LLM 안내 파일** (`AGENTS.md` 또는 `CLAUDE.md`): 프레임워크의 메이저 버전/breaking change 가 학습 데이터보다 신선할 수 있다는 점을 명시. (`node_modules/<framework>/docs` 우선 참조 같은 지시)
5. **백엔드 프로젝트 생성** + 환경변수 받기. 공개 가능한 키만 클라이언트로. 비밀 키는 절대 클라이언트/레포에 두지 않음. `.env.local` 은 `.gitignore`.
6. **호스팅 연동**: git push → 자동 빌드 → 배포. 첫 배포 URL 확보.
7. **환경변수 호스팅 측에 등록** (production / preview 양쪽). 변경 후 재배포 필수.
8. **도메인 연결 (선택)**: DNS / 자동 SSL.
9. **메타데이터 / SEO 기본**: 다음 §5.
10. **분석 도입**: GA4 또는 대체.
11. **검색엔진 등록**: 산출물 언어/지역 기준.

---

## 5. SEO / GEO 보편 원칙 (언어 무관)

언어와 무관하게 항상 챙길 것.

- 메인 `lang` 속성을 정확히 (`en` / `ko` / `ja` / 등). 다국어면 `hreflang`.
- `metadata` / `<head>`:
  - title (브랜드 + 한 줄 요약)
  - description (검색 결과 클릭률용 — 산출물 언어로)
  - canonical
  - keywords (선택. 부정적 효과 없음, 일부 엔진은 참고)
  - openGraph: type, locale, url, siteName, title, description, **images (width/height/type 명시)**
  - twitter: card, title, description, images
  - viewport, themeColor
  - 지역 검색엔진 verification 메타 (`google-site-verification`, `naver-site-verification`, `yandex-verification` 등)
  - `robots: index, follow` + `googleBot: max-image-preview: large, max-snippet: -1`
- **동적 OG 이미지** (있다면): 1200×630 PNG, 콘텐츠와 일치. 한자/한글/키릴 등 비영문 텍스트가 들어가면 해당 폰트를 명시적으로 임베드/fetch.
- **favicon**: 동적 이미지 라우트 또는 정적 `.ico`. 투명 배경이 다크/라이트 양쪽에 무난.
- **sitemap.xml + robots.txt**: 라우트로 자동 생성하거나 정적 파일.
- **JSON-LD 구조화 데이터** (`application/ld+json`): WebApplication / Article / FAQPage / Product 등 컨셉에 맞는 타입. 검색 리치 결과 노출 가능성 ↑.
- **클라이언트 전용 인터랙션이 메인 콘텐츠**일 때: 시각적으로 안 보이지만 DOM 엔 있는 **sr-only 본문** (h1/h2/단락/FAQ)을 SSR 로 함께 렌더. 안 그러면 크롤러가 빈 화면을 본다.
- **GEO (Generative Engine Optimization)** — LLM 검색 엔진 (Perplexity, ChatGPT, Claude, Gemini 등) 노출용:
  - `/llms.txt` 또는 `/llms-full.txt` 평문 작성. 사이트 한 줄 요약 + 핵심 Q&A + 주요 URL.
  - 자연어 Q&A 패턴이 본문(또는 sr-only)에 있으면 인용 확률 ↑.
  - 사실 진술 + 출처 명시 형태로 작성.
- **다국어**: 별도 라우트 (`/en`, `/ko`) + `hreflang` 링크. 자동 번역 결과를 그대로 노출하지 말 것 (페널티).
- **속도**: Lighthouse 모바일 점수 80+ 목표. 폰트 preconnect, 이미지 lazy, JS bundle 점검.

---

## 6. 공통 함정 (스택 가리지 않고 반복되는 것들)

### 6.1 실시간 동기화
- **DB 변경 이벤트 (postgres_changes 류) 가 안 흘러올 때**: replica identity / RLS / publication 설정 확인. 풀기 어려우면 broadcast (휘발 채널) 로 우회.
- **presence/접속자 key 는 세션 단위 UUID** 로. 닉네임/이메일 같은 사람 단위 키로 잡으면 새로고침 시 옛 슬롯이 timeout 까지 ghost 로 남음.
- **`pagehide` / `beforeunload` 는 일부 브라우저에서 못 받음** (모바일 Safari, 일부 한국 브라우저 등). 클라이언트 정리는 best-effort, 서버 timeout 에 의존.
- **heartbeat + stale filter 패턴은 위험**: 백그라운드 탭 throttling 으로 false positive 발생 (멀쩡한 접속자가 사라지는 현상). 가능하면 백엔드의 native presence 신뢰.

### 6.2 클라이언트 상태 관리
- **React/Vue/Svelte 등의 함수형 setter `setState(prev => ...)` 안의 부작용은 setState 호출 시점이 아니라 render 시점에 실행**. 호출 직후 외부 flag 를 읽어 분기하면 거의 항상 stale 값을 봄. 부작용은 업데이터 내부에서 처리하거나, idempotent 하게 설계.
- **`requestAnimationFrame` 은 탭이 백그라운드면 정지**. 시간 기반 진행 (애니메이션·타이머·자동 만료) 이 멈춰서 의도한 이벤트가 영영 안 일어난다. 해결: **wall-clock 계산** (`now - startedAt` 으로 매 프레임 위치 계산) + `setInterval` 백업 (백그라운드에서도 ~1Hz 로 fire). RAF 단독 의존 금지.
- **개발 모드의 StrictMode/이중 호출** 환경에서 effect/updater 가 두 번 호출됨. 부작용은 idempotent 하게 (Set.add, Map.set 같은 멱등 연산 선호).

### 6.3 데이터 타입 / 직렬화
- **bigint / 64-bit 정수 RPC 반환은 JSON 직렬화 시 문자열로** 옴. 클라이언트에서 명시적으로 파싱 (`parseInt(String(v), 10)`).
- **타임스탬프**: ISO 문자열로 주고받고 클라이언트에서 `Date` 로 파싱. UTC 기준으로 저장, 표시할 때 로컬.
- **부동소수 합산**으로 카운터 만들지 말 것. 정수 RPC 또는 단조 증가 시퀀스.

### 6.4 배포 / CI
- **`PUBLIC` 접두 환경변수 (Next/Astro/SvelteKit 모두 명칭만 다름) 는 빌드 시점에 코드에 박힘**. 호스팅에서 값 바꾼 뒤 재빌드/재배포 없으면 반영 안 됨. 변화 없을 땐 `git commit --allow-empty -m "redeploy"`.
- **시크릿 노출 사고**: `git filter-repo` + force-push + 시크릿 즉시 회전. 회전 안 한 채 history 만 청소하는 건 무의미.
- **`.env*` 파일은 `.gitignore`** 첫째 줄에. 이미 한 번 push 됐다면 위와 같이 회전 + filter.
- **빌드 캐시**: 호스팅 측 캐시가 stale 빌드를 서빙하는 경우. 대시보드에서 cache purge.

### 6.5 백엔드 무료 플랜
- **장기 비활성 시 자동 일시정지**: 며칠~몇 주 안 들어가면 paused. 대시보드에서 한 번 깨우면 됨. 본인이 자주 들어가면 paused 안 됨.
- **무료 한도 초과 시 동작**: 차단되는지 / 유료로 자동 전환되는지 미리 확인 (위 §3).

### 6.6 프레임워크 메이저 버전 표류
- LLM 학습 데이터가 N-1 / N-2 메이저 버전이라 API 가 다를 수 있음. 코드 짤 때 `node_modules/<framework>/docs/` 또는 공식 사이트의 현재 버전 가이드를 먼저 읽힌다 (`AGENTS.md` 에 명시).

---

## 7. 유지보수 사이클

- **주 1회**: 호스팅 대시보드에서 일 요청 수 / 빌드 분 사용량 확인. 무료 한도의 50% 넘으면 알람 설정.
- **주 1회**: 백엔드 대시보드에서 DB/스토리지 사용량 + paused 상태 확인.
- **월 1회**: 의존성 outdated 점검. 메이저 업그레이드는 별도 브랜치 + 작은 PR.
- **분기 1회**: 검색엔진 색인 상태 + 핵심 검색어 노출 순위 점검.
- **연 1회**: 도메인 만료 전 갱신 / 자동 갱신 카드 유효성 확인.

---

## 8. 종료 / 마이그레이션

- **종료**: 백엔드 프로젝트 일시 정지 (대부분 90일 데이터 보존), 호스팅 워커/사이트 삭제, 도메인 자동 갱신 끄기.
- **데이터 백업**: 백엔드의 dump/export 명령 한 번 (`pg_dump` / Firebase export / etc.). 코드는 GitHub 에 잔존하므로 부활 가능.
- **마이그레이션**: 한 레이어씩 바꾼다 (호스팅만 바꾸기 / DB 만 바꾸기). 한꺼번에 바꾸면 문제 격리 불가.

---

## 9. 이 문서의 사용 흐름

1. 이 문서를 읽고 §0~§3 에서 결정을 내린다 (스택, 무료 한도, 도메인 여부).
2. 같은 폴더의 [`LLM_BOOTSTRAP_PROMPT.md`](./LLM_BOOTSTRAP_PROMPT.md) 빈칸을 §0~§2 결정값으로 채운다.
3. 채운 프롬프트를 LLM 에 던지면 LLM 이 스택별 셋업·코드를 만든다.
4. LLM 이 만든 결과물을 사람이 검수한다. §6 함정 체크리스트로 점검.
5. §4 보편 절차의 미완 단계 (호스팅 연결, 환경변수, 도메인, 검색 등록) 를 사람이 마무리한다.
6. §7 사이클로 운영.
