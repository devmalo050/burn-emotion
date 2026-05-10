import { ImageResponse } from 'next/og';

// 동적 favicon — 군고구마 미니 일러스트 (Satori는 이모지 폰트 미포함이라 직접 그림)
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
          background: '#0b0b10',
        }}
      >
        {/* 군고구마 — 분홍-빨강 톤의 길쭉한 타원 */}
        <div
          style={{
            width: 16,
            height: 24,
            background: 'linear-gradient(135deg, #d97560 0%, #b04a32 50%, #6e2515 100%)',
            borderRadius: '50% 60% 55% 65% / 60% 55% 65% 60%',
            transform: 'rotate(-18deg)',
            boxShadow: 'inset -1px -2px 0 rgba(0,0,0,0.4), inset 1px 1px 0 rgba(255,170,140,0.3)',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
