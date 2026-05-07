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
  // 자연스러운 강자갈 — 위치/크기/색조/회전 다양하게
  // 앞쪽(z 높은 짙은 톤)이 뒤쪽(z 낮은 차가운 톤)을 살짝 가림
  const stones: ReadonlyArray<{
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rot: number;
    /** 0=뒤, 2=앞 — 색조와 z-index */
    depth: 0 | 1 | 2;
    /** seed-style 모양 변형 — body path 굴곡 시드 */
    bump: number;
  }> = [
    // 뒷줄 — 살짝 위쪽 + 차가운 톤
    { cx: 30, cy: 167, rx: 17, ry: 8, rot: -8, depth: 0, bump: 0.3 },
    { cx: 232, cy: 167, rx: 16, ry: 7.5, rot: 6, depth: 0, bump: 0.6 },
    { cx: 200, cy: 169, rx: 13, ry: 6.5, rot: -3, depth: 0, bump: 0.2 },
    // 가운데줄
    { cx: 64, cy: 174, rx: 18, ry: 9, rot: 4, depth: 1, bump: 0.5 },
    { cx: 102, cy: 178, rx: 22, ry: 11, rot: -6, depth: 2, bump: 0.4 },
    { cx: 162, cy: 178, rx: 21, ry: 10, rot: 3, depth: 2, bump: 0.7 },
    { cx: 196, cy: 175, rx: 19, ry: 9, rot: -4, depth: 1, bump: 0.3 },
    // 앞줄 — 살짝 아래
    { cx: 132, cy: 184, rx: 24, ry: 11.5, rot: 0, depth: 2, bump: 0.5 },
    { cx: 80, cy: 182, rx: 14, ry: 7, rot: -10, depth: 1, bump: 0.8 },
    { cx: 220, cy: 182, rx: 13, ry: 6.5, rot: 8, depth: 1, bump: 0.2 },
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

        {/* 자연스러운 강자갈 그라디언트 — 깊이별 색조 변화 */}
        <linearGradient id="stoneFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a89b86" />
          <stop offset="45%" stopColor="#6e6354" />
          <stop offset="100%" stopColor="#332b22" />
        </linearGradient>
        <linearGradient id="stoneMid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#807462" />
          <stop offset="50%" stopColor="#52483b" />
          <stop offset="100%" stopColor="#241d16" />
        </linearGradient>
        <linearGradient id="stoneBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#605548" />
          <stop offset="50%" stopColor="#3a3128" />
          <stop offset="100%" stopColor="#1a140e" />
        </linearGradient>
        {/* 불빛이 위에서 비추는 highlight */}
        <radialGradient id="stoneHighlight" cx="0.5" cy="0.2" r="0.5">
          <stop offset="0%" stopColor="rgba(255, 200, 130, 0.55)" />
          <stop offset="60%" stopColor="rgba(255, 140, 58, 0.18)" />
          <stop offset="100%" stopColor="rgba(255, 140, 58, 0)" />
        </radialGradient>
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

      {/* 돌 둘레 — 자연스러운 강자갈 모양 (smooth bezier path + 깊이별 톤) */}
      {[...stones]
        .sort((a, b) => a.depth - b.depth)
        .map((s, i) => {
          // 8각형 형태로 자연스럽게 굴곡진 path 생성
          // bump 값으로 모양에 변화: 어떤 돌은 위가 살짝 부풀고 어떤 돌은 옆구리가 패임
          const k1 = 0.85 + s.bump * 0.18;
          const k2 = 0.92 + (1 - s.bump) * 0.16;
          const k3 = 0.88 + s.bump * 0.14;
          const k4 = 0.94 - s.bump * 0.12;
          const stoneFill =
            s.depth === 2
              ? 'url(#stoneFront)'
              : s.depth === 1
              ? 'url(#stoneMid)'
              : 'url(#stoneBack)';

          // 자연스러운 굴곡 path (위에서 시계방향)
          const path = `
            M ${-s.rx * k1} 0
            C ${-s.rx * k2} ${-s.ry * 0.85}, ${-s.rx * 0.4} ${-s.ry * k3}, 0 ${-s.ry * k4}
            C ${s.rx * 0.45} ${-s.ry * k3}, ${s.rx * k2} ${-s.ry * 0.85}, ${s.rx * k1} 0
            C ${s.rx * k4} ${s.ry * 0.85}, ${s.rx * 0.4} ${s.ry}, 0 ${s.ry * k3}
            C ${-s.rx * 0.45} ${s.ry}, ${-s.rx * k4} ${s.ry * 0.85}, ${-s.rx * k1} 0 Z`;

          return (
            <g key={`s${i}`} transform={`translate(${s.cx} ${s.cy}) rotate(${s.rot})`}>
              {/* 발 밑 그림자 */}
              <ellipse
                cx={1.5}
                cy={s.ry + 1.5}
                rx={s.rx * 0.85}
                ry={2.2}
                fill="rgba(0, 0, 0, 0.55)"
              />
              {/* 돌 본체 */}
              <path d={path} fill={stoneFill} />
              {/* 위쪽에 불빛 highlight (불 쪽에서 받는 따뜻한 빛) */}
              <ellipse
                cx={0}
                cy={-s.ry * 0.35}
                rx={s.rx * 0.7}
                ry={s.ry * 0.5}
                fill="url(#stoneHighlight)"
                opacity={0.7 + s.depth * 0.1}
              />
              {/* 가장 윗면 살짝 뜨는 specular */}
              <path
                d={`M ${-s.rx * 0.55} ${-s.ry * 0.55} Q 0 ${-s.ry * k4 - 0.5} ${s.rx * 0.55} ${-s.ry * 0.55}`}
                stroke="rgba(255, 220, 180, 0.45)"
                strokeWidth="0.6"
                strokeLinecap="round"
                fill="none"
              />
              {/* 작은 노이즈 점 — 표면 텍스처 */}
              {[-1, 1].map((sign, idx) => (
                <circle
                  key={`spec${idx}`}
                  cx={sign * s.rx * 0.4 + s.bump * 2}
                  cy={s.ry * 0.15 - s.bump * 2}
                  r="0.5"
                  fill="rgba(0, 0, 0, 0.35)"
                />
              ))}
            </g>
          );
        })}

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
