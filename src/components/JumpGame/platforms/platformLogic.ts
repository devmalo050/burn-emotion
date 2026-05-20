// 우주를 줄게 발판 종류 — 데이터 모델 + 스폰 분포 + 위치 갱신.
// 새 발판 추가: 여기 KIND_SPAWN 항목 + PlatformDesigns 컴포넌트만 추가하면 됨.
// 착지 시 효과(spring 부스트·hot 즉사·rolling 밀기·breakable 소멸)는 캐릭터 물리와
// 강결합이라 useJumpGame RAF 안에서 처리 — 여기 상수만 export.

export type PlatformKind =
  | 'basic'
  | 'breakable'
  | 'drift'
  | 'swing'
  | 'lift'
  | 'spring'
  | 'hot'
  | 'rolling';

export interface Platform {
  id: number;
  x: number; // world x (viewport 좌측 기준 px) — 움직이는 발판은 매 프레임 갱신됨
  y: number; // world y (시작점 0, 위로 +) — lift 는 매 프레임 갱신됨
  width: number;
  kind: PlatformKind;
  bornX?: number; // drift 기준 x / swing 앵커(plank 중심 기준) x
  bornY?: number; // lift 기준 y / swing 최하점 y
  phase?: number; // 사인파 위상 오프셋
  swingAngle?: number; // swing — 현재 진자 각도 (rad). 사슬 비주얼 기울임용
  prevSurfaceY?: number; // 직전 프레임 y — 움직이는 발판 충돌 판정(상대운동)용
  breakAt?: number | null; // breakable — 밟힌 시각(performance.now), null=미밟음
  rollDir?: -1 | 1; // rolling — 미는 방향
}

// === 동작 상수 ===
export const BREAK_DELAY = 400; // breakable — 밟은 뒤 소멸까지 (ms)
export const SPRING_BOOST_MULT = 2; // spring — 일반 점프 초기속도 배수
export const ROLL_PUSH = 0.12; // rolling — 캐릭터 미는 속도 (px/ms)
// rolling 은 밀려도 버틸 공간이 필요해 너비 고정 (난이도에 따라 안 좁아짐).
export const ROLLING_WIDTH = 130;

// 움직이는 발판 사인파 — period 는 ms (now/period 가 sin 인자)
const DRIFT_AMP = 70;
const DRIFT_PERIOD = 900;
const LIFT_AMP = 55;
const LIFT_PERIOD = 780;
// swing 은 진자 — 앵커 고정, 발판이 호를 그림.
export const SWING_LEN = 64; // 사슬 길이 (앵커 ~ plank)
export const SWING_MAX_ANGLE = 0.7; // 최대 진자 각도 (rad ≈ 40°)
const SWING_PERIOD = 560;

// 움직이는 발판이 x 방향으로 흔들리는 최대 진폭 — spawn 시 화면 밖 안 나가게 여유.
export const MAX_X_AMP = Math.max(DRIFT_AMP, Math.sin(SWING_MAX_ANGLE) * SWING_LEN);

// === 스폰 분포 ===
// difficulty = min(1, maxY/4000). 임계 통과한 종류들의 가중치 룰렛.
interface SpawnEntry {
  kind: PlatformKind;
  threshold: number; // 등장 시작 difficulty
  weight: (d: number) => number;
}

const KIND_SPAWN: SpawnEntry[] = [
  { kind: 'basic', threshold: 0, weight: (d) => 100 * (1 - d * 0.65) },
  { kind: 'spring', threshold: 0, weight: () => 8 },
  { kind: 'drift', threshold: 0.1, weight: (d) => d * 28 },
  { kind: 'lift', threshold: 0.2, weight: (d) => d * 24 },
  { kind: 'breakable', threshold: 0.25, weight: (d) => d * 30 },
  { kind: 'swing', threshold: 0.3, weight: (d) => d * 22 },
  { kind: 'rolling', threshold: 0.45, weight: (d) => d * 26 },
  { kind: 'hot', threshold: 0.5, weight: (d) => d * 20 },
];

// 다음 발판 종류 선택. prevKind 가 hot 이면 연속 hot 회피(도달 불가 구간 방지).
export function pickPlatformKind(
  difficulty: number,
  prevKind: PlatformKind | null,
): PlatformKind {
  const pool = KIND_SPAWN.filter(
    (e) =>
      difficulty >= e.threshold &&
      !(prevKind === 'hot' && e.kind === 'hot'),
  );
  let total = 0;
  for (const e of pool) total += Math.max(0, e.weight(difficulty));
  if (total <= 0) return 'basic';
  let r = Math.random() * total;
  for (const e of pool) {
    r -= Math.max(0, e.weight(difficulty));
    if (r <= 0) return e.kind;
  }
  return 'basic';
}

// 발판 종류별 추가 필드 초기화 (spawn 시 1회).
export function initPlatformFields(p: Platform): void {
  if (p.kind === 'drift') {
    p.bornX = p.x;
    p.phase = Math.random() * Math.PI * 2;
  } else if (p.kind === 'swing') {
    // 진자 — bornX 는 앵커(=plank 중심) x, bornY 는 진자 최하점 y
    p.bornX = p.x + p.width / 2;
    p.bornY = p.y;
    p.phase = Math.random() * Math.PI * 2;
    p.swingAngle = 0;
  } else if (p.kind === 'lift') {
    p.bornY = p.y;
    p.phase = Math.random() * Math.PI * 2;
  } else if (p.kind === 'rolling') {
    p.rollDir = Math.random() < 0.5 ? -1 : 1;
  } else if (p.kind === 'breakable') {
    p.breakAt = null;
  }
}

// 움직이는 발판의 x/y 를 현재 시각 기준으로 갱신 (매 프레임).
// 갱신 전 y 를 prevSurfaceY 에 저장 — 충돌 판정이 발판·캐릭터 상대운동을 보게.
export function updatePlatformPosition(p: Platform, now: number): void {
  if (p.kind === 'drift' && p.bornX != null && p.phase != null) {
    p.prevSurfaceY = p.y;
    p.x = p.bornX + Math.sin(now / DRIFT_PERIOD + p.phase) * DRIFT_AMP;
  } else if (
    p.kind === 'swing' &&
    p.bornX != null &&
    p.bornY != null &&
    p.phase != null
  ) {
    // 진자 — 앵커 고정, plank 가 호를 그림. θ=0 이 최하점.
    p.prevSurfaceY = p.y;
    const angle = SWING_MAX_ANGLE * Math.sin(now / SWING_PERIOD + p.phase);
    p.x = p.bornX + Math.sin(angle) * SWING_LEN - p.width / 2;
    p.y = p.bornY + SWING_LEN * (1 - Math.cos(angle));
    p.swingAngle = angle;
  } else if (p.kind === 'lift' && p.bornY != null && p.phase != null) {
    p.prevSurfaceY = p.y;
    p.y = p.bornY + Math.sin(now / LIFT_PERIOD + p.phase) * LIFT_AMP;
  }
}
