# Free Stack Template

도메인 갱신비 외 운영비 **0원** 으로 웹 서비스를 띄우는 메타-템플릿. 언어·기술 스택·컨셉 모두 빈칸.

- 👉 **[PLAYBOOK.md](./PLAYBOOK.md)** — 무료 풀스택 부트스트랩의 보편 원칙·결정 가이드·공통 함정. 스택 무관.
- 👉 **[LLM_BOOTSTRAP_PROMPT.md](./LLM_BOOTSTRAP_PROMPT.md)** — 빈칸을 채워 LLM 에 던지는 메타 프롬프트. LLM 이 선택된 스택의 구체 셋업·코드를 생성.

## 사용 흐름

1. PLAYBOOK §0~§3 을 읽고 의사결정 (언어/스택/인증/영속성/도메인/검색엔진 등).
2. 같은 결정값으로 LLM_BOOTSTRAP_PROMPT 의 `<<...>>` 빈칸을 채운다.
3. LLM 에 던지고 검수 → PLAYBOOK §4 의 사람이 해야 할 단계 (호스팅 연결, 환경변수 등록, 도메인, 검색 등록) 마무리.
4. PLAYBOOK §7 사이클로 운영.

이 두 문서는 서로를 참조한다. PLAYBOOK 이 의사결정·함정 카탈로그, BOOTSTRAP_PROMPT 가 LLM 작업 지시서.
