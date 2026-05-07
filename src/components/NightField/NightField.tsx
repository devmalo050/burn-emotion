// 사람들이 앉을 땅 — 가운데 어두운 면 + 모닥불 주변의 따뜻한 글로우.
// horizon 띠 안 보이게 부드럽게 fade. 사람들 위치(약 75-90% 사이)에서 충분히 진해서
// 떠있는 느낌 안 들도록.
export function NightField() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        background:
          'linear-gradient(180deg, transparent 0%, transparent 38%, rgba(15, 8, 4, 0.35) 62%, rgba(8, 5, 3, 0.78) 80%, rgba(4, 2, 1, 0.95) 100%)',
        userSelect: 'none',
      }}
    />
  );
}
