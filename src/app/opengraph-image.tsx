import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '군고구마 채팅 · 모닥불 옆에서 익명으로 털어놓는 채팅';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// satori 가 woff2 를 못 읽어서 OTF 로 가져온다.
const PRETENDARD_BOLD =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf';
const PRETENDARD_REGULAR =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf';

export default async function OpengraphImage() {
  const [bold, regular] = await Promise.all([
    fetch(PRETENDARD_BOLD).then((r) => r.arrayBuffer()),
    fetch(PRETENDARD_REGULAR).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(ellipse 55% 45% at 50% 62%, rgba(255,140,58,0.32) 0%, transparent 70%), linear-gradient(180deg, #06051a 0%, #110820 55%, #1a0f08 100%)',
          color: '#efe8d9',
          padding: '80px',
          fontFamily: 'Pretendard',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: 180,
            lineHeight: 1,
            marginBottom: 28,
            filter: 'drop-shadow(0 12px 48px rgba(255,140,58,0.5))',
            display: 'flex',
          }}
        >
          🍠
        </div>

        <div
          style={{
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: '#f4ede0',
            textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 60px rgba(255,140,58,0.25)',
            display: 'flex',
          }}
        >
          군고구마 채팅
        </div>

        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: 'rgba(232,170,120,0.9)',
            marginTop: 22,
            letterSpacing: '-0.01em',
            display: 'flex',
          }}
        >
          모닥불 옆에서 익명으로 털어놓는 채팅
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 60,
            display: 'flex',
            gap: 22,
            color: 'rgba(163,152,136,0.7)',
            fontSize: 20,
            letterSpacing: '0.1em',
            fontWeight: 400,
          }}
        >
          <span>익명</span>
          <span>·</span>
          <span>회원가입 없음</span>
          <span>·</span>
          <span>메시지 휘발</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
        { name: 'Pretendard', data: regular, weight: 400, style: 'normal' },
      ],
    },
  );
}
