import { ImageResponse } from 'next/og';

// 동적 favicon — 모닥불 + 고구마 미니 일러스트
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
          fontSize: 28,
        }}
      >
        🍠
      </div>
    ),
    { ...size },
  );
}
