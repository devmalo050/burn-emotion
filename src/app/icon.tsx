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
          background: 'transparent',
        }}
      >
        {/* 군고구마 — 분홍-빨강 톤 길쭉한 타원, 거의 가득 채움 */}
        <div
          style={{
            width: 22,
            height: 30,
            background: '#c25a2c',
            borderRadius: '50% 60% 55% 65% / 60% 55% 65% 60%',
            transform: 'rotate(-22deg)',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
