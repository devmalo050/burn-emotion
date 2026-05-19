'use client';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import styles from './CampfireFlames.module.css';

// ============================================================
// Tweakable defaults — Claude Design Tweaks panel 디폴트 박아넣음.
// 필요하면 직접 수정.
// ============================================================
const TWEAKS = {
  intensity: 0.85,
  wind: -0.05,
  emberCount: 10,
  smokeAmount: 0.45,
  flameWidth: 0.8,
  flameHeight: 1.6,
  splashDurationSec: 5,
  // 불꽃 시뮬 시간 척도 — 0.2~2.0, 기본 1.0.
  // 1.0 일 때 디자인 원본 그대로. <1 이면 천천히 일렁임 (도달 높이/모양 동일).
  // 적용: life += SPEED, 위치 += v*SPEED, 매 프레임 곱은 Math.pow(원래값, SPEED), spawn 도 SPEED 비례 accumulator.
  speed: 0.3,
} as const;

const PALETTE = ['#ff9a2a', '#ff6a14', '#e8420c', '#a52409', '#3a0d04'];
const CORE_PALETTE = ['#fff4c8', '#ffd070', '#ffa030'];

// 불멍가루 — 실제 컬러플레임 분말이 타는 색조 (구리·칼륨·리튬·나트륨 등)
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
interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  hue: number;
}
interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
}
interface PowderSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  hue: number;
  r: number;
  life: number;
  maxLife: number;
}

export interface CampfireFlamesHandle {
  /** 불멍가루 splash 트리거 — 모닥불 클릭 시 외부에서 호출 */
  splash: (clientX: number, clientY: number) => void;
}

export const CampfireFlames = forwardRef<CampfireFlamesHandle>(function CampfireFlames(_props, ref) {
  const outerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const coreCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const embersCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smokeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // splash 상태 + powder sparks — RAF 클로저 안에서 mutable.
  const splashStateRef = useRef<{ startedAt: number; duration: number } | null>(null);
  const powderSparksRef = useRef<PowderSpark[]>([]);

  function splashActiveAt(now: number): boolean {
    const s = splashStateRef.current;
    if (!s) return false;
    return now - s.startedAt < s.duration;
  }
  function splashAlphaAt(now: number): number {
    const s = splashStateRef.current;
    if (!s) return 0;
    const k = (now - s.startedAt) / s.duration;
    if (k >= 1) return 0;
    if (k > 0.8) return 1 - (k - 0.8) / 0.2;
    return 1;
  }
  function randomSplashHue(): number {
    return SPLASH_HUES[Math.floor(Math.random() * SPLASH_HUES.length)];
  }

  // 외부에서 splash(x,y) 호출 가능하게 ref 노출.
  useImperativeHandle(ref, () => ({
    splash: (clientX: number, clientY: number) => {
      const durationMs = TWEAKS.splashDurationSec * 1000;
      const now = performance.now();
      const existing = splashStateRef.current;
      const startedAt =
        existing && now - existing.startedAt < existing.duration
          ? existing.startedAt
          : now;
      splashStateRef.current = {
        startedAt,
        duration: Math.max(
          durationMs,
          existing ? existing.startedAt + existing.duration - now : 0,
        ),
      };
      // 클릭 위치에서 powder sparks 36개 spawn — 불 베이스로 끌려감
      const targetX = window.innerWidth / 2;
      const targetY = window.innerHeight * 0.78;
      for (let i = 0; i < 36; i++) {
        const hue = randomSplashHue();
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        powderSparksRef.current.push({
          x: clientX + (Math.random() - 0.5) * 10,
          y: clientY + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          tx: targetX + (Math.random() - 0.5) * 120,
          ty: targetY + (Math.random() - 0.5) * 20,
          hue,
          r: 1.4 + Math.random() * 1.6,
          life: 0,
          maxLife: 60 + Math.random() * 30,
        });
      }
    },
  }));

  // ============================================================
  // Outer flame canvas — 메탈볼 효과의 본체 (큰 파티클)
  // ============================================================
  useEffect(() => {
    const c = outerCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    const parts: FlameParticle[] = [];
    let raf = 0;
    let spawnAcc = 0; // SPEED < 1 일 때 분수 spawn 누적

    const pushOne = () => {
      const stream = Math.floor(Math.random() * 5) - 2;
      const baseX = W / 2 + stream * 28 * TWEAKS.flameWidth + (Math.random() - 0.5) * 16;
      const now = performance.now();
      const splash = splashActiveAt(now);
      const sAlpha = splashAlphaAt(now);
      const useSplash = splash && Math.random() < 0.7 * sAlpha;
      parts.push({
        x: baseX,
        y: H - 20 + Math.random() * 8,
        baseX,
        flick: Math.random() * Math.PI * 2,
        flickSpeed: 0.06 + Math.random() * 0.04,
        vx: (Math.random() - 0.5) * 0.25 + TWEAKS.wind * 1.2,
        vy: -(2.2 + Math.random() * 1.6) * (0.7 + 0.6 * TWEAKS.intensity) * TWEAKS.flameHeight,
        r: 16 + Math.random() * 14,
        life: 0,
        maxLife: 55 + Math.random() * 30,
        hue: useSplash ? randomSplashHue() : null,
      });
    };

    const spawn = () => {
      const baseRate = Math.max(1, Math.round(3 * TWEAKS.intensity + 1));
      spawnAcc += baseRate * TWEAKS.speed;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        pushOne();
      }
      if (parts.length > 180) parts.splice(0, parts.length - 180);
    };

    const step = () => {
      const S = TWEAKS.speed;
      const dragVy = Math.pow(0.992, S);
      const shrinkEarly = Math.pow(0.997, S);
      const shrinkLate = Math.pow(0.965, S);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      spawn();

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += S;
        p.flick += p.flickSpeed * S;
        const k = p.life / p.maxLife;
        const taperPull = (p.baseX - W / 2) * 0.012 * k;
        p.x += (p.vx + Math.sin(p.flick) * 0.6 - taperPull) * S;
        p.y += p.vy * S;
        p.vy *= dragVy;
        p.r *= k < 0.4 ? shrinkEarly : shrinkLate;
        if (k >= 1 || p.r < 1.5) {
          parts.splice(i, 1);
          continue;
        }

        let col: string;
        if (p.hue != null) {
          const L = k < 0.25 ? 70 : k < 0.55 ? 55 : k < 0.8 ? 42 : 24;
          col = `hsl(${p.hue},92%,${L}%)`;
        } else {
          if (k < 0.25) col = PALETTE[0];
          else if (k < 0.5) col = PALETTE[1];
          else if (k < 0.75) col = PALETTE[2];
          else if (k < 0.92) col = PALETTE[3];
          else col = PALETTE[4];
        }

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        if (p.hue != null) {
          // splash — additive 합성 흰색 방지 + 일렁임 안 도드라지게 alpha 적당히.
          g.addColorStop(0, `hsla(${p.hue},92%,50%,0.55)`);
          g.addColorStop(0.6, `hsla(${p.hue},92%,42%,0.22)`);
          g.addColorStop(1, `hsla(${p.hue},92%,38%,0)`);
        } else {
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

  // ============================================================
  // Inner hot core canvas — 더 작고 밝은 핫 코어
  // ============================================================
  useEffect(() => {
    const c = coreCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    const parts: FlameParticle[] = [];
    let raf = 0;
    let spawnAcc = 0;

    const pushOne = () => {
      const baseX = W / 2 + (Math.random() - 0.5) * 48 * TWEAKS.flameWidth;
      const now = performance.now();
      const splash = splashActiveAt(now);
      const sAlpha = splashAlphaAt(now);
      const useSplash = splash && Math.random() < 0.7 * sAlpha;
      parts.push({
        x: baseX,
        baseX,
        y: H - 10 + Math.random() * 6,
        flick: Math.random() * Math.PI * 2,
        flickSpeed: 0.08 + Math.random() * 0.04,
        vx: (Math.random() - 0.5) * 0.15 + TWEAKS.wind * 0.8,
        vy: -(1.8 + Math.random() * 1.2) * TWEAKS.flameHeight,
        r: 9 + Math.random() * 8,
        life: 0,
        maxLife: 30 + Math.random() * 18,
        hue: useSplash ? randomSplashHue() : null,
      });
    };

    const spawn = () => {
      const baseRate = Math.max(1, Math.round(2 * TWEAKS.intensity + 1));
      spawnAcc += baseRate * TWEAKS.speed;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        pushOne();
      }
      if (parts.length > 70) parts.splice(0, parts.length - 70);
    };

    const step = () => {
      const S = TWEAKS.speed;
      const dragVy = Math.pow(0.99, S);
      const shrinkEarly = Math.pow(0.995, S);
      const shrinkLate = Math.pow(0.94, S);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      spawn();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += S;
        p.flick += p.flickSpeed * S;
        const k = p.life / p.maxLife;
        const taperPull = (p.baseX - W / 2) * 0.02 * k;
        p.x += (p.vx + Math.sin(p.flick) * 0.4 - taperPull) * S;
        p.y += p.vy * S;
        p.vy *= dragVy;
        p.r *= k < 0.5 ? shrinkEarly : shrinkLate;
        if (k >= 1 || p.r < 1) {
          parts.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        if (p.hue != null) {
          g.addColorStop(0, `hsla(${p.hue},90%,60%,0.6)`);
          g.addColorStop(0.6, `hsla(${p.hue},90%,48%,0.24)`);
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

  // ============================================================
  // Embers canvas (+ powder sparks) — 화면 전체 떠오르는 불티
  // ============================================================
  useEffect(() => {
    const c = embersCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const embers: Ember[] = [];
    let raf = 0;

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnEmbers = () => {
      // 모닥불 base 가 viewport bottom 290px 이라 그 근처에서 ember spawn.
      while (embers.length < TWEAKS.emberCount) {
        embers.push({
          x: window.innerWidth / 2 + (Math.random() - 0.5) * 80,
          y: window.innerHeight - 300 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 0.4 + TWEAKS.wind * 1.5,
          vy: -(0.8 + Math.random() * 1.6),
          r: 0.6 + Math.random() * 1.6,
          life: 0,
          maxLife: 140 + Math.random() * 180,
          hue: 20 + Math.random() * 22,
        });
      }
    };

    const step = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.globalCompositeOperation = 'lighter';
      spawnEmbers();

      for (let i = embers.length - 1; i >= 0; i--) {
        const p = embers[i];
        p.life++;
        p.x += p.vx + Math.sin((p.life + i) * 0.05) * 0.25 + TWEAKS.wind * 0.6;
        p.y += p.vy;
        p.vy *= 0.995;
        const k = p.life / p.maxLife;
        if (k >= 1) {
          embers.splice(i, 1);
          continue;
        }
        const a = (1 - k) * (0.7 + Math.random() * 0.3);
        const r = p.r;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
        g.addColorStop(0, `hsla(${p.hue},100%,70%,${a * 0.9})`);
        g.addColorStop(1, `hsla(${p.hue},100%,40%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsla(${p.hue + 10},100%,85%,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (embers.length > TWEAKS.emberCount + 20) embers.length = TWEAKS.emberCount;

      // powder sparks (불멍가루) — 불 베이스로 빨려 들어감
      const sparks = powderSparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life++;
        const k = p.life / p.maxLife;
        if (k >= 1) {
          sparks.splice(i, 1);
          continue;
        }
        const pullStrength = 0.06 + k * 0.12;
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        p.vx += dx * pullStrength * 0.01;
        p.vy += dy * pullStrength * 0.01;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;
        // powder sparks alpha — 흰색 안 되는 선에서 적당히
        const a = (1 - k) * 0.72;
        const r = p.r;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 8);
        g.addColorStop(0, `hsla(${p.hue},100%,58%,${a * 0.7})`);
        g.addColorStop(1, `hsla(${p.hue},100%,45%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsla(${p.hue},100%,70%,${a * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // ============================================================
  // Smoke canvas — 옆으로 흐르는 연기 (가벼운 효과)
  // ============================================================
  useEffect(() => {
    const c = smokeCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const puffs: SmokePuff[] = [];
    let frame = 0;
    let raf = 0;

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const step = () => {
      frame++;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.globalCompositeOperation = 'screen';

      if (frame % Math.max(1, Math.round(8 / Math.max(0.05, TWEAKS.smokeAmount))) === 0) {
        // 불꽃 base 가 viewport bottom 240px 부근(canvas 안 파티클 base ~bottom 254px).
        // 연기는 그 위쪽 약간에서 spawn — viewport bottom 기준 320px 정도.
        puffs.push({
          x: window.innerWidth / 2 + (Math.random() - 0.5) * 50,
          y: window.innerHeight - 370 + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 0.3 + TWEAKS.wind * 1.8,
          vy: -(0.3 + Math.random() * 0.5),
          r: 26 + Math.random() * 28,
          life: 0,
          maxLife: 200 + Math.random() * 120,
        });
      }

      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life++;
        const k = p.life / p.maxLife;
        if (k >= 1) {
          puffs.splice(i, 1);
          continue;
        }
        p.x += p.vx + Math.sin((p.life + i) * 0.02) * 0.3;
        p.y += p.vy;
        p.r += 0.25;
        const a = (1 - k) * 0.1 * TWEAKS.smokeAmount;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(200,200,210,${a})`);
        g.addColorStop(1, 'rgba(200,200,210,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      {/* 코어 글로우 — 잉걸불 위 부드러운 따뜻한 빛 */}
      <div className={styles.coreGlow} />
      {/* 잉걸불 베드 — pulse */}
      <div className={styles.embersBed} />
      {/* 외곽 메탈볼 불꽃 */}
      <div className={styles.flameWrap}>
        <canvas ref={outerCanvasRef} width={520} height={600} />
      </div>
      {/* 내부 핫 코어 */}
      <div className={styles.flameCore}>
        <canvas ref={coreCanvasRef} width={260} height={300} />
      </div>
      {/* 떠오르는 불티 + 불멍가루 — 화면 전체 */}
      <canvas ref={embersCanvasRef} className={styles.embersCanvas} />
      {/* 연기 — 화면 전체 */}
      <canvas ref={smokeCanvasRef} className={styles.smokeCanvas} />
    </>
  );
});
