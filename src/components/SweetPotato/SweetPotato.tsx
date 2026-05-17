import { memo } from 'react';
import { seededRandom } from '@/lib/seed-rng';

interface SweetPotatoProps {
  size?: number;
  roastLevel?: number;
  cracked?: boolean;
  seed?: number;
}

/**
 * 사실적인 호박/꿀고구마 — asymmetric, bumpy outline + multi-layer mottled skin
 *
 * 좌표계 80×140 (실제 고구마 비율 ~1.75:1)
 * - 위쪽이 줄기쪽(가늘고 끝이 뾰족), 아래쪽이 뿌리쪽(통통하고 끝이 뭉툭)
 * - bezier 컨트롤 포인트에 시드별 jitter를 주어 매번 다른 자연스러운 윤곽
 * - skin 색은 핑크-로즈에서 노릇한 캐러멜, 까만 숯까지 roastLevel에 따라 보간
 * - 표면에 lenticel(피목), eye(싹눈), 짧은 stretch mark, 뿌리털을 흩뿌림
 */
function SweetPotatoInner({
  size = 70,
  roastLevel = 0,
  cracked = false,
  seed = 0,
}: SweetPotatoProps) {
  const rng = seededRandom(seed);
  const r = roastLevel;
  const w = 80;
  const h = 140;

  // === 색상: raw → 노릇 → 까맣게 ===
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  let cR: number, cG: number, cB: number;
  if (r < 0.5) {
    const t = r * 2;
    // 호박고구마 핑크-로즈 → 익으면서 caramel red
    cR = lerp(178, 138, t);
    cG = lerp(92, 70, t);
    cB = lerp(72, 44, t);
  } else {
    const t = (r - 0.5) * 2;
    cR = lerp(138, 42, t);
    cG = lerp(70, 22, t);
    cB = lerp(44, 16, t);
  }
  const skinMain = `rgb(${cR}, ${cG}, ${cB})`;
  const skinDark = `rgb(${Math.max(8, cR - 55)}, ${Math.max(6, cG - 40)}, ${Math.max(4, cB - 22)})`;
  const skinDeep = `rgb(${Math.max(4, cR - 80)}, ${Math.max(2, cG - 55)}, ${Math.max(2, cB - 32)})`;
  const skinLight = `rgb(${Math.min(255, cR + 38)}, ${Math.min(255, cG + 24)}, ${Math.min(255, cB + 20)})`;
  const skinHi = `rgb(${Math.min(255, cR + 70)}, ${Math.min(255, cG + 52)}, ${Math.min(255, cB + 42)})`;
  const charSpots = r > 0.5;

  // === 비대칭 윤곽 — 위는 가늘고 뾰족, 아래는 통통 ===
  // 시드별로 살짝 다른 통통한 정도/기울임 + 양쪽 측면이 비대칭으로 부풀거나 패임
  const tilt = (rng(10) - 0.5) * 14;
  const tipTopX = 40 + (rng(0) - 0.5) * 6; // 위쪽 끝 (줄기쪽)
  const tipBotX = 40 + (rng(1) - 0.5) * 8; // 아래쪽 끝 (뿌리쪽)

  // 좌측 윤곽 (위→아래)
  const L1 = 40 - (10 + rng(2) * 4); // 위쪽 어깨
  const L2 = 40 - (16 + rng(3) * 4); // 위 1/3
  const L3 = 40 - (20 + rng(4) * 5); // 가장 통통한 중하부
  const L4 = 40 - (16 + rng(5) * 4); // 아래 1/3
  const L5 = 40 - (10 + rng(6) * 3); // 아래쪽 어깨

  // 우측 윤곽 — 약간 비대칭으로
  const R1 = 40 + (10 + rng(7) * 4);
  const R2 = 40 + (16 + rng(8) * 4);
  const R3 = 40 + (18 + rng(9) * 5);
  const R4 = 40 + (15 + rng(11) * 4);
  const R5 = 40 + (9 + rng(12) * 3);

  // 작은 표면 bump 위치 (좌우 한쪽씩 살짝 튀어나오거나 들어감)
  const bumpY = 50 + rng(13) * 30;
  const bumpDx = (rng(14) - 0.4) * 3;

  // 본체 path — 더 많은 컨트롤 포인트로 자연스러운 굴곡
  const bodyPath = `
    M ${tipTopX} 4
    C ${L1 - 1} 12, ${L2} 24, ${L2} 38
    C ${L3 + bumpDx} ${bumpY - 4}, ${L3} ${bumpY + 6}, ${L4} 96
    C ${L5} 116, ${L5 + 2} 128, ${tipBotX - 2} 134
    C ${tipBotX} 137, ${tipBotX + 1} 137, ${tipBotX + 2} 134
    C ${R5 - 2} 128, ${R5} 116, ${R4} 96
    C ${R3} ${bumpY + 6}, ${R3 - bumpDx} ${bumpY - 4}, ${R2} 38
    C ${R2} 24, ${R1 + 1} 12, ${tipTopX} 4 Z`;

  // top half / bottom half 분리 path — cracked 상태용
  const topHalfPath = `
    M ${tipTopX} 4
    C ${L1 - 1} 12, ${L2} 24, ${L2} 38
    C ${L3 + bumpDx} ${bumpY - 4}, ${L3} ${bumpY + 6}, ${L3} ${bumpY + 12}
    L ${R3} ${bumpY + 12}
    C ${R3 - bumpDx} ${bumpY - 4}, ${R2} 24, ${tipTopX} 4 Z`;

  const botHalfPath = `
    M ${L3} ${bumpY + 18}
    C ${L4} 96, ${L5} 116, ${tipBotX - 2} 134
    C ${tipBotX} 137, ${tipBotX + 1} 137, ${tipBotX + 2} 134
    C ${R5 - 2} 128, ${R5} 116, ${R4} 96
    C ${R3} ${bumpY + 6}, ${R3} ${bumpY + 18}, ${L3} ${bumpY + 18} Z`;

  const skinId = `skin-${seed}`;
  const fleshId = `flesh-${seed}`;
  const mottleId = `mottle-${seed}`;
  const noiseId = `noise-${seed}`;

  // === 표면 mottling 패턴 — 얼룩진 색반점 (시드 기반 위치) ===
  const mottles = Array.from({ length: 14 }, (_, i) => ({
    cx: 24 + rng(30 + i) * 32,
    cy: 12 + rng(50 + i) * 116,
    rx: 1.5 + rng(70 + i) * 4,
    ry: 1 + rng(90 + i) * 2.4,
    rot: rng(110 + i) * 60,
    op: 0.18 + rng(130 + i) * 0.32,
  }));

  // 피목(lenticels) — 작은 점
  const lenticels = Array.from({ length: 18 }, (_, i) => ({
    cx: 22 + rng(150 + i) * 36,
    cy: 14 + rng(170 + i) * 116,
    rad: 0.3 + rng(190 + i) * 0.6,
  }));

  // 짧은 가로 흠집 (stretch mark / scar)
  const scars = Array.from({ length: 4 }, (_, i) => ({
    x1: 28 + rng(210 + i) * 24,
    y1: 30 + rng(230 + i) * 90,
    dx: 2 + rng(250 + i) * 5,
    rot: (rng(270 + i) - 0.5) * 50,
  }));

  // 뿌리쪽 끝에 작은 root nub들
  const roots = Array.from({ length: 3 }, (_, i) => ({
    angle: -25 + i * 25 + (rng(300 + i) - 0.5) * 10,
    len: 3 + rng(320 + i) * 4,
  }));

  // 줄기쪽 끝 (위쪽)에 작은 줄기 흔적
  const stemNub = {
    h: 1.5 + rng(340) * 1.5,
  };

  return (
    <svg
      width={size}
      height={size * 1.75}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* 메인 스킨 — 위→아래, 좌상단 lit, 우하단 shadow */}
        <radialGradient id={skinId} cx="0.32" cy="0.28" r="0.95">
          <stop offset="0%" stopColor={skinHi} stopOpacity="0.85" />
          <stop offset="18%" stopColor={skinLight} />
          <stop offset="55%" stopColor={skinMain} />
          <stop offset="92%" stopColor={skinDark} />
          <stop offset="100%" stopColor={skinDeep} />
        </radialGradient>
        {/* 익어서 갈라진 속살 */}
        <radialGradient id={fleshId} cx="0.5" cy="0.4" r="0.65">
          <stop offset="0%" stopColor="#fff0b0" />
          <stop offset="35%" stopColor="#ffd668" />
          <stop offset="70%" stopColor="#e6a832" />
          <stop offset="100%" stopColor="#8a5018" />
        </radialGradient>
        {/* 피부 얼룩진 배경 */}
        <radialGradient id={mottleId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={skinDark} stopOpacity="0.6" />
          <stop offset="100%" stopColor={skinDark} stopOpacity="0" />
        </radialGradient>
        {/* SVG 거친 노이즈 — 표면 그레인 */}
        <filter id={noiseId} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed={seed}
          />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <g transform={`rotate(${tilt} ${w / 2} ${h / 2})`}>
        {!cracked && (
          <g>
            {/* 줄기쪽 끝 (vine end) */}
            <path
              d={`M ${tipTopX - 0.8} 4 Q ${tipTopX} ${4 - stemNub.h} ${tipTopX + 0.8} 4`}
              fill={skinDeep}
              opacity="0.7"
            />

            {/* 본체 */}
            <path d={bodyPath} fill={`url(#${skinId})`} />

            {/* 우측 그림자 톤 — 입체감 */}
            <path
              d={`M ${tipTopX + 1} 6
                  C ${R1 - 1} 14, ${R2 + 1} 28, ${R3 + 1} 56
                  C ${R3 + 1} 84, ${R4 + 1} 110, ${tipBotX + 1} 134
                  L ${tipTopX + 1} 6 Z`}
              fill={skinDeep}
              opacity="0.32"
            />

            {/* 좌측 specular — 광택 */}
            <path
              d={`M ${L1 + 3} 18 Q ${L2 + 4} 50 ${L3 + 5} 86 Q ${L4 + 4} 112 ${L5 + 3} 124`}
              stroke={skinHi}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              opacity="0.32"
            />
            <path
              d={`M ${L1 + 5} 26 Q ${L2 + 6} 56 ${L3 + 6} 90`}
              stroke="#fff"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.28"
            />

            {/* 거친 노이즈 — 표면 grain */}
            <g clipPath="url()" style={{ mixBlendMode: 'multiply' }}>
              <path d={bodyPath} filter={`url(#${noiseId})`} fill="#000" opacity="0.28" />
            </g>

            {/* 표면 mottling — 얼룩 패치 */}
            <g style={{ mixBlendMode: 'multiply' }}>
              {mottles.map((m, i) => (
                <ellipse
                  key={`m${i}`}
                  cx={m.cx}
                  cy={m.cy}
                  rx={m.rx}
                  ry={m.ry}
                  fill={`url(#${mottleId})`}
                  opacity={m.op}
                  transform={`rotate(${m.rot} ${m.cx} ${m.cy})`}
                />
              ))}
            </g>

            {/* 짧은 가로 흠집 */}
            <g stroke={skinDeep} strokeWidth="0.5" strokeLinecap="round" opacity="0.55">
              {scars.map((s, i) => (
                <line
                  key={`s${i}`}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x1 + s.dx}
                  y2={s.y1 + 0.2}
                  transform={`rotate(${s.rot} ${s.x1} ${s.y1})`}
                />
              ))}
            </g>

            {/* 피목 — 작은 점 */}
            <g fill={skinDeep} opacity="0.65">
              {lenticels.map((l, i) => (
                <circle key={`l${i}`} cx={l.cx} cy={l.cy} r={l.rad} />
              ))}
            </g>

            {/* 싹눈 (eye) — 살짝 들어간 어두운 점 */}
            {r < 0.5 && (
              <g>
                <circle cx={34 + rng(400) * 6} cy={48 + rng(401) * 8} r="0.9" fill="#1a0a08" />
                <circle cx={34 + rng(400) * 6} cy={48 + rng(401) * 8} r="0.4" fill={skinHi} opacity="0.4" />
                <circle cx={46 + rng(402) * 4} cy={88 + rng(403) * 8} r="0.8" fill="#1a0a08" />
                <circle cx={46 + rng(402) * 4} cy={88 + rng(403) * 8} r="0.35" fill={skinHi} opacity="0.4" />
                <circle cx={36 + rng(404) * 6} cy={114 + rng(405) * 6} r="0.7" fill="#1a0a08" />
              </g>
            )}

            {/* 익으면서 검게 그을린 패치 */}
            {charSpots && (
              <g fill="#0a0604" style={{ mixBlendMode: 'multiply' }}>
                <ellipse cx="34" cy="46" rx="5" ry="3.5" opacity={(r - 0.5) * 1.6} />
                <ellipse cx="48" cy="80" rx="6" ry="4.5" opacity={(r - 0.5) * 1.5} />
                <ellipse cx="36" cy="116" rx="4.5" ry="3.5" opacity={(r - 0.5) * 1.4} />
              </g>
            )}

            {/* 잘 익은 후 갈라지기 시작하는 hot crack */}
            {r > 0.7 && (
              <g opacity={(r - 0.7) * 2.5} stroke="#ff6020" strokeWidth="0.6" fill="none">
                <path d="M 36 42 Q 40 70 38 102" />
                <path d="M 44 60 Q 46 90 44 122" />
              </g>
            )}

            {/* 뿌리쪽 끝의 작은 뿌리 nub */}
            <g stroke={skinDeep} strokeWidth="0.7" strokeLinecap="round" opacity="0.75">
              {roots.map((rt, i) => {
                const ax = tipBotX + Math.cos((rt.angle * Math.PI) / 180) * 1;
                const ay = 134 + 1;
                const bx = tipBotX + Math.cos(((rt.angle - 90) * Math.PI) / 180 + Math.PI / 2) * 0;
                return (
                  <line
                    key={`rt${i}`}
                    x1={ax}
                    y1={ay}
                    x2={ax + Math.cos((rt.angle * Math.PI) / 180) * rt.len}
                    y2={ay + Math.sin((rt.angle * Math.PI) / 180) * rt.len + Math.abs(rt.len) * 0.4}
                  />
                );
              })}
            </g>
          </g>
        )}

        {/* === 가로로 갈라진 상태 === */}
        {cracked && (
          <g>
            {/* 위쪽 절반 */}
            <g transform="translate(0 -7) rotate(-3 40 40)">
              <path d={topHalfPath} fill={`url(#${skinId})`} />
              <path
                d={`M ${tipTopX + 1} 6
                    C ${R1} 16, ${R2} 38, ${R3} ${bumpY + 6}
                    L 40 ${bumpY + 12} L ${tipTopX} 6 Z`}
                fill={skinDeep}
                opacity="0.32"
              />
              <path
                d={`M ${L3 + 1} ${bumpY + 12} L ${R3 - 1} ${bumpY + 12}`}
                stroke="#1a0805"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              {charSpots && (
                <path
                  d={`M ${L3 + 2} ${bumpY + 11} L ${R3 - 2} ${bumpY + 11}`}
                  stroke="#0a0604"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity={Math.min(1, (r - 0.5) * 2)}
                />
              )}
            </g>

            {/* 아래쪽 절반 */}
            <g transform="translate(0 7) rotate(3 40 110)">
              <path d={botHalfPath} fill={`url(#${skinId})`} />
              <path
                d={`M 40 ${bumpY + 18}
                    C ${R3} ${bumpY + 30}, ${R5} 124, ${tipBotX} 134
                    L ${tipBotX} 134 L 40 ${bumpY + 18} Z`}
                fill={skinDeep}
                opacity="0.32"
              />
              <path
                d={`M ${L3 + 1} ${bumpY + 18} L ${R3 - 1} ${bumpY + 18}`}
                stroke="#1a0805"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              {charSpots && (
                <path
                  d={`M ${L3 + 2} ${bumpY + 19} L ${R3 - 2} ${bumpY + 19}`}
                  stroke="#0a0604"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity={Math.min(1, (r - 0.5) * 2)}
                />
              )}
            </g>

            {/* 노릇한 속살 */}
            <g>
              <ellipse cx="40" cy={bumpY + 15} rx="22" ry="10" fill="#a86a26" />
              <ellipse cx="40" cy={bumpY + 15} rx="20" ry="8" fill={`url(#${fleshId})`} />
              <ellipse cx="40" cy={bumpY + 14} rx="14" ry="5" fill="#ffe89a" opacity="0.7" />
              <g stroke="#c98a26" strokeWidth="0.5" fill="none" opacity="0.5">
                <path d={`M 26 ${bumpY + 15} Q 40 ${bumpY + 13} 54 ${bumpY + 15}`} />
                <path d={`M 28 ${bumpY + 17} Q 40 ${bumpY + 15} 52 ${bumpY + 17}`} />
                <path d={`M 30 ${bumpY + 13} Q 40 ${bumpY + 11} 50 ${bumpY + 13}`} />
              </g>
              <g fill="#5a3010" opacity="0.5">
                <circle cx="32" cy={bumpY + 15} r="0.6" />
                <circle cx="44" cy={bumpY + 16} r="0.6" />
                <circle cx="48" cy={bumpY + 14} r="0.6" />
              </g>
              <ellipse cx="38" cy={bumpY + 13} rx="10" ry="1.2" fill="#fff5cc" opacity="0.7" />
            </g>

          </g>
        )}
      </g>
    </svg>
  );
}

// roastLevel 을 5% 단위로 quantize 해서 거의 같은 값이면 re-render skip.
// 매 RAF 마다 setPile 갱신해도 5% 미만 변화는 같은 시각.
export const SweetPotato = memo(SweetPotatoInner, (prev, next) => {
  return (
    prev.size === next.size &&
    prev.seed === next.seed &&
    prev.cracked === next.cracked &&
    Math.round((prev.roastLevel ?? 0) * 20) === Math.round((next.roastLevel ?? 0) * 20)
  );
});

