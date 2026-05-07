export interface SilhouettePosition {
  x: number;       // % units (0..100)
  y: number;       // px above bottom
  scale: number;
  variant: number; // 0..4
  flip: boolean;
}

export function layoutPos(i: number, total: number): SilhouettePosition {
  const backCount = Math.ceil(total * 0.6);
  const frontCount = total - backCount;
  let x: number;
  let y: number;
  let scale: number;

  if (i < backCount) {
    const t = backCount === 1 ? 0.5 : i / (backCount - 1);
    const theta = ((160 - t * 140) * Math.PI) / 180;
    x = 50 + Math.cos(theta) * 42;
    y = 100 + Math.sin(theta) * 30;
    scale = 0.5 + Math.sin(theta) * 0.15;
  } else {
    const t = frontCount === 1 ? 0.5 : (i - backCount) / (frontCount - 1);
    let theta: number;
    if (t < 0.5) {
      theta = ((200 + t * 2 * 45) * Math.PI) / 180;
    } else {
      theta = ((295 + (t - 0.5) * 2 * 45) * Math.PI) / 180;
    }
    x = 50 + Math.cos(theta) * 32;
    y = 30 + Math.sin(theta) * 12;
    scale = 0.85;
  }

  const flip = x > 50;
  const variant = (i * 7 + 3) % 5;
  return { x, y, scale, variant, flip };
}
