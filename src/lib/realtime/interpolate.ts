export interface PeerSnapshot {
  t: number;
  dx: number;
  dy: number;
  yJump: number;
}

export interface PeerVec {
  dx: number;
  dy: number;
  yJump: number;
}

// buffer 는 t 오름차순 가정. renderTime(수신 시각 기준) 시점 값을 두 스냅샷 선형보간으로 반환.
// 데이터가 renderTime 을 못 덮으면 가장 가까운 끝값으로 hold — 외삽(오버슈팅) 은 하지 않는다.
export function sampleAt(buffer: PeerSnapshot[], renderTime: number): PeerVec | null {
  const n = buffer.length;
  if (n === 0) return null;
  const first = buffer[0];
  if (n === 1 || renderTime <= first.t) {
    return { dx: first.dx, dy: first.dy, yJump: first.yJump };
  }
  const last = buffer[n - 1];
  if (renderTime >= last.t) {
    return { dx: last.dx, dy: last.dy, yJump: last.yJump };
  }
  for (let i = n - 1; i > 0; i--) {
    const s0 = buffer[i - 1];
    const s1 = buffer[i];
    if (renderTime >= s0.t && renderTime <= s1.t) {
      const span = s1.t - s0.t;
      const a = span > 0 ? (renderTime - s0.t) / span : 0;
      return {
        dx: s0.dx + (s1.dx - s0.dx) * a,
        dy: s0.dy + (s1.dy - s0.dy) * a,
        yJump: s0.yJump + (s1.yJump - s0.yJump) * a,
      };
    }
  }
  return { dx: last.dx, dy: last.dy, yJump: last.yJump };
}

// renderTime 보간에 필요한 직전 1개만 남기고 오래된 스냅샷을 제거한다 (in-place).
export function prune(buffer: PeerSnapshot[], renderTime: number): void {
  while (buffer.length > 2 && buffer[1].t <= renderTime) buffer.shift();
}
