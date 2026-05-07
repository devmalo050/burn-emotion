interface FlamesProps {
  width?: number;
  intensity?: number;
}

/**
 * 캠프파이어 불꽃 — SVG path 직접 그려서 각 혀(tongue)가 베이스에서 위로
 * 솟구치며 끝이 뾰족하게 끝나는 형태. 5개 혀 + 안쪽 흰 코어 + 베이스 글로우.
 * SMIL `<animate>` 로 d를 3개 keyframe shape 사이를 morph 시켜서 진짜 일렁임.
 */
export function Flames({ width = 240, intensity = 1 }: FlamesProps) {
  // 각 혀의 keyframe d 시퀀스. base는 (100, 240) 부근 중심에서 갈라짐.
  // viewBox 200x240. y=240이 베이스, y=0이 정점. 끝은 sharp point.

  // 메인 중앙 (가장 키 큰 혀)
  const t1 = [
    'M 92 240 C 80 200 88 150 96 110 C 88 70 92 35 100 8 C 108 35 110 70 104 110 C 112 150 120 200 108 240 Z',
    'M 92 240 C 78 195 84 140 92 105 C 84 65 88 30 102 14 C 110 35 116 70 110 110 C 118 155 122 200 108 240 Z',
    'M 92 240 C 82 200 92 150 100 110 C 92 70 96 35 98 6 C 106 35 108 70 102 110 C 112 150 116 200 108 240 Z',
  ];

  // 좌측 두번째 혀
  const t2 = [
    'M 70 240 C 60 200 64 150 70 110 C 62 80 70 50 78 30 C 84 50 86 80 78 110 C 86 150 88 200 80 240 Z',
    'M 70 240 C 58 200 62 150 66 105 C 62 78 68 48 80 36 C 88 50 90 80 80 110 C 88 155 90 200 80 240 Z',
    'M 70 240 C 62 200 68 150 74 110 C 70 80 74 50 76 28 C 82 50 88 80 80 110 C 88 150 86 200 80 240 Z',
  ];

  // 우측 두번째 혀
  const t3 = [
    'M 120 240 C 112 200 110 150 120 110 C 112 80 122 50 130 32 C 138 50 134 80 128 110 C 138 150 138 200 130 240 Z',
    'M 120 240 C 110 195 108 145 116 100 C 110 75 122 46 134 30 C 142 50 134 80 128 108 C 140 155 138 200 130 240 Z',
    'M 120 240 C 114 200 116 150 122 110 C 116 80 124 50 126 28 C 134 50 134 80 128 110 C 138 150 138 200 130 240 Z',
  ];

  // 좌측 외곽 작은 혀 (lower)
  const t4 = [
    'M 50 240 C 44 215 46 175 50 145 C 46 120 52 90 58 70 C 64 90 64 120 58 145 C 64 175 62 215 58 240 Z',
    'M 50 240 C 42 215 44 170 48 140 C 44 115 50 88 60 76 C 66 92 66 120 58 145 C 64 175 62 215 58 240 Z',
    'M 50 240 C 46 215 48 175 52 145 C 48 120 54 90 56 68 C 62 90 64 120 58 145 C 64 175 62 215 58 240 Z',
  ];

  // 우측 외곽 작은 혀
  const t5 = [
    'M 142 240 C 138 215 136 175 144 145 C 138 118 146 90 152 72 C 158 90 156 120 150 145 C 156 175 156 215 150 240 Z',
    'M 142 240 C 136 215 134 170 140 138 C 136 112 144 88 154 78 C 160 92 156 120 150 145 C 156 175 156 215 150 240 Z',
    'M 142 240 C 138 215 138 175 146 145 C 140 118 148 90 150 70 C 156 90 156 120 150 145 C 156 175 156 215 150 240 Z',
  ];

  // 안쪽 흰 코어 (가장 짧고 강렬)
  const core = [
    'M 95 240 C 86 210 92 170 96 130 C 92 100 96 80 100 64 C 104 80 108 100 104 130 C 108 170 114 210 105 240 Z',
    'M 95 240 C 88 210 92 168 98 124 C 94 96 100 76 102 60 C 106 78 110 100 102 130 C 110 168 114 210 105 240 Z',
    'M 95 240 C 90 210 94 170 98 130 C 94 100 98 80 100 60 C 104 80 106 100 102 130 C 106 170 112 210 105 240 Z',
  ];

  // 가장 안쪽 흰 끝 점 (가장 빠르게 깜빡)
  const innerCore = [
    'M 96 240 C 90 210 94 170 100 130 C 96 110 100 90 100 76 C 102 90 104 110 100 130 C 104 170 106 210 102 240 Z',
    'M 96 240 C 92 210 96 170 100 124 C 96 108 100 88 102 72 C 104 90 106 108 100 130 C 104 170 106 210 102 240 Z',
    'M 96 240 C 94 210 98 168 100 130 C 96 108 100 88 100 70 C 100 90 102 108 100 130 C 102 170 106 210 102 240 Z',
  ];

  return (
    <svg
      width={width}
      height={width * 1.2}
      viewBox="0 0 200 240"
      preserveAspectRatio="xMidYMax meet"
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        opacity: Math.min(1, intensity),
        overflow: 'visible',
      }}
    >
      <defs>
        <linearGradient id="flameOuter" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#ff5018" stopOpacity="0" />
          <stop offset="6%" stopColor="#ff5018" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#ffaa3d" stopOpacity="0.9" />
          <stop offset="80%" stopColor="#ffe680" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff7d6" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="flameSide" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#c25a2c" stopOpacity="0" />
          <stop offset="10%" stopColor="#ff5018" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ff8c3a" stopOpacity="0.75" />
          <stop offset="90%" stopColor="#ffd590" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffd590" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="flameCore" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#ffaa3d" stopOpacity="0" />
          <stop offset="20%" stopColor="#ffefa0" stopOpacity="0.9" />
          <stop offset="80%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="flameBaseGlow" cx="0.5" cy="1" r="0.6">
          <stop offset="0%" stopColor="#ffd590" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#ff7026" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff5018" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g style={{ mixBlendMode: 'screen' }}>
        {/* 베이스 따뜻한 글로우 */}
        <ellipse cx="100" cy="240" rx="90" ry="50" fill="url(#flameBaseGlow)">
          <animate
            attributeName="rx"
            values="86;94;86"
            dur="1.6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="ry"
            values="48;54;48"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </ellipse>

        {/* 외곽 작은 혀들 (먼저 그려서 뒤에 깔림) */}
        <path fill="url(#flameSide)" style={{ filter: 'blur(1.6px)' }}>
          <animate
            attributeName="d"
            values={`${t4[0]};${t4[1]};${t4[2]};${t4[0]}`}
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
        <path fill="url(#flameSide)" style={{ filter: 'blur(1.6px)' }}>
          <animate
            attributeName="d"
            values={`${t5[0]};${t5[1]};${t5[2]};${t5[0]}`}
            dur="1.05s"
            repeatCount="indefinite"
          />
        </path>

        {/* 좌우 두번째 혀 */}
        <path fill="url(#flameOuter)" style={{ filter: 'blur(0.8px)' }}>
          <animate
            attributeName="d"
            values={`${t2[0]};${t2[1]};${t2[2]};${t2[0]}`}
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
        <path fill="url(#flameOuter)" style={{ filter: 'blur(0.8px)' }}>
          <animate
            attributeName="d"
            values={`${t3[0]};${t3[1]};${t3[2]};${t3[0]}`}
            dur="0.7s"
            repeatCount="indefinite"
          />
        </path>

        {/* 메인 가운데 혀 */}
        <path fill="url(#flameOuter)" style={{ filter: 'blur(0.5px)' }}>
          <animate
            attributeName="d"
            values={`${t1[0]};${t1[1]};${t1[2]};${t1[0]}`}
            dur="0.62s"
            repeatCount="indefinite"
          />
        </path>

        {/* 흰 코어 */}
        <path fill="url(#flameCore)" style={{ filter: 'blur(0.4px)' }}>
          <animate
            attributeName="d"
            values={`${core[0]};${core[1]};${core[2]};${core[0]}`}
            dur="0.45s"
            repeatCount="indefinite"
          />
        </path>

        {/* 가장 안쪽 흰 끝 */}
        <path fill="#fff" opacity="0.85" style={{ filter: 'blur(0.3px)' }}>
          <animate
            attributeName="d"
            values={`${innerCore[0]};${innerCore[1]};${innerCore[2]};${innerCore[0]}`}
            dur="0.32s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  );
}
