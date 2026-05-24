<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 로컬 실행

이 프로젝트의 dev 환경은 **두 프로세스**로 구성됨. 절대 `npm run dev` 하나만 띄우지 말 것.

```bash
npm run dev:all
```

- **Next dev** (:3000) — `npm run dev`
- **Realtime WS** (:8080) — `npm run dev:ws` (= `realtime-server/`). `.env.local` 의 `NEXT_PUBLIC_WS_URL` 이 가리키는 서버. 안 켜면 presence/broadcast 가 끊겨 본인 캐릭터 silhouette 부터 안 그려짐.
- **Postgres** (:5435) — Docker 컨테이너로 상주. `lsof -nP -iTCP:5435 -sTCP:LISTEN` 으로 확인. 안 떠있으면 사용자에게 알리기.

"로컬 켜줘" / "dev 켜자" 류 요청에는 무조건 `npm run dev:all` 사용.
