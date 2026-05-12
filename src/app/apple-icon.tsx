import { ImageResponse } from 'next/og';

// iOS 홈스크린은 투명 배경을 흰색으로 채움 → 사이트 테마 색으로 깔아둔다.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          fontSize: 150,
        }}
      >
        🍠
      </div>
    ),
    { ...size },
  );
}
