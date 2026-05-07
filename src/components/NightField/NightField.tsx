// 하늘과 땅 사이에 보이는 horizon 띠를 없애기 위해 — 단단한 wave-path 대신
// 부드럽게 fade되는 그라데이션 한 장으로 깔아 시각적 seam 제거.
export function NightField() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        background:
          'linear-gradient(180deg, transparent 0%, transparent 55%, rgba(15, 8, 4, 0.45) 80%, rgba(8, 4, 2, 0.85) 100%)',
        userSelect: 'none',
      }}
    />
  );
}
