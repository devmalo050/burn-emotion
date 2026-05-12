import { ImageResponse } from 'next/og';

// 구글 검색 결과 사이드 아이콘용 — 큰 사이즈를 명시 제공해야 favicon으로 잘 잡힘.
// 32×32만 있으면 구글이 OG 이미지에서 자동 추출함.
export const size = { width: 192, height: 192 };
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
          fontSize: 168,
        }}
      >
        🍠
      </div>
    ),
    { ...size },
  );
}
