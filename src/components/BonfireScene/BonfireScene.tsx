'use client';
import { Campfire } from '@/components/Campfire/Campfire';
import { SweetPotato } from '@/components/SweetPotato/SweetPotato';
import { PersonSilhouette } from '@/components/PersonSilhouette/PersonSilhouette';
import { StarrySky } from '@/components/StarrySky/StarrySky';
import { NightField } from '@/components/NightField/NightField';
import styles from './BonfireScene.module.css';

interface DummySilhouette {
  x: number;
  y: number;
  scale: number;
  variant: number;
  flip: boolean;
  nick: string;
}

const DUMMY_POTATOES = [0, 1, 2];

const DUMMY_SILHOUETTES: DummySilhouette[] = [
  { x: 20, y: 80, scale: 0.7, variant: 0, flip: false, nick: '지친_구름_07' },
  { x: 35, y: 100, scale: 0.6, variant: 1, flip: false, nick: 'tired-cloud-12' },
  { x: 50, y: 110, scale: 0.5, variant: 2, flip: false, nick: '조용한_고양이_03' },
  { x: 65, y: 100, scale: 0.6, variant: 3, flip: true, nick: 'lonely-lamp-44' },
  { x: 80, y: 80, scale: 0.7, variant: 4, flip: true, nick: '흩어진_엽서_28' },
  { x: 50, y: 30, scale: 0.85, variant: 0, flip: false, nick: '낡은_라디오_91' },
];

const POTATO_SLOTS: ReadonlyArray<{ x: number; y: number; z: number; s: number; r: number }> = [
  { x: -48, y: 0, z: 1, s: 0.95, r: -68 },
  { x: -18, y: 6, z: 2, s: 1.0, r: 22 },
  { x: 12, y: 4, z: 1, s: 0.92, r: -18 },
  { x: 38, y: 0, z: 2, s: 1.05, r: 70 },
  { x: -32, y: -4, z: 0, s: 1.0, r: -28 },
  { x: 24, y: -2, z: 0, s: 0.98, r: 32 },
  { x: -2, y: 10, z: 3, s: 1.05, r: 0 },
];

export function BonfireScene() {
  return (
    <div className="stage">
      <StarrySky />
      <NightField />
      <div className={styles.fogLayer} />

      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.signBoard}>
            <span className={styles.triangle} />
            <span>CAMP 04 · 감정 군고구마</span>
          </div>
          <div className={styles.brandTitle}>감정 쓰레기통</div>
          <div className={styles.brandSub}>throw it in the campfire · 익명 군고구마</div>
        </div>
        <div className={styles.meta}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Around fire</span>
            <span className={styles.metaValue}>
              <span className={styles.liveDot} />24
            </span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Roasted tonight</span>
            <span className={styles.metaValue}>8,421</span>
          </div>
        </div>
      </header>

      <div className={styles.silhouettes}>
        {DUMMY_SILHOUETTES.map((s, i) => (
          <div
            key={i}
            className={styles.silhouette}
            style={{
              left: `calc(${s.x}% - 40px)`,
              bottom: `${s.y}px`,
              transform: s.flip ? 'scaleX(-1)' : 'none',
            }}
          >
            <div
              className={styles.silhouetteNick}
              style={{ transform: `translateX(-50%) ${s.flip ? 'scaleX(-1)' : ''}` }}
            >
              @{s.nick}
            </div>
            <PersonSilhouette variant={s.variant} scale={s.scale} />
          </div>
        ))}
      </div>

      <div className={styles.fireGlow} style={{ opacity: 0.7 }} />

      <div className={styles.bonfireZone}>
        <Campfire width={280} fireIntensity={1} />
        <div className={styles.potatoRow}>
          {DUMMY_POTATOES.map((id, i) => {
            const slot = POTATO_SLOTS[i % POTATO_SLOTS.length];
            return (
              <div
                key={id}
                className={styles.potatoItem}
                style={{
                  left: `calc(50% + ${slot.x}px)`,
                  bottom: `${slot.y}px`,
                  zIndex: 16 + slot.z,
                  transform: `translateX(-50%) rotate(${slot.r}deg) scale(${slot.s})`,
                }}
              >
                <SweetPotato size={36} seed={id + 1} roastLevel={id * 0.3} />
              </div>
            );
          })}
        </div>
        <div
          className={styles.campfireFlames}
          style={{ ['--intensity' as string]: '1' }}
        >
          <div className={`${styles.flame} ${styles.fBack}`} />
          <div className={`${styles.flame} ${styles.fMid}`} />
          <div className={`${styles.flame} ${styles.fFront}`} />
          <div className={`${styles.flame} ${styles.fCore}`} />
        </div>
      </div>

      <div className={styles.grain} />
    </div>
  );
}
