export const MAX_RADIUS = 56;
export const DEAD_ZONE = 0.12;

export type JoystickVector = { x: number; y: number };

export function computeJoystickVector(
  originX: number,
  originY: number,
  curX: number,
  curY: number,
  maxRadius: number,
  deadZone: number,
): JoystickVector {
  const dx = curX - originX;
  const dy = curY - originY;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || dist < deadZone * maxRadius) return { x: 0, y: 0 };
  const mag = Math.min(dist, maxRadius) / maxRadius;
  const ux = dx / dist;
  const uy = dy / dist;
  return { x: ux * mag, y: -uy * mag };
}
