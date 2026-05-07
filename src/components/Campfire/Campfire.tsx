interface CampfireProps {
  width?: number;
  fireIntensity?: number;
}

/**
 * Teepee-style 캠프파이어 — 통나무 4개가 위로 모이는 기둥 구조 (X자 평면 X)
 * SVG viewBox: 260 × 195
 *  - 돌 둘레: y ≈ 175
 *  - 잉걸불 mound: y ≈ 158
 *  - 통나무 base: y ≈ 175 (지면)
 *  - 통나무 tip: y ≈ 60 (정점)
 */
export function Campfire({ width = 260, fireIntensity = 1 }: CampfireProps) {
  const stones: ReadonlyArray<readonly [number, number, number, number]> = [
    [22, 168, 18, 9],
    [56, 175, 16, 8],
    [94, 178, 18, 9],
    [134, 178, 20, 9],
    [176, 177, 18, 9],
    [216, 173, 17, 8],
    [240, 168, 14, 7],
  ];

  // 통나무 기둥 — base→tip의 두 끝점만 잡고 그린다.
  // 살짝 다른 각도로 4개를 둘러 세워서 teepee 형태.
  const logs: ReadonlyArray<{
    baseX: number;
    tipX: number;
    tipY: number;
    baseW: number;
    tipW: number;
  }> = [
    { baseX: 70, tipX: 118, tipY: 56, baseW: 11, tipW: 5 },   // 왼쪽 — 가장 가파르게
    { baseX: 105, tipX: 130, tipY: 50, baseW: 10, tipW: 5 },  // 좌중 — 거의 수직
    { baseX: 158, tipX: 138, tipY: 54, baseW: 11, tipW: 5 },  // 우중 — 거의 수직
    { baseX: 196, tipX: 148, tipY: 58, baseW: 12, tipW: 5 },  // 오른쪽 — 가파르게
  ];

  return (
    <svg width={width} height={width * 0.75} viewBox="0 0 260 195" fill="none">
      <defs>
        <linearGradient id="logBark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a3620" />
          <stop offset="40%" stopColor="#3e2614" />
          <stop offset="100%" stopColor="#1a100a" />
        </linearGradient>
        <linearGradient id="logBarkLit" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7a4e2c" />
          <stop offset="50%" stopColor="#3e2614" />
          <stop offset="100%" stopColor="#1a100a" />
        </linearGradient>
        <linearGradient id="logEnd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c98b54" />
          <stop offset="60%" stopColor="#8a5a32" />
          <stop offset="100%" stopColor="#3a2414" />
        </linearGradient>
        <radialGradient id="emberGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffcf66" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#ff7a26" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff4010" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 그림자 */}
      <ellipse cx="130" cy="184" rx="115" ry="10" fill="rgba(0,0,0,0.7)" />
      {/* 따뜻한 바닥 글로우 */}
      <ellipse
        cx="130"
        cy="180"
        rx="135"
        ry="18"
        fill="rgba(255, 140, 58, 0.28)"
        opacity={fireIntensity}
      />

      {/* 돌 둘레 */}
      {stones.map(([cx, cy, rx, ry], i) => (
        <g key={`s${i}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#3a3026" />
          <ellipse cx={cx - 2} cy={cy - 2} rx={rx - 4} ry={ry - 4} fill="#5a4a3a" />
          <ellipse cx={cx - 3} cy={cy - 3} rx={rx - 8} ry={ry - 6} fill="#7a6a52" opacity="0.7" />
        </g>
      ))}

      {/* 잿더미 + 잉걸불 */}
      <ellipse
        cx="130"
        cy="170"
        rx="56"
        ry="10"
        fill="url(#emberGlow)"
        opacity={0.85 * fireIntensity}
      >
        <animate
          attributeName="opacity"
          values={`${0.6 * fireIntensity};${0.95 * fireIntensity};${0.6 * fireIntensity}`}
          dur="2s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse cx="130" cy="172" rx="48" ry="6" fill="#1a0e06" />

      {/* 뒷쪽 통나무 2개 (먼저 그려서 뒤에 배치) */}
      {[logs[0], logs[3]].map((log, idx) => {
        const dx = log.tipX - log.baseX;
        const dy = log.tipY - 175;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = dy / len;
        const ny = -dx / len;
        // 두께가 base→tip으로 줄어드는 사다리꼴(trapezoid) path
        const x1 = log.baseX - nx * log.baseW;
        const y1 = 175 - ny * log.baseW;
        const x2 = log.baseX + nx * log.baseW;
        const y2 = 175 + ny * log.baseW;
        const x3 = log.tipX + nx * log.tipW;
        const y3 = log.tipY + ny * log.tipW;
        const x4 = log.tipX - nx * log.tipW;
        const y4 = log.tipY - ny * log.tipW;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <g key={`bg-${idx}`} opacity="0.85">
            {/* 통나무 본체 */}
            <path
              d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`}
              fill="url(#logBark)"
            />
            {/* 통나무 끝 단면 (위쪽) */}
            <ellipse
              cx={log.tipX}
              cy={log.tipY}
              rx={log.tipW}
              ry={log.tipW * 0.5}
              fill="url(#logEnd)"
              transform={`rotate(${angleDeg + 90} ${log.tipX} ${log.tipY})`}
            />
          </g>
        );
      })}

      {/* 앞쪽 통나무 2개 */}
      {[logs[1], logs[2]].map((log, idx) => {
        const dx = log.tipX - log.baseX;
        const dy = log.tipY - 175;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = dy / len;
        const ny = -dx / len;
        const x1 = log.baseX - nx * log.baseW;
        const y1 = 175 - ny * log.baseW;
        const x2 = log.baseX + nx * log.baseW;
        const y2 = 175 + ny * log.baseW;
        const x3 = log.tipX + nx * log.tipW;
        const y3 = log.tipY + ny * log.tipW;
        const x4 = log.tipX - nx * log.tipW;
        const y4 = log.tipY - ny * log.tipW;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        // 세로 결 (bark grain) — 통나무 안쪽으로 살짝
        const midX1 = (x1 + x4) / 2;
        const midY1 = (y1 + y4) / 2;
        const midX2 = (x2 + x3) / 2;
        const midY2 = (y2 + y3) / 2;
        return (
          <g key={`fg-${idx}`}>
            <path
              d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`}
              fill="url(#logBarkLit)"
            />
            {/* 결 */}
            <line
              x1={midX1}
              y1={midY1}
              x2={midX2 - (midX2 - midX1) * 0.3}
              y2={midY2 - (midY2 - midY1) * 0.3}
              stroke="rgba(0,0,0,0.45)"
              strokeWidth="0.5"
            />
            {/* 통나무 끝 단면 */}
            <ellipse
              cx={log.tipX}
              cy={log.tipY}
              rx={log.tipW}
              ry={log.tipW * 0.5}
              fill="url(#logEnd)"
              transform={`rotate(${angleDeg + 90} ${log.tipX} ${log.tipY})`}
            />
            {/* 밑동 그림자 */}
            <ellipse
              cx={log.baseX}
              cy={175}
              rx={log.baseW * 0.85}
              ry={2}
              fill="rgba(0,0,0,0.55)"
            />
          </g>
        );
      })}

      {/* 통나무 사이 빛나는 crack — 불 빛이 새어나옴 */}
      <g opacity={0.85 * fireIntensity}>
        <path
          d="M 110 130 Q 130 110 150 132"
          stroke="#ff7026"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 118 145 Q 130 130 142 145"
          stroke="#ffaa44"
          strokeWidth="1"
          fill="none"
        />
      </g>
    </svg>
  );
}
