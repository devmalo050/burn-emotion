'use client';
import { useMemo } from 'react';
import styles from './StarrySky.module.css';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  op: number;
  blink: boolean;
  dur: number;
  delay: number;
}

export function StarrySky() {
  const stars = useMemo<Star[]>(() => {
    const arr: Star[] = [];
    for (let i = 0; i < 180; i++) {
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 65,
        size: 0.5 + Math.random() * 1.6,
        op: 0.3 + Math.random() * 0.7,
        blink: Math.random() > 0.7,
        dur: 2 + Math.random() * 5,
        delay: Math.random() * 5,
      });
    }
    return arr;
  }, []);

  return (
    <div className={styles.starrySky}>
      <div className={styles.skyGrad} />
      <div className={styles.moon} />
      <div className={styles.moonGlow} />
      {stars.map((s) => (
        <div
          key={s.id}
          className={`${styles.starDot} ${s.blink ? styles.blink : ''}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.op,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
