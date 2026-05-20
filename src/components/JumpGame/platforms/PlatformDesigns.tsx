'use client';
// 모닥불 점프맵 발판 디자인 — Claude Design 핸드오프(Platforms.html) 이식.
// 7종 × 3변형 = 21개. keyframes 는 globals.css 의 plat-* 참조.
// 데모 래퍼(ArtBg / LandingHost / BreakHost / Character)는 갤러리 확인용.
// 실제 게임 적용 시 발판 본체만 추출해 쓰면 됨.
import type { CSSProperties, ReactNode } from 'react';

/* === 공유 아트보드 배경 — 어두운 + 따뜻한 잉걸불 바닥광 === */
function ArtBg({
  children,
  glowColor = 'rgba(255,140,40,0.28)',
  floor = true,
}: {
  children: ReactNode;
  glowColor?: string;
  floor?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse 90% 70% at 50% 100%, #1a0a05 0%, #0a0604 55%, #050201 100%)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 22,
      }}
    >
      {floor && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            width: '92%',
            height: 30,
            transform: 'translateX(-50%)',
            background: `radial-gradient(ellipse at 50% 100%, ${glowColor}, transparent 70%)`,
            filter: 'blur(10px)',
            pointerEvents: 'none',
          }}
        />
      )}
      {children}
    </div>
  );
}

/* === 1. 기본 발판 === */

function Knot({ x, right }: { x?: number | string; right?: number }) {
  const style: CSSProperties = {
    position: 'absolute',
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: '50%',
    transform: 'translateY(-50%)',
    background:
      'radial-gradient(circle at 35% 30%, #a05a28 0%, #5a2a14 40%, #200a04 100%)',
    boxShadow: 'inset 0 0 2px rgba(0,0,0,0.6)',
  };
  if (right != null) style.right = right;
  else style.left = x;
  return <div style={style} />;
}

// 떨어져 착지하는 작은 실루엣 — 스케일 기준점
function Character({ delay = 0, color = '#ffd9a8' }: { delay?: number; color?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '100%',
        marginBottom: 0,
        width: 14,
        height: 18,
        pointerEvents: 'none',
        animation: `plat-drop 2.6s ${delay}s infinite cubic-bezier(.5,.05,.5,1)`,
        transform: 'translate(-50%, -90px)',
        opacity: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: color,
          borderRadius: '40% 40% 35% 35% / 50% 50% 35% 35%',
          boxShadow:
            'inset 0 -3px 4px rgba(180,90,40,0.4), 0 2px 4px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 6, left: 3, width: 2, height: 2.5, background: '#1a0805', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: 6, right: 3, width: 2, height: 2.5, background: '#1a0805', borderRadius: '50%' }} />
      </div>
    </div>
  );
}

// 발판을 감싸 착지 바운스 + 그림자 + 떨어지는 캐릭터 인디케이터를 2.6s 루프로 재생
function LandingHost({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Character delay={delay} />
      <div style={{ animation: `plat-land 2.6s ${delay}s infinite ease-out`, transformOrigin: '50% 100%' }}>
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -10,
          width: '70%',
          height: 6,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)',
          filter: 'blur(2px)',
          transformOrigin: '50% 50%',
          animation: `plat-land-shadow 2.6s ${delay}s infinite ease-out`,
        }}
      />
    </div>
  );
}

// A · 통나무판
export function PlankBasic() {
  return (
    <ArtBg>
      <LandingHost>
        <div
          style={{
            position: 'relative',
            width: 168,
            height: 22,
            borderRadius: 4,
            background: 'linear-gradient(180deg, #6a3a20 0%, #4a2412 45%, #2a1206 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,170,90,0.35), inset 0 -3px 8px rgba(0,0,0,0.55), 0 5px 16px rgba(0,0,0,0.65), 0 -2px 18px rgba(255,140,40,0.25)`,
            transformOrigin: '50% 100%',
          }}
        >
          <div style={{ position: 'absolute', top: 7, left: 10, right: 10, height: 1, background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'absolute', top: 13, left: 18, right: 22, height: 1, background: 'rgba(0,0,0,0.3)' }} />
          <Knot x={6} />
          <Knot right={6} />
        </div>
      </LandingHost>
    </ArtBg>
  );
}

// B · 돌판
export function StoneSlab() {
  return (
    <ArtBg>
      <LandingHost>
        <div
          style={{
            position: 'relative',
            width: 156,
            height: 26,
            borderRadius: '6px 6px 4px 4px',
            background: 'linear-gradient(180deg, #5a544a 0%, #3a342a 50%, #1c1812 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,200,150,0.25), inset 0 -4px 8px rgba(0,0,0,0.55), 0 5px 14px rgba(0,0,0,0.6), 0 -2px 20px rgba(255,140,40,0.3)`,
            transformOrigin: '50% 100%',
          }}
        >
          <div style={{ position: 'absolute', top: 6, left: 14, width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
          <div style={{ position: 'absolute', top: 11, left: 38, width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', top: 8, left: 88, width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.14)' }} />
          <div style={{ position: 'absolute', top: 14, right: 18, width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div
            style={{
              position: 'absolute',
              left: 6,
              right: 6,
              bottom: 0,
              height: 3,
              borderRadius: 2,
              background: 'linear-gradient(180deg, transparent, rgba(255,120,40,0.5))',
              filter: 'blur(0.5px)',
            }}
          />
        </div>
      </LandingHost>
    </ArtBg>
  );
}

// C · 잉걸불 돌
export function EmberCrust() {
  return (
    <ArtBg glowColor="rgba(255,160,40,0.45)">
      <LandingHost>
        <div
          style={{
            position: 'relative',
            width: 150,
            height: 24,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 50% 30%, #2a1208 0%, #1a0804 100%)',
            boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.5), 0 0 24px rgba(255,140,40,0.5)`,
            transformOrigin: '50% 100%',
          }}
        >
          <div style={{ position: 'absolute', top: 8, left: 20, right: 30, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,200,80,0.95), rgba(255,140,40,0.7), transparent)', filter: 'blur(0.4px)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: 14, left: 42, width: 36, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(255,180,60,0.85), transparent)', filter: 'blur(0.4px)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: 11, right: 24, width: 22, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(255,220,120,0.9), transparent)', filter: 'blur(0.4px)', borderRadius: 1 }} />
        </div>
      </LandingHost>
    </ArtBg>
  );
}

/* === 2. 부서지는 발판 === */

function LogEnd({ side }: { side: 'l' | 'r' }) {
  const pos: CSSProperties = side === 'l' ? { left: -8 } : { right: -8 };
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        ...pos,
        width: 24,
        height: 24,
        borderRadius: '50%',
        transform: 'translateY(-50%)',
        background: 'radial-gradient(circle at 50% 50%, #ffb86b 0%, #b54a16 16%, #4a1d0c 45%, #1d0905 80%)',
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.7)',
      }}
    />
  );
}

function BreakHost({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', animation: 'plat-break 4.5s infinite', transformOrigin: '50% 100%' }}>
      {children}
    </div>
  );
}

// 부서질 때 흩어지는 파편 6개
function Shards({ color = '#3a1a0c', hot = true }: { color?: string; hot?: boolean }) {
  const shards = [
    { dx: -38, rot: -90 },
    { dx: -20, rot: -45 },
    { dx: -8, rot: 15 },
    { dx: 8, rot: -25 },
    { dx: 22, rot: 60 },
    { dx: 38, rot: 110 },
  ];
  return (
    <>
      {shards.map((s, i) => (
        <div
          key={i}
          style={
            {
              position: 'absolute',
              left: '50%',
              bottom: 6,
              width: 8 + (i % 3) * 2,
              height: 4,
              background: color,
              borderRadius: 2,
              boxShadow: hot
                ? `0 0 4px rgba(255,140,40,0.6), inset 0 0 1px rgba(255,180,80,0.5)`
                : `inset 0 0 1px rgba(255,255,255,0.2)`,
              '--dx': s.dx + 'px',
              '--rot': s.rot + 'deg',
              animation: 'plat-shard 4.5s infinite',
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

function Twig({ top, skew }: { top: number; skew: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 8,
        right: 8,
        height: 3,
        borderRadius: 999,
        background: 'linear-gradient(180deg, #6a3a1c, #2a1208)',
        transform: `rotate(${skew}deg)`,
        boxShadow: '0 1px 1px rgba(0,0,0,0.6), inset 0 0.5px 0 rgba(255,160,80,0.2)',
      }}
    />
  );
}

// A · 금간 통나무
export function CrackedLog() {
  return (
    <ArtBg>
      <BreakHost>
        <div
          style={{
            position: 'relative',
            width: 160,
            height: 24,
            borderRadius: 999,
            background: 'linear-gradient(180deg, #5a311a 0%, #341809 60%, #170803 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,160,80,0.3), inset 0 -4px 8px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.6), 0 -2px 16px rgba(255,140,40,0.2)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: '40%',
              width: 30,
              height: 14,
              background:
                'linear-gradient(70deg, transparent 45%, rgba(0,0,0,0.85) 47%, rgba(255,180,60,0.85) 49%, rgba(0,0,0,0.85) 51%, transparent 53%)',
              transformOrigin: 'center',
              animation: 'plat-crack-grow 4.5s infinite',
            }}
          />
          <LogEnd side="l" />
          <LogEnd side="r" />
        </div>
        <Shards />
      </BreakHost>
    </ArtBg>
  );
}

// B · 재가 된 발판
export function AshCrust() {
  return (
    <ArtBg glowColor="rgba(180,160,140,0.18)">
      <BreakHost>
        <div
          style={{
            position: 'relative',
            width: 160,
            height: 18,
            borderRadius: 6,
            background: 'linear-gradient(180deg, #8a8278 0%, #5a5048 50%, #2c2620 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,250,240,0.35), inset 0 -3px 6px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.55)`,
          }}
        >
          <div style={{ position: 'absolute', top: 5, left: 24, width: 38, height: 1, background: 'rgba(40,30,20,0.55)' }} />
          <div style={{ position: 'absolute', top: 9, left: 60, width: 28, height: 1, background: 'rgba(40,30,20,0.45)' }} />
          <div style={{ position: 'absolute', top: 6, right: 18, width: 24, height: 1, background: 'rgba(40,30,20,0.5)' }} />
          <div
            style={{
              position: 'absolute',
              top: 7,
              left: '30%',
              width: 60,
              height: 3,
              background: 'linear-gradient(90deg, transparent, rgba(255,160,40,0.95), transparent)',
              filter: 'blur(0.6px)',
              animation: 'plat-crack-grow 4.5s infinite',
            }}
          />
        </div>
        <Shards color="#6a6058" hot={false} />
      </BreakHost>
    </ArtBg>
  );
}

// C · 묶음 잔가지
export function TwigBundle() {
  return (
    <ArtBg>
      <BreakHost>
        <div style={{ position: 'relative', width: 160, height: 22 }}>
          <Twig top={0} skew={-1} />
          <Twig top={5} skew={2} />
          <Twig top={11} skew={-2} />
          <Twig top={16} skew={1} />
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: '42%',
              width: 14,
              height: 26,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #6a4a28, #8a6438, #6a4a28)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '45%',
              width: 22,
              height: 8,
              background:
                'linear-gradient(70deg, transparent 45%, rgba(0,0,0,0.9) 47%, rgba(255,180,60,0.7) 49%, rgba(0,0,0,0.9) 51%, transparent 53%)',
              animation: 'plat-crack-grow 4.5s infinite',
            }}
          />
        </div>
        <Shards color="#4a2814" />
      </BreakHost>
    </ArtBg>
  );
}

/* === 3. 움직이는 발판 === */

function Chevron({ dir }: { dir: 'l' | 'r' }) {
  const rot = dir === 'l' ? -135 : 45;
  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderTop: '1.5px solid rgba(255,210,140,0.7)',
        borderRight: '1.5px solid rgba(255,210,140,0.7)',
        transform: `rotate(${rot}deg)`,
      }}
    />
  );
}

function Bolt() {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #8a8278, #2a2620)',
        boxShadow: 'inset 0 0 1px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
      }}
    />
  );
}

function Chain({ x, right }: { x?: number | string; right?: number }) {
  const pos: CSSProperties = right != null ? { right } : { left: x };
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        ...pos,
        width: 6,
        height: 110,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 8,
            border: '1.5px solid #5a5048',
            borderRadius: '50%',
            transform: i % 2 === 0 ? 'rotate(0deg)' : 'rotate(90deg)',
            background: 'transparent',
          }}
        />
      ))}
    </div>
  );
}

// A · 떠다니는 통나무
export function FloatingLog() {
  return (
    <ArtBg>
      <div style={{ animation: 'plat-move-x 4s infinite ease-in-out' }}>
        <div
          style={{
            position: 'relative',
            width: 140,
            height: 22,
            borderRadius: 999,
            background: 'linear-gradient(180deg, #623420 0%, #3a1c0d 60%, #190a04 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,160,80,0.3), inset 0 -3px 6px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.55)`,
          }}
        >
          <LogEnd side="l" />
          <LogEnd side="r" />
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3, opacity: 0.7 }}>
            <Chevron dir="l" />
            <Chevron dir="r" />
          </div>
        </div>
      </div>
    </ArtBg>
  );
}

// B · 사슬 그네
export function ChainPlatform() {
  return (
    <ArtBg>
      <div style={{ position: 'relative', width: 150, height: 140 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 21px' }}>
          <Bolt />
          <Bolt />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 0,
            right: 0,
            bottom: 0,
            transformOrigin: '50% 0',
            animation: 'plat-swing 3.6s infinite ease-in-out',
          }}
        >
          <Chain x={22} />
          <Chain right={22} />
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)' }}>
            <div
              style={{
                width: 120,
                height: 18,
                borderRadius: 4,
                background: 'linear-gradient(180deg, #5a3018 0%, #3a1c0e 50%, #1c0a05 100%)',
                boxShadow: `inset 0 1px 0 rgba(255,160,70,0.3), inset 0 -3px 6px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.55)`,
              }}
            />
          </div>
        </div>
      </div>
    </ArtBg>
  );
}

// C · 상하 리프트
export function VerticalLift() {
  return (
    <ArtBg>
      <div style={{ animation: 'plat-move-y 3.6s infinite ease-in-out' }}>
        <div
          style={{
            position: 'relative',
            width: 150,
            height: 14,
            borderRadius: 3,
            background: 'linear-gradient(180deg, #6a625a 0%, #3a342e 60%, #1a1612 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,210,160,0.3), inset 0 -2px 4px rgba(0,0,0,0.55), 0 3px 10px rgba(0,0,0,0.55), 0 0 18px rgba(255,140,40,0.15)`,
          }}
        >
          {[12, 36, 60, 90, 114, 138].map((left) => (
            <div
              key={left}
              style={{
                position: 'absolute',
                top: '50%',
                left,
                width: 3,
                height: 3,
                borderRadius: '50%',
                transform: 'translateY(-50%)',
                background: 'radial-gradient(circle at 30% 30%, #cab8a0, #4a3e30)',
              }}
            />
          ))}
          <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', opacity: 0.65 }}>
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '5px solid rgba(255,210,140,0.7)' }} />
          </div>
          <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', opacity: 0.65 }}>
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid rgba(255,210,140,0.7)' }} />
          </div>
        </div>
      </div>
    </ArtBg>
  );
}

/* === 4. 스프링 === */

function Coil() {
  return (
    <div
      style={{
        height: 3,
        borderRadius: 1,
        background: 'linear-gradient(180deg, #e8d4b8 0%, #8a7a64 50%, #2a241c 100%)',
        boxShadow: '0 1px 1px rgba(0,0,0,0.4)',
      }}
    />
  );
}

function Spot({ top, left, d }: { top: number; left: number; d: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        width: d,
        height: d * 0.7,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 35% 30%, #fff8e8 0%, #d8c8a8 70%, #a89878 100%)',
        boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.15)',
      }}
    />
  );
}

function SpringArrow({ marginBottom = 6 }: { marginBottom?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '100%',
        marginBottom,
        color: '#ffd070',
        fontSize: 18,
        lineHeight: 1,
        fontWeight: 700,
        transform: 'translateX(-50%)',
        transformOrigin: 'center bottom',
        animation: 'plat-spring-arrow 2.6s infinite ease-out',
        textShadow: '0 0 8px rgba(255,180,60,0.85)',
      }}
    >
      ↑
    </div>
  );
}

// A · 금속 코일
export function CoilSpring() {
  return (
    <ArtBg>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SpringArrow marginBottom={6} />
        <div style={{ width: 80, transformOrigin: '50% 100%', animation: 'plat-spring 2.6s infinite ease-out' }}>
          <div
            style={{
              width: 80,
              height: 6,
              borderRadius: 2,
              background: 'linear-gradient(180deg, #d4c0a0, #6a5e4e 60%, #3a3228)',
              boxShadow: 'inset 0 1px 0 rgba(255,240,200,0.5), 0 1px 2px rgba(0,0,0,0.5)',
              margin: '0 auto',
            }}
          />
          <div style={{ width: 72, height: 14, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 1, padding: '1px 0' }}>
            <Coil />
            <Coil />
            <Coil />
          </div>
          <div
            style={{
              width: 120,
              height: 14,
              borderRadius: 3,
              margin: '0 auto',
              background: 'linear-gradient(180deg, #5a3018 0%, #3a1c0e 50%, #1c0a05 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,170,90,0.3), inset 0 -2px 4px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.55)',
            }}
          />
        </div>
      </div>
    </ArtBg>
  );
}

// B · 빨간 버섯
export function MushroomBouncy() {
  return (
    <ArtBg>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SpringArrow marginBottom={8} />
        <div
          style={{
            width: 120,
            transformOrigin: '50% 100%',
            animation: 'plat-spring 2.6s infinite ease-out',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 110,
              height: 42,
              background: 'radial-gradient(ellipse at 50% 55%, #c0382a 0%, #8a1e14 50%, #4a0c08 100%)',
              borderRadius: '60% 60% 30% 30% / 90% 90% 18% 18%',
              boxShadow: `inset 0 4px 8px rgba(255,140,120,0.3), inset 0 -6px 10px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.55), 0 0 18px rgba(255,80,40,0.2)`,
            }}
          >
            <Spot top={8} left={22} d={10} />
            <Spot top={5} left={48} d={8} />
            <Spot top={11} left={72} d={9} />
            <Spot top={20} left={38} d={6} />
            <Spot top={22} left={64} d={7} />
          </div>
          <div
            style={{
              width: 36,
              height: 14,
              marginTop: -2,
              background: 'linear-gradient(180deg, #f0e0c8 0%, #b8a890 60%, #5a4e3e 100%)',
              borderRadius: '6px 6px 8px 8px',
              boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      </div>
    </ArtBg>
  );
}

// C · 휘어진 나무
export function BentBow() {
  return (
    <ArtBg>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SpringArrow marginBottom={8} />
        <div style={{ width: 150, transformOrigin: '50% 100%', animation: 'plat-spring 2.6s infinite ease-out' }}>
          <div
            style={{
              position: 'relative',
              width: 150,
              height: 20,
              background: 'linear-gradient(180deg, #6a3a20 0%, #3a1c0e 70%, #1c0a05 100%)',
              borderRadius: '50% 50% 6px 6px / 90% 90% 6px 6px',
              boxShadow: 'inset 0 2px 0 rgba(255,170,90,0.3), inset 0 -3px 6px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.55)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 10,
                right: 10,
                height: 1.5,
                background: 'rgba(220,200,160,0.7)',
                boxShadow: '0 0 4px rgba(255,200,120,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </ArtBg>
  );
}

/* === 5. 잉걸불 / 뜨거운 발판 === */

function Spark({ left, delay, color }: { left: number; delay: number; color: string }) {
  // --sx 는 left 기반 결정적 값 — SSR/CSR hydration 일치.
  const sx = ((left * 37) % 30) - 15;
  return (
    <div
      style={
        {
          position: 'absolute',
          left,
          bottom: 18,
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
          '--sx': sx + 'px',
          animation: `plat-spark-rise 2s infinite ease-out ${delay}s`,
          opacity: 0,
        } as CSSProperties
      }
    />
  );
}

// A · 숯더미
export function GlowingCoals() {
  const lumps = [
    { l: 8, t: 6, w: 32, h: 18 },
    { l: 36, t: 2, w: 36, h: 24 },
    { l: 70, t: 8, w: 28, h: 16 },
    { l: 96, t: 1, w: 38, h: 26 },
    { l: 130, t: 6, w: 24, h: 18 },
  ];
  return (
    <ArtBg glowColor="rgba(255,80,20,0.55)">
      <div style={{ position: 'relative', width: 160, height: 30 }}>
        {lumps.map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.l,
              top: c.t,
              width: c.w,
              height: c.h,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at 50% 35%, #2a1208 0%, #0a0402 100%)',
              boxShadow: `inset 0 -3px 5px rgba(0,0,0,0.7), inset 0 1px 2px rgba(60,30,18,0.5), 0 2px 4px rgba(0,0,0,0.6)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '15%',
                right: '15%',
                height: 1.5,
                background:
                  'linear-gradient(90deg, transparent, rgba(255,140,40,0.95), rgba(255,220,120,0.8), rgba(255,140,40,0.7), transparent)',
                filter: 'blur(0.4px)',
                animation: `plat-ember-pulse ${2 + (i % 3) * 0.4}s infinite ease-in-out ${i * 0.2}s`,
              }}
            />
          </div>
        ))}
        <Spark left={40} delay={0} color="#ffd070" />
        <Spark left={88} delay={0.5} color="#ff8a3a" />
        <Spark left={108} delay={1.0} color="#ffb060" />
        <Spark left={64} delay={1.5} color="#ff8a3a" />
      </div>
    </ArtBg>
  );
}

// B · 달궈진 철망
export function IronGrate() {
  return (
    <ArtBg glowColor="rgba(255,60,20,0.55)">
      <div style={{ position: 'relative', width: 160, height: 18 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 3,
            background: 'linear-gradient(180deg, #8a1a08 0%, #ff6018 30%, #ffa040 50%, #ff6018 70%, #5a0e04 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,220,140,0.7), inset 0 -2px 4px rgba(0,0,0,0.5), 0 0 24px rgba(255,80,20,0.7), 0 4px 12px rgba(0,0,0,0.4)`,
            animation: 'plat-ember-pulse 2.4s infinite ease-in-out',
          }}
        >
          {[20, 40, 60, 80, 100, 120, 140].map((x, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'linear-gradient(180deg, #2a0804 0%, #1a0402 50%, #2a0804 100%)',
                borderRadius: 1,
                boxShadow: 'inset 0 0 1px rgba(0,0,0,0.6)',
              }}
            />
          ))}
        </div>
        <Spark left={30} delay={0} color="#ffe090" />
        <Spark left={90} delay={0.8} color="#ff8a3a" />
        <Spark left={130} delay={1.3} color="#ffd070" />
      </div>
    </ArtBg>
  );
}

// C · 용암 균열석
export function LavaStone() {
  return (
    <ArtBg glowColor="rgba(255,80,20,0.5)">
      <div
        style={{
          position: 'relative',
          width: 160,
          height: 24,
          borderRadius: 5,
          background: 'linear-gradient(180deg, #2a1208 0%, #1a0804 60%, #0a0402 100%)',
          boxShadow: `inset 0 1px 0 rgba(120,60,30,0.5), inset 0 -3px 6px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.55), 0 0 22px rgba(255,90,30,0.4)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 10,
            right: 10,
            height: 3,
            background:
              'linear-gradient(90deg, transparent, rgba(255,80,20,0.85) 20%, rgba(255,200,80,0.95) 35%, rgba(255,80,20,0.85) 55%, transparent 70%, rgba(255,200,80,0.9) 85%, transparent)',
            borderRadius: 1,
            filter: 'blur(0.5px)',
            animation: 'plat-ember-pulse 2.6s infinite ease-in-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 15,
            left: 30,
            width: 50,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,140,40,0.85), transparent)',
            borderRadius: 1,
            filter: 'blur(0.5px)',
            animation: 'plat-ember-pulse 2.6s infinite ease-in-out 0.4s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 24,
            width: 36,
            height: 1.5,
            background: 'linear-gradient(90deg, transparent, rgba(255,180,60,0.85), transparent)',
            borderRadius: 1,
            filter: 'blur(0.5px)',
            animation: 'plat-ember-pulse 2.6s infinite ease-in-out 0.9s',
          }}
        />
        <Spark left={60} delay={0.3} color="#ffd070" />
        <Spark left={110} delay={1.1} color="#ff8a3a" />
      </div>
    </ArtBg>
  );
}

/* === 6. 굴러가는 통나무 === */

function LogEndDisc({ side, size = 26 }: { side: 'l' | 'r'; size?: number }) {
  const pos: CSSProperties = side === 'l' ? { left: -size * 0.18 } : { right: -size * 0.18 };
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        ...pos,
        width: size,
        height: size,
        borderRadius: '50%',
        transform: 'translateY(-50%)',
        background:
          'radial-gradient(circle at 50% 50%, #ffd0a0 0%, #d88450 8%, #a05428 22%, #5a2a14 45%, #2a1208 75%, #160806 100%)',
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.7), 0 0 8px rgba(255,120,40,0.25), 0 2px 4px rgba(0,0,0,0.5)',
        zIndex: 3,
      }}
    >
      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: '1px solid rgba(40,18,8,0.55)' }} />
      <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: '1px solid rgba(40,18,8,0.4)' }} />
      <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', border: '1px solid rgba(40,18,8,0.3)' }} />
      <div style={{ position: 'absolute', inset: '45% 30% 45% 30%', background: 'rgba(40,18,8,0.45)', borderRadius: '50%' }} />
    </div>
  );
}

function RollArrows() {
  return (
    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3, opacity: 0.55 }}>
      <Chevron dir="r" />
      <Chevron dir="r" />
    </div>
  );
}

// A · 거친 껍질
export function BarkLog() {
  return (
    <ArtBg>
      <div style={{ animation: 'plat-roll-bob 3.2s infinite ease-in-out' }}>
        <div style={{ position: 'relative', width: 180, height: 30 }}>
          <div
            style={{
              position: 'absolute',
              inset: '0 18px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, #6a3a20 0%, #4a2614 35%, #2a1408 70%, #150702 100%)',
              boxShadow: `inset 0 1px 0 rgba(255,160,80,0.25), inset 0 -4px 8px rgba(0,0,0,0.65), 0 5px 14px rgba(0,0,0,0.6), 0 -2px 18px rgba(255,140,40,0.18)`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: 'calc(100% + 60px)',
                backgroundImage:
                  'repeating-linear-gradient(100deg, transparent 0 6px, rgba(20,8,4,0.55) 6px 8px, transparent 8px 12px, rgba(255,150,70,0.12) 12px 13px, transparent 13px 18px)',
                animation: 'plat-roll-surface 1.2s linear infinite',
              }}
            />
            <div style={{ position: 'absolute', top: 3, left: 8, right: 8, height: 5, background: 'linear-gradient(180deg, rgba(255,160,90,0.45), transparent)', borderRadius: 999, filter: 'blur(1px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 6, right: 6, height: 6, background: 'linear-gradient(0deg, rgba(0,0,0,0.6), transparent)', borderRadius: 999, pointerEvents: 'none' }} />
          </div>
          <LogEndDisc side="l" size={30} />
          <LogEndDisc side="r" size={30} />
          <RollArrows />
        </div>
      </div>
    </ArtBg>
  );
}

// B · 매끄러운 통나무
export function PeeledLog() {
  return (
    <ArtBg>
      <div style={{ animation: 'plat-roll-bob 3.4s infinite ease-in-out' }}>
        <div style={{ position: 'relative', width: 180, height: 30 }}>
          <div
            style={{
              position: 'absolute',
              inset: '0 18px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, #d8a070 0%, #b07a44 35%, #6a3e20 70%, #2a1408 100%)',
              boxShadow: `inset 0 1px 0 rgba(255,220,160,0.4), inset 0 -4px 8px rgba(0,0,0,0.45), 0 5px 14px rgba(0,0,0,0.55), 0 -2px 16px rgba(255,140,40,0.18)`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: 'calc(100% + 50px)',
                backgroundImage:
                  'repeating-linear-gradient(95deg, transparent 0 12px, rgba(80,42,20,0.35) 12px 13px, transparent 13px 22px, rgba(60,30,14,0.25) 22px 22.6px, transparent 22.6px 30px)',
                animation: 'plat-roll-surface 1.6s linear infinite',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, width: 'calc(100% + 60px)', animation: 'plat-roll-surface 1.6s linear infinite' }}>
              <div style={{ position: 'absolute', top: 8, left: 40, width: 8, height: 6, borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 50%, #5a2e14, #2a1208)', opacity: 0.85 }} />
              <div style={{ position: 'absolute', top: 18, left: 120, width: 5, height: 4, borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 50%, #5a2e14, #2a1208)', opacity: 0.7 }} />
            </div>
            <div style={{ position: 'absolute', top: 2, left: 10, right: 10, height: 6, background: 'linear-gradient(180deg, rgba(255,230,180,0.55), transparent)', borderRadius: 999, filter: 'blur(1px)', pointerEvents: 'none' }} />
          </div>
          <LogEndDisc side="l" size={30} />
          <LogEndDisc side="r" size={30} />
          <RollArrows />
        </div>
      </div>
    </ArtBg>
  );
}

// C · 깎인 통나무
export function NotchedLog() {
  return (
    <ArtBg>
      <div style={{ animation: 'plat-roll-bob 3.0s infinite ease-in-out' }}>
        <div style={{ position: 'relative', width: 180, height: 30 }}>
          <div
            style={{
              position: 'absolute',
              inset: '0 18px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, #4a2614 0%, #2a1408 50%, #150702 100%)',
              boxShadow: `inset 0 1px 0 rgba(255,140,60,0.25), inset 0 -4px 8px rgba(0,0,0,0.7), 0 5px 14px rgba(0,0,0,0.6), 0 -2px 18px rgba(255,140,40,0.15)`,
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
            <div style={{ position: 'absolute', top: 1, left: 8, right: 8, height: 4, background: 'linear-gradient(180deg, rgba(255,150,80,0.35), transparent)', borderRadius: 999, filter: 'blur(1px)', pointerEvents: 'none' }} />
          </div>
          <LogEndDisc side="l" size={30} />
          <LogEndDisc side="r" size={30} />
          <RollArrows />
        </div>
      </div>
    </ArtBg>
  );
}

/* === 7. 자연물 === */

// A · 빨간 버섯
export function StripedMushroom() {
  return (
    <ArtBg glowColor="rgba(255,80,40,0.18)">
      <div style={{ animation: 'plat-wiggle 4s infinite ease-in-out', transformOrigin: '50% 100%' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: 120,
              height: 50,
              background: 'radial-gradient(ellipse at 50% 60%, #b8362a 0%, #7a1a14 50%, #3a0a08 100%)',
              borderRadius: '60% 60% 30% 30% / 90% 90% 14% 14%',
              boxShadow: `inset 0 4px 8px rgba(255,140,120,0.25), inset 0 -6px 10px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.55)`,
            }}
          >
            <Spot top={9} left={20} d={11} />
            <Spot top={5} left={50} d={8} />
            <Spot top={12} left={80} d={10} />
            <Spot top={26} left={36} d={6} />
            <Spot top={28} left={66} d={7} />
          </div>
          <div
            style={{
              width: 32,
              height: 14,
              marginTop: -2,
              background: 'linear-gradient(180deg, #f0e0c8 0%, #b8a890 60%, #5a4e3e 100%)',
              borderRadius: '6px 6px 8px 8px',
              boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      </div>
    </ArtBg>
  );
}

// B · 이끼 낀 돌
export function MossyStone() {
  return (
    <ArtBg glowColor="rgba(120,140,60,0.2)">
      <div style={{ animation: 'plat-bob 4.5s infinite ease-in-out' }}>
        <div
          style={{
            position: 'relative',
            width: 140,
            height: 44,
            borderRadius: '50% 50% 30% 40% / 70% 70% 35% 35%',
            background: 'linear-gradient(180deg, #4a443a 0%, #2a2620 60%, #14110e 100%)',
            boxShadow: `inset 0 2px 4px rgba(160,150,130,0.3), inset 0 -3px 6px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.6), 0 -2px 18px rgba(255,140,40,0.18)`,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 14, width: 50, height: 14, background: 'radial-gradient(ellipse at 50% 30%, #5a7a32 0%, #2a3a18 70%, transparent 100%)', borderRadius: '50%', opacity: 0.85 }} />
          <div style={{ position: 'absolute', top: -2, left: 74, width: 46, height: 12, background: 'radial-gradient(ellipse at 50% 30%, #6a8a3a 0%, #2a3a18 70%, transparent 100%)', borderRadius: '50%', opacity: 0.8 }} />
          <div style={{ position: 'absolute', top: 18, left: 50, width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
          <div style={{ position: 'absolute', top: 25, left: 96, width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
        </div>
      </div>
    </ArtBg>
  );
}

function MiniShroom({
  size,
  colorA,
  colorB,
  shift,
  z,
}: {
  size: number;
  colorA: string;
  colorB: string;
  shift: number;
  z: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        transform: `translateX(calc(-50% + ${shift}px))`,
        zIndex: z,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: `plat-wiggle ${4 + (Math.abs(shift) % 5) * 0.2}s infinite ease-in-out ${(Math.abs(shift) % 7) * 0.15}s`,
          transformOrigin: '50% 100%',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: size,
            height: size * 0.45,
            background: `radial-gradient(ellipse at 50% 60%, ${colorA} 0%, ${colorB} 80%)`,
            borderRadius: '60% 60% 30% 30% / 90% 90% 14% 14%',
            boxShadow: `inset 0 2px 4px rgba(255,140,120,0.3), inset 0 -4px 6px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.55)`,
          }}
        >
          <Spot top={size * 0.1} left={size * 0.18} d={size * 0.13} />
          <Spot top={size * 0.06} left={size * 0.45} d={size * 0.1} />
          <Spot top={size * 0.18} left={size * 0.66} d={size * 0.12} />
        </div>
        <div
          style={{
            width: size * 0.28,
            height: size * 0.2,
            marginTop: -2,
            background: 'linear-gradient(180deg, #f0e0c8 0%, #b8a890 60%, #5a4e3e 100%)',
            borderRadius: '4px 4px 8px 8px',
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3), 0 2px 3px rgba(0,0,0,0.55)',
          }}
        />
      </div>
    </div>
  );
}

// C · 버섯 군락
export function MushroomCluster() {
  return (
    <ArtBg glowColor="rgba(180,80,40,0.22)">
      <div style={{ position: 'relative', width: 170, height: 60 }}>
        <MiniShroom size={42} colorA="#9a2a1e" colorB="#4a0a08" shift={-44} z={1} />
        <MiniShroom size={56} colorA="#b8362a" colorB="#5a0e08" shift={0} z={2} />
        <MiniShroom size={38} colorA="#8a221a" colorB="#3a0806" shift={44} z={1} />
      </div>
    </ArtBg>
  );
}
