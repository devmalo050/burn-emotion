'use client';

// Next 16 dev 모드에서 빌트인 global-error.js 가 RSC 클라이언트 매니페스트에
// 누락돼 간헐적 500 을 내는 이슈 회피용. 직접 정의하면 빌트인 fallback 미사용.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0b10',
          color: '#efe8d9',
          fontFamily:
            'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#ffd590' }}>
            모닥불이 잠시 꺼졌어요.
          </h2>
          <p style={{ margin: '12px 0 24px', opacity: 0.75 }}>
            다시 켜고 한 번만 더 와볼래요?
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '10px 22px',
              border: '1px solid rgba(255,213,144,0.55)',
              borderRadius: 8,
              background: 'rgba(255,213,144,0.08)',
              color: '#ffd590',
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            다시 켜기
          </button>
        </div>
      </body>
    </html>
  );
}
