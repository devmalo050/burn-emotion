import { ImageResponse } from 'next/og';

// Next 동적 OG — 1200×630 PNG가 빌드 시 자동 생성됨.
// 카톡/트위터/디스코드 링크 미리보기에 노출.

export const runtime = 'edge';
export const alt = '군고구마 굽기 · 모닥불 옆에서 익명으로 털어놓는 채팅';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
            'radial-gradient(ellipse 70% 35% at 50% 80%, rgba(255,140,58,0.35) 0%, transparent 60%), radial-gradient(ellipse 120% 100% at 50% 100%, #1a0f08 0%, #110820 50%, #06051a 100%)',
          color: '#efe8d9',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* 별 점들 */}
        {Array.from({ length: 60 }).map((_, i) => {
          const x = (i * 53) % 1200;
          const y = (i * 31) % 280;
          const size = 1 + ((i * 7) % 3);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                background: '#fff5e8',
                borderRadius: '50%',
                opacity: 0.4 + ((i * 11) % 60) / 100,
              }}
            />
          );
        })}

        {/* 캠프파이어 글로우 */}
        <div
          style={{
            position: 'absolute',
            left: 540,
            top: 360,
            width: 120,
            height: 200,
            background:
              'radial-gradient(ellipse at 50% 100%, #fff7d6 0%, #ffd590 22%, #ff8c3a 48%, #c25a2c 75%, transparent 100%)',
            borderRadius: '50% 50% 30% 30% / 80% 80% 20% 20%',
            opacity: 0.95,
            display: 'flex',
          }}
        />

        {/* 통나무 */}
        <div
          style={{
            position: 'absolute',
            left: 510,
            top: 500,
            width: 180,
            height: 30,
            background: 'linear-gradient(180deg, #6b4226, #3e2614, #1f130a)',
            borderRadius: 6,
            transform: 'rotate(8deg)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 510,
            top: 510,
            width: 180,
            height: 30,
            background: 'linear-gradient(180deg, #6b4226, #3e2614, #1f130a)',
            borderRadius: 6,
            transform: 'rotate(-8deg)',
            display: 'flex',
          }}
        />

        {/* 타이틀 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 2,
            marginTop: -40,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#f4ede0',
              textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 40px rgba(255,140,58,0.3)',
            }}
          >
            군고구마 굽기
          </div>
          <div
            style={{
              fontSize: 26,
              color: 'rgba(232, 129, 70, 0.9)',
              marginTop: 18,
              letterSpacing: '0.04em',
              fontStyle: 'italic',
            }}
          >
            모닥불 옆에서 익명으로 털어놓는 채팅
          </div>
        </div>

        {/* 푸터 */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            display: 'flex',
            gap: 30,
            color: 'rgba(163, 152, 136, 0.7)',
            fontSize: 18,
            letterSpacing: '0.1em',
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
    { ...size },
  );
}
