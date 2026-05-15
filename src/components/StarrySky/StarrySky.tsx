'use client';
import { useMemo } from 'react';
import styles from './StarrySky.module.css';

export interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  op: number;
  blink: boolean;
  dur: number;
  delay: number;
}

export function makeStars(n = 180): Star[] {
  const arr: Star[] = [];
  for (let i = 0; i < n; i++) {
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
}

interface Props {
  stars?: Star[];
  hiddenStarIds?: ReadonlySet<number>;
  onMoonClick?: () => void;
  onLeaderboardClick?: () => void;
}

export function StarrySky({ stars, hiddenStarIds, onMoonClick, onLeaderboardClick }: Props = {}) {
  // props 없으면 자체 생성 (다른 곳에서도 사용 가능하게).
  const ownStars = useMemo<Star[]>(() => (stars ? [] : makeStars()), [stars]);
  const list = stars ?? ownStars;

  return (
    <div className={styles.starrySky}>
      <div className={styles.skyGrad} />
      <div className={styles.moonGlow} />
      <div
        className={styles.moon}
        onClick={onMoonClick}
        role={onMoonClick ? 'button' : undefined}
        aria-label={onMoonClick ? '별똥별 피하기 시작' : undefined}
      />
      <div
        className={styles.landmarkStar}
        onClick={onLeaderboardClick}
        role={onLeaderboardClick ? 'button' : undefined}
        aria-label={onLeaderboardClick ? '별똥별 리더보드 열기' : undefined}
      />
      {list.map((s) => {
        if (hiddenStarIds?.has(s.id)) return null;
        return (
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
        );
      })}
    </div>
  );
}
