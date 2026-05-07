interface FlamesProps {
  width?: number;
  intensity?: number;
}

/**
 * 진짜 모닥불 같은 불꽃 — 평범한 ellipse를 SVG turbulence로 일렁이는 organic한
 * 화염 모양으로 변형. 키 큰 ellipse 3개를 다른 가로폭/색으로 겹쳐서 외곽
 * 따뜻한 글로우 → 중간 불꽃 본체 → 안쪽 흰 코어 레이어 만들고, 모두 같은
 * fractal noise로 displacement 시킴. baseFrequency를 SMIL animate로 천천히
 * 바꿔서 시간이 지나며 불꽃이 흔들리고 갈래가 변함.
 */
export function Flames({ width = 240, intensity = 1 }: FlamesProps) {
  return (
    <svg
      width={width}
      height={width * 1.4}
      viewBox="0 0 200 280"
      preserveAspectRatio="xMidYMax meet"
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: Math.min(1, intensity),
        overflow: 'visible',
      }}
    >
      <defs>
        {/* 외곽 isotropic 굵은 turbulence — 큰 갈래 만듦 */}
        <filter id="fireDistortOuter" x="-30%" y="-10%" width="160%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.045"
            numOctaves="2"
            seed="3"
            result="n"
          >
            <animate
              attributeName="baseFrequency"
              dur="2.6s"
              values="0.018 0.045; 0.03 0.058; 0.022 0.05; 0.018 0.045"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="36" />
        </filter>

        {/* 중간 — 더 빠르고 가는 갈래 */}
        <filter id="fireDistortMid" x="-30%" y="-10%" width="160%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.025 0.07"
            numOctaves="2"
            seed="7"
            result="n"
          >
            <animate
              attributeName="baseFrequency"
              dur="1.8s"
              values="0.025 0.07; 0.04 0.085; 0.028 0.075; 0.025 0.07"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="28" />
        </filter>

        {/* 가장 안쪽 — 빠르게 깜빡 */}
        <filter id="fireDistortInner" x="-30%" y="-10%" width="160%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04 0.09"
            numOctaves="2"
            seed="11"
            result="n"
          >
            <animate
              attributeName="baseFrequency"
              dur="1.2s"
              values="0.04 0.09; 0.06 0.11; 0.045 0.095; 0.04 0.09"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="20" />
        </filter>

        {/* 외곽 글로우 — 어두운 주황 */}
        <linearGradient id="flameOuter" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#c25a2c" stopOpacity="0" />
          <stop offset="6%" stopColor="#c25a2c" stopOpacity="0.7" />
          <stop offset="35%" stopColor="#ff7026" stopOpacity="0.65" />
          <stop offset="80%" stopColor="#ff8c3a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ff8c3a" stopOpacity="0" />
        </linearGradient>
        {/* 중간 본체 — 노란-주황 */}
        <linearGradient id="flameMid" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#ff5a18" stopOpacity="0" />
          <stop offset="8%" stopColor="#ff5a18" stopOpacity="0.85" />
          <stop offset="30%" stopColor="#ffaa3d" />
          <stop offset="70%" stopColor="#ffd590" />
          <stop offset="100%" stopColor="#fff7d6" stopOpacity="0.7" />
        </linearGradient>
        {/* 안쪽 코어 — 흰빛 */}
        <linearGradient id="flameInner" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#ffaa3d" stopOpacity="0" />
          <stop offset="20%" stopColor="#ffefa0" stopOpacity="0.95" />
          <stop offset="80%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 외곽 큰 글로우 — 천천히 일렁임 */}
      <g filter="url(#fireDistortOuter)">
        <ellipse cx="100" cy="280" rx="78" ry="200" fill="url(#flameOuter)" />
      </g>
      {/* 중간 본체 — 활활 */}
      <g filter="url(#fireDistortMid)">
        <ellipse cx="100" cy="280" rx="44" ry="220" fill="url(#flameMid)" />
      </g>
      {/* 안쪽 코어 — 빠르게 깜빡 */}
      <g filter="url(#fireDistortInner)">
        <ellipse cx="100" cy="280" rx="22" ry="160" fill="url(#flameInner)" />
      </g>
    </svg>
  );
}
