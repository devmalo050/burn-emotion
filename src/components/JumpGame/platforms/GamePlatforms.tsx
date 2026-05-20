'use client';
// 게임용 발판 본체 컴포넌트 — width 가변형. Claude Design 발판 디자인 이식.
// 본체 바닥(div bottom) = 발판 충돌 라인(p.y). 장식(사슬·코일·↑)은 본체 위로 absolute.
import type { CSSProperties } from 'react';
import type { PlatformKind } from './platformLogic';

interface PlatProps {
  width: number;
  breaking?: boolean; // breakable 전용 — 밟혀서 부서지는 중
}

// === basic · 통나무판 ===
function Basic({ width }: PlatProps) {
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: 16,
        borderRadius: 4,
        background: 'linear-gradient(180deg, #6a3a20 0%, #4a2412 45%, #2a1206 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,170,90,0.35), inset 0 -3px 8px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.6), 0 -2px 14px rgba(255,140,40,0.22)',
      }}
    >
      <div style={{ position: 'absolute', top: 5, left: 8, right: 8, height: 1, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', top: 10, left: 14, right: 16, height: 1, background: 'rgba(0,0,0,0.3)' }} />
      <Knot side="l" />
      <Knot side="r" />
    </div>
  );
}

function Knot({ side }: { side: 'l' | 'r' }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        [side === 'l' ? 'left' : 'right']: 5,
        width: 7,
        height: 7,
        borderRadius: '50%',
        transform: 'translateY(-50%)',
        background: 'radial-gradient(circle at 35% 30%, #a05a28 0%, #5a2a14 40%, #200a04 100%)',
        boxShadow: 'inset 0 0 2px rgba(0,0,0,0.6)',
      } as CSSProperties}
    />
  );
}

// === breakable · 재가 된 발판 ===
const BREAK_SHARDS = [
  { sx: -34, sy: 38, sr: -180 },
  { sx: -18, sy: 44, sr: -90 },
  { sx: -6, sy: 48, sr: 60 },
  { sx: 8, sy: 46, sr: -50 },
  { sx: 20, sy: 42, sr: 140 },
  { sx: 34, sy: 36, sr: 220 },
];

function Breakable({ width, breaking }: PlatProps) {
  return (
    <div style={{ position: 'relative', width, height: 15 }}>
      {/* 발판 본체 — 밟히면 crack → shatter 애니메이션 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 5,
          background: 'linear-gradient(180deg, #8a8278 0%, #5a5048 50%, #2c2620 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,250,240,0.35), inset 0 -3px 6px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.55)',
          animation: breaking ? 'jumpPlatBreak 0.4s ease-in forwards' : undefined,
        }}
      >
        <div style={{ position: 'absolute', top: 4, left: '15%', width: '28%', height: 1, background: 'rgba(40,30,20,0.55)' }} />
        <div style={{ position: 'absolute', top: 8, left: '45%', width: '20%', height: 1, background: 'rgba(40,30,20,0.45)' }} />
        <div style={{ position: 'absolute', top: 5, right: '12%', width: '16%', height: 1, background: 'rgba(40,30,20,0.5)' }} />
      </div>
      {/* 부서질 때 흩어지는 파편 */}
      {breaking &&
        BREAK_SHARDS.map((s, i) => (
          <div
            key={i}
            style={
              {
                position: 'absolute',
                left: '50%',
                top: 4,
                width: 6 + (i % 3) * 2,
                height: 5,
                borderRadius: 2,
                background: 'linear-gradient(180deg, #6a6058, #2c2620)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
                '--sx': `${s.sx}px`,
                '--sy': `${s.sy}px`,
                '--sr': `${s.sr}deg`,
                animation: 'jumpPlatShard 0.4s ease-in forwards',
              } as CSSProperties
            }
          />
        ))}
    </div>
  );
}

// === drift · 떠다니는 통나무 ===
function Drift({ width }: PlatProps) {
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: 18,
        borderRadius: 999,
        background: 'linear-gradient(180deg, #623420 0%, #3a1c0d 60%, #190a04 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,160,80,0.3), inset 0 -3px 6px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.55)',
      }}
    >
      <LogEnd side="l" />
      <LogEnd side="r" />
      <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3, opacity: 0.7 }}>
        <Chevron dir="l" />
        <Chevron dir="r" />
      </div>
    </div>
  );
}

function LogEnd({ side }: { side: 'l' | 'r' }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        [side === 'l' ? 'left' : 'right']: -7,
        width: 22,
        height: 22,
        borderRadius: '50%',
        transform: 'translateY(-50%)',
        background: 'radial-gradient(circle at 50% 50%, #ffb86b 0%, #b54a16 16%, #4a1d0c 45%, #1d0905 80%)',
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.7)',
      } as CSSProperties}
    />
  );
}

function Chevron({ dir }: { dir: 'l' | 'r' }) {
  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderTop: '1.5px solid rgba(255,210,140,0.7)',
        borderRight: '1.5px solid rgba(255,210,140,0.7)',
        transform: `rotate(${dir === 'l' ? -135 : 45}deg)`,
      }}
    />
  );
}

// === swing · 사슬 그네 (진자) ===
// 사슬은 plank 접점 기준으로 기울어짐 — JumpGameOverlay 가 매 프레임 swingAngle 적용.
function Swing({ width }: PlatProps) {
  return (
    <div style={{ position: 'relative', width, height: 16 }}>
      {/* 사슬 + 앵커 — plank 위로. data-swing-chain 으로 각도 갱신됨 */}
      <ChainStub offset={9} />
      <ChainStub offset={9} right />
      {/* plank */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4,
          background: 'linear-gradient(180deg, #5a3018 0%, #3a1c0e 50%, #1c0a05 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,160,70,0.3), inset 0 -3px 6px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.55)',
        }}
      />
    </div>
  );
}

// 사슬 길이 = platformLogic SWING_LEN(64) 과 일치 — 앵커가 진자 회전축에 놓이게.
function ChainStub({ offset, right }: { offset: number; right?: boolean }) {
  return (
    <div
      data-swing-chain=""
      style={{
        position: 'absolute',
        [right ? 'right' : 'left']: offset,
        bottom: '100%',
        width: 6,
        height: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        transformOrigin: '50% 100%',
      } as CSSProperties}
    >
      {/* 앵커 */}
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #8a8278, #2a2620)',
          boxShadow: 'inset 0 0 1px rgba(0,0,0,0.6)',
          marginBottom: 1,
          flexShrink: 0,
        }}
      />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            flexShrink: 0,
            border: '1.5px solid #5a5048',
            borderRadius: '50%',
            transform: i % 2 === 0 ? 'rotate(0deg)' : 'rotate(90deg)',
          }}
        />
      ))}
    </div>
  );
}

// === lift · 상하 리프트 ===
function Lift({ width }: PlatProps) {
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: 13,
        borderRadius: 3,
        background: 'linear-gradient(180deg, #6a625a 0%, #3a342e 60%, #1a1612 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,210,160,0.3), inset 0 -2px 4px rgba(0,0,0,0.55), 0 3px 10px rgba(0,0,0,0.55), 0 0 16px rgba(255,140,40,0.15)',
      }}
    >
      {[0.12, 0.32, 0.5, 0.68, 0.88].map((f) => (
        <div
          key={f}
          style={{
            position: 'absolute',
            top: '50%',
            left: `${f * 100}%`,
            width: 3,
            height: 3,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle at 30% 30%, #cab8a0, #4a3e30)',
          }}
        />
      ))}
      <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', opacity: 0.65, width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '5px solid rgba(255,210,140,0.7)' }} />
      <div style={{ position: 'absolute', bottom: -11, left: '50%', transform: 'translateX(-50%)', opacity: 0.65, width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid rgba(255,210,140,0.7)' }} />
    </div>
  );
}

// === spring · 금속 코일 ===
function Spring({ width }: PlatProps) {
  return (
    <div style={{ position: 'relative', width, height: 14, display: 'flex', justifyContent: 'center' }}>
      {/* 코일 + head plate — plank 위로 */}
      <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: 54, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 54,
            height: 5,
            borderRadius: 2,
            background: 'linear-gradient(180deg, #d4c0a0, #6a5e4e 60%, #3a3228)',
            boxShadow: 'inset 0 1px 0 rgba(255,240,200,0.5), 0 1px 2px rgba(0,0,0,0.5)',
          }}
        />
        <div style={{ width: 48, padding: '1px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 3,
                borderRadius: 1,
                background: 'linear-gradient(180deg, #e8d4b8 0%, #8a7a64 50%, #2a241c 100%)',
                boxShadow: '0 1px 1px rgba(0,0,0,0.4)',
              }}
            />
          ))}
        </div>
      </div>
      {/* wood base = plank */}
      <div
        style={{
          width,
          height: 14,
          borderRadius: 3,
          background: 'linear-gradient(180deg, #5a3018 0%, #3a1c0e 50%, #1c0a05 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,170,90,0.3), inset 0 -2px 4px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.55)',
        }}
      />
    </div>
  );
}

// === hot · 달궈진 철망 ===
function Hot({ width }: PlatProps) {
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: 15,
        borderRadius: 3,
        background: 'linear-gradient(180deg, #8a1a08 0%, #ff6018 30%, #ffa040 50%, #ff6018 70%, #5a0e04 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,220,140,0.7), inset 0 -2px 4px rgba(0,0,0,0.5), 0 0 22px rgba(255,80,20,0.7), 0 4px 12px rgba(0,0,0,0.4)',
        animation: 'plat-ember-pulse 2.4s infinite ease-in-out',
        overflow: 'hidden',
      }}
    >
      {[0.14, 0.28, 0.42, 0.56, 0.7, 0.84].map((f) => (
        <div
          key={f}
          style={{
            position: 'absolute',
            left: `${f * 100}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: 'linear-gradient(180deg, #2a0804 0%, #1a0402 50%, #2a0804 100%)',
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

// === rolling · 깎인 통나무 ===
function Rolling({ width }: PlatProps) {
  return (
    <div style={{ position: 'relative', width, height: 20 }}>
      <div
        style={{
          position: 'absolute',
          inset: '1px 14px',
          borderRadius: 999,
          background: 'linear-gradient(180deg, #4a2614 0%, #2a1408 50%, #150702 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,140,60,0.25), inset 0 -4px 8px rgba(0,0,0,0.7), 0 5px 14px rgba(0,0,0,0.6), 0 -2px 16px rgba(255,140,40,0.15)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: 'calc(100% + 60px)',
            backgroundImage:
              'repeating-linear-gradient(105deg, transparent 0 14px, rgba(0,0,0,0.7) 14px 16px, rgba(255,150,60,0.25) 16px 17.5px, rgba(0,0,0,0.7) 17.5px 19px, transparent 19px 30px)',
            animation: 'plat-roll-surface 1.4s linear infinite',
          }}
        />
        <div style={{ position: 'absolute', top: 1, left: 8, right: 8, height: 3, background: 'linear-gradient(180deg, rgba(255,150,80,0.35), transparent)', borderRadius: 999, filter: 'blur(1px)' }} />
      </div>
      <RollDisc side="l" />
      <RollDisc side="r" />
    </div>
  );
}

function RollDisc({ side }: { side: 'l' | 'r' }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        [side === 'l' ? 'left' : 'right']: -3,
        width: 24,
        height: 24,
        borderRadius: '50%',
        transform: 'translateY(-50%)',
        background:
          'radial-gradient(circle at 50% 50%, #ffd0a0 0%, #d88450 8%, #a05428 22%, #5a2a14 45%, #2a1208 75%, #160806 100%)',
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.7), 0 0 8px rgba(255,120,40,0.25), 0 2px 4px rgba(0,0,0,0.5)',
        zIndex: 3,
      } as CSSProperties}
    >
      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: '1px solid rgba(40,18,8,0.55)' }} />
      <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: '1px solid rgba(40,18,8,0.4)' }} />
      <div style={{ position: 'absolute', inset: '42% 32% 42% 32%', background: 'rgba(40,18,8,0.45)', borderRadius: '50%' }} />
    </div>
  );
}

const PLATFORM_COMPONENTS: Record<PlatformKind, (p: PlatProps) => React.ReactElement> = {
  basic: Basic,
  breakable: Breakable,
  drift: Drift,
  swing: Swing,
  lift: Lift,
  spring: Spring,
  hot: Hot,
  rolling: Rolling,
};

export function GamePlatform({
  kind,
  width,
  breaking,
}: {
  kind: PlatformKind;
  width: number;
  breaking?: boolean;
}) {
  const Comp = PLATFORM_COMPONENTS[kind];
  return <Comp width={width} breaking={breaking} />;
}
