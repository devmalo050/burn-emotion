'use client';
import { useEffect, useRef } from 'react';
import styles from './HeadFire.module.css';

interface Props {
  rainbow: boolean;
}

const PALETTE = ['#ff9a2a', '#ff6a14', '#e8420c', '#a52409', '#3a0d04'];
const CORE_PALETTE = ['#fff4c8', '#ffd070', '#ffa030'];
const SPLASH_HUES = [120, 145, 175, 200, 220, 260, 285, 320, 50] as const;

interface FlameParticle {
  x: number;
  y: number;
  baseX: number;
  flick: number;
  flickSpeed: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  hue: number | null;
}

const SPEED = 0.5;
const FLAME_WIDTH = 0.55;
const FLAME_HEIGHT = 1.3;

export function HeadFire({ rainbow }: Props) {
  const outerRef = useRef<HTMLCanvasElement | null>(null);
  const coreRef = useRef<HTMLCanvasElement | null>(null);
  const rainbowRef = useRef(rainbow);
  rainbowRef.current = rainbow;

  function pickHue(): number {
    return SPLASH_HUES[Math.floor(Math.random() * SPLASH_HUES.length)];
  }

  useEffect(() => {
    const c = outerRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    const parts: FlameParticle[] = [];
    let raf = 0;
    let spawnAcc = 0;

    const pushOne = () => {
      const stream = Math.floor(Math.random() * 3) - 1;
      const baseX = W / 2 + stream * 6 * FLAME_WIDTH + (Math.random() - 0.5) * 6;
      const useSplash = rainbowRef.current;
      parts.push({
        x: baseX,
        y: H - 8 + Math.random() * 4,
        baseX,
        flick: Math.random() * Math.PI * 2,
        flickSpeed: 0.08 + Math.random() * 0.04,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -(1.5 + Math.random() * 1.0) * FLAME_HEIGHT,
        r: 6 + Math.random() * 5,
        life: 0,
        maxLife: 40 + Math.random() * 20,
        hue: useSplash ? pickHue() : null,
      });
    };

    const step = () => {
      const S = SPEED;
      const dragVy = Math.pow(0.992, S);
      const shrinkEarly = Math.pow(0.997, S);
      const shrinkLate = Math.pow(0.965, S);

      spawnAcc += 3 * S;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        pushOne();
      }
      if (parts.length > 80) parts.splice(0, parts.length - 80);

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += S;
        p.flick += p.flickSpeed * S;
        const k = p.life / p.maxLife;
        const taperPull = (p.baseX - W / 2) * 0.012 * k;
        p.x += (p.vx + Math.sin(p.flick) * 0.5 - taperPull) * S;
        p.y += p.vy * S;
        p.vy *= dragVy;
        p.r *= k < 0.4 ? shrinkEarly : shrinkLate;
        if (k >= 1 || p.r < 0.8) {
          parts.splice(i, 1);
          continue;
        }

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        if (p.hue != null) {
          g.addColorStop(0, `hsla(${p.hue},92%,55%,0.6)`);
          g.addColorStop(0.6, `hsla(${p.hue},92%,45%,0.24)`);
          g.addColorStop(1, `hsla(${p.hue},92%,40%,0)`);
        } else {
          let col: string;
          if (k < 0.25) col = PALETTE[0];
          else if (k < 0.5) col = PALETTE[1];
          else if (k < 0.75) col = PALETTE[2];
          else if (k < 0.92) col = PALETTE[3];
          else col = PALETTE[4];
          g.addColorStop(0, col + 'b0');
          g.addColorStop(0.6, col + '40');
          g.addColorStop(1, col + '00');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const c = coreRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    const parts: FlameParticle[] = [];
    let raf = 0;
    let spawnAcc = 0;

    const pushOne = () => {
      const baseX = W / 2 + (Math.random() - 0.5) * 14 * FLAME_WIDTH;
      const useSplash = rainbowRef.current;
      parts.push({
        x: baseX,
        baseX,
        y: H - 5 + Math.random() * 3,
        flick: Math.random() * Math.PI * 2,
        flickSpeed: 0.1 + Math.random() * 0.05,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -(1.2 + Math.random() * 0.8) * FLAME_HEIGHT,
        r: 3.5 + Math.random() * 3,
        life: 0,
        maxLife: 22 + Math.random() * 12,
        hue: useSplash ? pickHue() : null,
      });
    };

    const step = () => {
      const S = SPEED;
      const dragVy = Math.pow(0.99, S);
      const shrinkEarly = Math.pow(0.995, S);
      const shrinkLate = Math.pow(0.94, S);

      spawnAcc += 2 * S;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        pushOne();
      }
      if (parts.length > 40) parts.splice(0, parts.length - 40);

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += S;
        p.flick += p.flickSpeed * S;
        const k = p.life / p.maxLife;
        const taperPull = (p.baseX - W / 2) * 0.02 * k;
        p.x += (p.vx + Math.sin(p.flick) * 0.35 - taperPull) * S;
        p.y += p.vy * S;
        p.vy *= dragVy;
        p.r *= k < 0.5 ? shrinkEarly : shrinkLate;
        if (k >= 1 || p.r < 0.6) {
          parts.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        if (p.hue != null) {
          g.addColorStop(0, `hsla(${p.hue},90%,62%,0.65)`);
          g.addColorStop(0.6, `hsla(${p.hue},90%,50%,0.26)`);
          g.addColorStop(1, `hsla(${p.hue},90%,42%,0)`);
        } else {
          let col: string;
          if (k < 0.4) col = CORE_PALETTE[0];
          else if (k < 0.75) col = CORE_PALETTE[1];
          else col = CORE_PALETTE[2];
          g.addColorStop(0, col + 'c0');
          g.addColorStop(0.6, col + '40');
          g.addColorStop(1, col + '00');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.outer}>
        <canvas ref={outerRef} width={80} height={120} />
      </div>
      <div className={styles.core}>
        <canvas ref={coreRef} width={40} height={56} />
      </div>
    </div>
  );
}
