export function NightField() {
  return (
    <svg
      preserveAspectRatio="none"
      viewBox="0 0 100 30"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '30%',
        pointerEvents: 'none',
        zIndex: 1,
        userSelect: 'none',
      }}
    >
      <defs>
        <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1a18" />
          <stop offset="40%" stopColor="#15100a" />
          <stop offset="100%" stopColor="#080403" />
        </linearGradient>
      </defs>
      <path d="M 0 4 Q 30 2 50 5 Q 70 7 100 4 L 100 30 L 0 30 Z" fill="url(#fieldGrad)" />
    </svg>
  );
}
