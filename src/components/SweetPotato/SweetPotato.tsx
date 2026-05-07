import { seededRandom } from '@/lib/seed-rng';

interface SweetPotatoProps {
  size?: number;
  roastLevel?: number;
  cracked?: boolean;
  seed?: number;
}

export function SweetPotato({
  size = 70,
  roastLevel = 0,
  cracked = false,
  seed = 0,
}: SweetPotatoProps) {
  const rng = seededRandom(seed);
  const tipTopX = 40 + (rng(20) - 0.5) * 10;
  const tipBotX = 40 + (rng(21) - 0.5) * 12;
  const bulgeUp = 0.95 + rng(22) * 0.3;
  const bulgeMid = 1.1 + rng(23) * 0.3;
  const bulgeLow = 0.85 + rng(24) * 0.3;
  const sideR = 1.0 + (rng(25) - 0.5) * 0.25;
  const sideL = 1.0 + (rng(26) - 0.5) * 0.25;

  const r = roastLevel;
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  let cR: number, cG: number, cB: number;
  if (r < 0.5) {
    const t = r * 2;
    cR = lerp(196, 150, t);
    cG = lerp(78, 60, t);
    cB = lerp(72, 40, t);
  } else {
    const t = (r - 0.5) * 2;
    cR = lerp(150, 50, t);
    cG = lerp(60, 25, t);
    cB = lerp(40, 18, t);
  }
  const skinMain = `rgb(${cR}, ${cG}, ${cB})`;
  const skinDark = `rgb(${Math.max(10, cR - 55)}, ${Math.max(8, cG - 40)}, ${Math.max(6, cB - 22)})`;
  const skinLight = `rgb(${Math.min(255, cR + 50)}, ${Math.min(255, cG + 38)}, ${Math.min(255, cB + 38)})`;
  const charSpots = r > 0.55;
  const tilt = (rng(10) - 0.5) * 18;
  const w = 80;
  const h = 140;

  const lx1 = 40 - 14 * bulgeUp * sideL;
  const lx2 = 40 - 22 * bulgeMid * sideL;
  const lx3 = 40 - 18 * bulgeLow * sideL;
  const lx4 = 40 - 7 * sideL;
  const rx1 = 40 + 14 * bulgeUp * sideR;
  const rx2 = 40 + 22 * bulgeMid * sideR;
  const rx3 = 40 + 18 * bulgeLow * sideR;
  const rx4 = 40 + 7 * sideR;

  const bodyPath = `
    M ${tipTopX} 6
    C ${lx1} 16, ${lx2 - 2} 44, ${lx2} 68
    C ${lx3} 96, ${lx4} 122, ${tipBotX} 134
    C ${tipBotX + 2} 136, ${tipBotX - 2} 136, ${tipBotX} 134
    C ${rx4} 122, ${rx3} 96, ${rx2} 68
    C ${rx2 - 2} 44, ${rx1} 16, ${tipTopX} 6 Z`;

  const topHalfPath = `
    M ${tipTopX} 6
    C ${lx1} 16, ${lx2 - 2} 44, ${lx2} 68
    L ${rx2} 68
    C ${rx2 - 2} 44, ${rx1} 16, ${tipTopX} 6 Z`;

  const botHalfPath = `
    M ${lx2} 72
    C ${lx3} 100, ${lx4} 124, ${tipBotX} 134
    C ${tipBotX + 2} 136, ${tipBotX - 2} 136, ${tipBotX} 134
    C ${rx4} 124, ${rx3} 100, ${rx2} 72
    L ${lx2} 72 Z`;

  const skinId = `skin-${seed}`;
  const fleshId = `flesh-${seed}`;

  return (
    <svg
      width={size}
      height={size * 1.75}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={skinId} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0%" stopColor={skinLight} />
          <stop offset="40%" stopColor={skinMain} />
          <stop offset="100%" stopColor={skinDark} />
        </radialGradient>
        <radialGradient id={fleshId} cx="0.5" cy="0.4" r="0.65">
          <stop offset="0%" stopColor="#fff0b0" />
          <stop offset="35%" stopColor="#ffd668" />
          <stop offset="70%" stopColor="#e6a832" />
          <stop offset="100%" stopColor="#8a5018" />
        </radialGradient>
      </defs>

      <g transform={`rotate(${tilt} ${w / 2} ${h / 2})`}>
        {!cracked && (
          <>
            <path d={bodyPath} fill={`url(#${skinId})`} />
            <path
              d={`M ${tipTopX + 1} 8
                  C ${rx1} 18, ${rx2} 50, ${rx2} 78
                  C ${rx3} 110, ${rx4} 138, ${tipBotX} 152
                  L ${tipTopX} 8 Z`}
              fill={skinDark}
              opacity="0.4"
            />
            <path
              d={`M ${lx1 + 4} 24 Q ${lx2 + 2} 70 ${lx3 + 4} 120`}
              stroke={skinLight}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
            <path
              d={`M ${lx1 + 5} 30 Q ${lx2 + 4} 70 ${lx3 + 5} 110`}
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.18"
            />
            <g opacity="0.55" fill={skinDark}>
              <ellipse cx={36 + rng(1) * 4} cy={28} rx="1.6" ry="1" />
              <ellipse cx={44 + rng(2) * 4} cy={42} rx="1.4" ry="0.9" />
              <ellipse cx={34 + rng(3) * 4} cy={62} rx="1.8" ry="1.1" />
              <ellipse cx={48 + rng(4) * 4} cy={78} rx="1.5" ry="1" />
              <ellipse cx={36 + rng(5) * 4} cy={96} rx="1.4" ry="0.9" />
              <ellipse cx={46 + rng(6) * 4} cy={116} rx="1.6" ry="1" />
              <ellipse cx={40 + rng(7) * 4} cy={134} rx="1.2" ry="0.8" />
            </g>
            {r < 0.4 && (
              <g fill="#2a0e10" opacity="0.7">
                <circle cx={38 + rng(8) * 4} cy={36 + rng(9) * 6} r="0.9" />
                <circle cx={44 + rng(14) * 4} cy={70 + rng(15) * 6} r="0.8" />
                <circle cx={38 + rng(16) * 4} cy={108 + rng(17) * 4} r="0.9" />
              </g>
            )}
            <g stroke={skinDark} strokeWidth="0.35" fill="none" opacity="0.3">
              <path d={`M ${lx2 + 4} 30 Q ${lx2 + 6} 80 ${lx3 + 6} 130`} />
              <path d="M 40 14 Q 40 80 40 146" />
              <path d={`M ${rx2 - 4} 30 Q ${rx2 - 6} 80 ${rx3 - 6} 130`} />
            </g>
            {charSpots && (
              <g fill="#0a0805" opacity={(r - 0.55) * 1.6}>
                <ellipse cx="36" cy="50" rx="5" ry="4" />
                <ellipse cx="46" cy="84" rx="6" ry="5" />
                <ellipse cx="38" cy="118" rx="5" ry="4" />
              </g>
            )}
            {r > 0.65 && (
              <g opacity={(r - 0.65) * 2} stroke="#ff6020" strokeWidth="0.7" fill="none">
                <path d="M 36 40 Q 42 70 38 100" />
                <path d="M 44 60 Q 48 95 44 130" />
              </g>
            )}
          </>
        )}

        {cracked && (
          <g>
            <g transform="translate(0 -6) rotate(-4 40 40)">
              <path d={topHalfPath} fill={`url(#${skinId})`} />
              <path
                d={`M ${tipTopX + 1} 8
                    C ${rx1} 18, ${rx2} 46, ${rx2} 68
                    L 40 68 L ${tipTopX} 8 Z`}
                fill={skinDark}
                opacity="0.35"
              />
              <path
                d={`M ${lx2 + 1} 68 L ${rx2 - 1} 68`}
                stroke="#1a0805"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              {charSpots && (
                <path
                  d={`M ${lx2 + 2} 67 L ${rx2 - 2} 67`}
                  stroke="#0a0604"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity={Math.min(1, (r - 0.5) * 2)}
                />
              )}
            </g>

            <g transform="translate(0 6) rotate(4 40 110)">
              <path d={botHalfPath} fill={`url(#${skinId})`} />
              <path
                d={`M 40 72
                    C ${rx3} 100, ${rx4} 134, ${tipBotX} 134
                    L ${tipBotX} 134 L 40 72 Z`}
                fill={skinDark}
                opacity="0.35"
              />
              <path
                d={`M ${lx2 + 1} 72 L ${rx2 - 1} 72`}
                stroke="#1a0805"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              {charSpots && (
                <path
                  d={`M ${lx2 + 2} 73 L ${rx2 - 2} 73`}
                  stroke="#0a0604"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity={Math.min(1, (r - 0.5) * 2)}
                />
              )}
            </g>

            <g>
              <ellipse cx="40" cy="70" rx="22" ry="10" fill="#a86a26" />
              <ellipse cx="40" cy="70" rx="20" ry="8" fill={`url(#${fleshId})`} />
              <ellipse cx="40" cy="69" rx="14" ry="5" fill="#ffe89a" opacity="0.7" />
              <g stroke="#c98a26" strokeWidth="0.5" fill="none" opacity="0.5">
                <path d="M 26 70 Q 40 68 54 70" />
                <path d="M 28 72 Q 40 70 52 72" />
                <path d="M 30 68 Q 40 66 50 68" />
              </g>
              <g fill="#5a3010" opacity="0.5">
                <circle cx="32" cy="70" r="0.6" />
                <circle cx="44" cy="71" r="0.6" />
                <circle cx="48" cy="69" r="0.6" />
              </g>
              <ellipse cx="38" cy="68" rx="10" ry="1.2" fill="#fff5cc" opacity="0.7" />
            </g>

            <g opacity="0.85" fill="none" stroke="#fff5e8" strokeWidth="1.6" strokeLinecap="round">
              <path d="M 32 60 Q 28 46 34 30">
                <animate
                  attributeName="opacity"
                  values="0.85;0.2;0.85"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </path>
              <path d="M 40 58 Q 44 44 40 26">
                <animate
                  attributeName="opacity"
                  values="0.7;0.15;0.7"
                  dur="2.4s"
                  repeatCount="indefinite"
                  begin="0.4s"
                />
              </path>
              <path d="M 48 60 Q 52 46 46 30">
                <animate
                  attributeName="opacity"
                  values="0.8;0.2;0.8"
                  dur="2.2s"
                  repeatCount="indefinite"
                  begin="0.8s"
                />
              </path>
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
