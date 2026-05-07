interface CampfireProps {
  width?: number;
  fireIntensity?: number;
}

export function Campfire({ width = 260, fireIntensity = 1 }: CampfireProps) {
  const stones: ReadonlyArray<readonly [number, number, number, number]> = [
    [20, 168, 18, 9],
    [54, 175, 16, 8],
    [92, 178, 18, 9],
    [134, 178, 20, 9],
    [176, 177, 18, 9],
    [216, 173, 17, 8],
    [240, 168, 14, 7],
  ];
  return (
    <svg width={width} height={width * 0.75} viewBox="0 0 260 195" fill="none">
      <defs>
        <linearGradient id="logBark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b4226" />
          <stop offset="50%" stopColor="#3e2614" />
          <stop offset="100%" stopColor="#1f130a" />
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

      <ellipse cx="130" cy="180" rx="120" ry="12" fill="rgba(0,0,0,0.7)" />
      <ellipse cx="130" cy="178" rx="140" ry="20" fill="rgba(255, 140, 58, 0.25)" opacity={fireIntensity} />

      {stones.map(([cx, cy, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#3a3026" />
          <ellipse cx={cx - 2} cy={cy - 2} rx={rx - 4} ry={ry - 4} fill="#5a4a3a" />
          <ellipse cx={cx - 3} cy={cy - 3} rx={rx - 8} ry={ry - 6} fill="#7a6a52" opacity="0.7" />
        </g>
      ))}

      <ellipse cx="130" cy="155" rx="60" ry="12" fill="url(#emberGlow)" opacity={0.85 * fireIntensity}>
        <animate
          attributeName="opacity"
          values={`${0.6 * fireIntensity};${0.95 * fireIntensity};${0.6 * fireIntensity}`}
          dur="2s"
          repeatCount="indefinite"
        />
      </ellipse>

      <ellipse cx="130" cy="158" rx="54" ry="8" fill="#1a0e06" />

      <g transform="translate(130 145) rotate(-22)">
        <rect x="-70" y="-7" width="140" height="14" rx="7" fill="url(#logBark)" />
        <ellipse cx="-70" cy="0" rx="3" ry="7" fill="url(#logEnd)" />
        <ellipse cx="70" cy="0" rx="3" ry="7" fill="url(#logEnd)" />
        <path d="M -60 -3 L 60 -3 M -50 3 L 50 3" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
      </g>
      <g transform="translate(130 145) rotate(22)">
        <rect x="-70" y="-7" width="140" height="14" rx="7" fill="url(#logBark)" />
        <ellipse cx="-70" cy="0" rx="3" ry="7" fill="url(#logEnd)" />
        <ellipse cx="70" cy="0" rx="3" ry="7" fill="url(#logEnd)" />
        <path d="M -55 -3 L 55 -3 M -45 3 L 45 3" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
      </g>
      <g transform="translate(130 138) rotate(72)">
        <rect x="-60" y="-6" width="120" height="12" rx="6" fill="url(#logBark)" />
        <ellipse cx="-60" cy="0" rx="2.5" ry="6" fill="url(#logEnd)" />
        <ellipse cx="60" cy="0" rx="2.5" ry="6" fill="url(#logEnd)" />
      </g>
      <g transform="translate(130 138) rotate(108)">
        <rect x="-60" y="-6" width="120" height="12" rx="6" fill="url(#logBark)" />
        <ellipse cx="-60" cy="0" rx="2.5" ry="6" fill="url(#logEnd)" />
        <ellipse cx="60" cy="0" rx="2.5" ry="6" fill="url(#logEnd)" />
      </g>

      <g opacity={0.9 * fireIntensity}>
        <path d="M 100 138 Q 130 132 160 140" stroke="#ff7026" strokeWidth="1.5" fill="none" />
        <path d="M 110 148 Q 130 142 150 148" stroke="#ffaa44" strokeWidth="1" fill="none" />
      </g>
    </svg>
  );
}
