import { ImageResponse } from 'next/og';

// 동적 favicon — 가로로 갈라져 노란 속살이 보이는 군고구마 (서비스 핵심 비주얼)
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        {/* 회전된 컨테이너 — 위·중간(속살)·아래 3단 */}
        <div
          style={{
            width: 22,
            height: 28,
            display: 'flex',
            flexDirection: 'column',
            transform: 'rotate(-15deg)',
          }}
        >
          {/* 위쪽 반쪽 — 분홍빨강 껍질 */}
          <div
            style={{
              width: '100%',
              height: 12,
              background: 'linear-gradient(180deg, #d9755f 0%, #a8421f 100%)',
              borderTopLeftRadius: '60% 100%',
              borderTopRightRadius: '60% 100%',
              borderBottomLeftRadius: '20% 30%',
              borderBottomRightRadius: '20% 30%',
              boxShadow: 'inset 1px 1px 0 rgba(255,170,140,0.35)',
              display: 'flex',
            }}
          />
          {/* 가운데 — 노란 속살 */}
          <div
            style={{
              width: '100%',
              height: 6,
              background: 'linear-gradient(180deg, #ffd668 0%, #ffe89a 50%, #ffd668 100%)',
              borderRadius: '40% 40% 40% 40% / 100% 100% 100% 100%',
              marginTop: -1,
              marginBottom: -1,
              display: 'flex',
            }}
          />
          {/* 아래쪽 반쪽 — 분홍빨강 껍질 */}
          <div
            style={{
              width: '100%',
              height: 12,
              background: 'linear-gradient(180deg, #a8421f 0%, #6e2515 100%)',
              borderTopLeftRadius: '20% 30%',
              borderTopRightRadius: '20% 30%',
              borderBottomLeftRadius: '60% 100%',
              borderBottomRightRadius: '60% 100%',
              display: 'flex',
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
