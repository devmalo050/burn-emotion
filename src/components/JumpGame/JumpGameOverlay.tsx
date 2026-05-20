'use client';
import { useEffect, useRef } from 'react';
import type { JumpGameApi } from './useJumpGame';
import { PersonSilhouette } from '@/components/PersonSilhouette/PersonSilhouette';
import { GamePlatform } from './platforms/GamePlatforms';
import styles from './JumpGameOverlay.module.css';

interface Props {
  api: JumpGameApi;
  myNick: string;
}

export function JumpGameOverlay({ api, myNick }: Props) {
  const {
    gameState,
    countdownNum,
    height,
    platforms,
    worldBaseY,
    leaderboard,
    lastScoreHeight,
    leaderboardOpen,
    close,
    charXRef,
    charYRef,
    cameraYRef,
    charVariantRef,
    charScaleRef,
    platformsRef,
    worldBaseYRef,
    registerFrameListener,
  } = api;

  const charRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const bgWorldRef = useRef<HTMLDivElement | null>(null);
  // 움직이는 발판(drift/swing/lift) DOM — 매 프레임 left/bottom 갱신용.
  const platformElsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  // 매 RAF 마다 캐릭터/world transform 갱신.
  // 좌표계: char.y · platform.y 는 worldBaseY(=silhouette 위치 viewport bottom) 기준 상대 높이.
  // 발판 wrapper 는 CSS bottom: worldBaseY 로 두고, 안 발판은 bottom: p.y.
  // 카메라 따라 위로: wrapper translateY(cameraY).
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'gameover') return;
    const onFrame = () => {
      const sh = window.innerHeight;
      if (worldRef.current) {
        worldRef.current.style.transform = `translateY(${cameraYRef.current}px)`;
      }
      if (bgWorldRef.current) {
        // 배경도 같은 카메라 transform 으로 흘러내림
        bgWorldRef.current.style.transform = `translateY(${cameraYRef.current}px)`;
      }
      if (charRef.current) {
        // 캐릭터 크기 = PersonSilhouette 80×170 * scale.
        const charH = 170 * charScaleRef.current;
        const charW = 80 * charScaleRef.current;
        // 캐릭터 viewport bottom = worldBaseY + char.y - cameraY → top = sh - bottom - charH
        const charBottom =
          worldBaseYRef.current + charYRef.current - cameraYRef.current;
        const charScreenTop = sh - charBottom - charH;
        charRef.current.style.transform = `translate(${
          charXRef.current - charW / 2
        }px, ${charScreenTop}px)`;
      }
      // 움직이는 발판 — platformsRef 의 갱신된 x/y 를 DOM 에 반영
      for (const p of platformsRef.current) {
        if (p.kind !== 'drift' && p.kind !== 'swing' && p.kind !== 'lift') continue;
        const el = platformElsRef.current.get(p.id);
        if (!el) continue;
        el.style.left = `${p.x}px`;
        el.style.bottom = `${p.y}px`;
        // 사슬 그네 — 사슬을 진자 각도만큼 기울임
        if (p.kind === 'swing' && p.swingAngle != null) {
          const deg = (-p.swingAngle * 180) / Math.PI;
          const chains = el.querySelectorAll('[data-swing-chain]');
          for (const c of chains) {
            (c as HTMLElement).style.transform = `rotate(${deg}deg)`;
          }
        }
      }
    };
    return registerFrameListener(onFrame);
  }, [gameState, registerFrameListener, charXRef, charYRef, cameraYRef, charScaleRef, platformsRef, worldBaseYRef]);

  if (gameState === 'idle' && !leaderboardOpen) return null;

  return (
    <div className={styles.overlay}>
      {/* 평행 스크롤 배경 wrapper — 발판 wrapper 와 같은 transform 으로 카메라 따라 흐름.
          위쪽에 미리 깔린 sky/atm/space/glitch layer 가 캐릭터가 올라갈수록 viewport 로 내려옴. */}
      {gameState !== 'idle' && (
        <div
          ref={bgWorldRef}
          className={styles.bgWorld}
          style={{ bottom: worldBaseY }}
        >
          {/* 각 layer: world 좌표 bottom + height (px) */}
          <div
            className={`${styles.bgLayer} ${styles.bgLayerSky}`}
            style={{ bottom: 300, height: 2500 }}
          />
          <div
            className={`${styles.bgLayer} ${styles.bgLayerAtm}`}
            style={{ bottom: 2800, height: 6000 }}
          />
          <div
            className={`${styles.bgLayer} ${styles.bgLayerSpace}`}
            style={{ bottom: 8800, height: 20000 }}
          />
          <div
            className={`${styles.bgLayer} ${styles.bgLayerGlitch}`}
            style={{ bottom: 28800, height: 80000 }}
          />
        </div>
      )}

      {/* 발판들 (world wrapper 안). gameover 에서도 표시(마지막 상태). */}
      {gameState !== 'idle' && (
        <>
          {/* 발판 wrapper — bottom: worldBaseY 가 silhouette 시작점.
              안 발판 bottom: p.y 는 그 위로의 상대 높이. wrapper translateY 로 카메라 따라 흐름. */}
          <div
            ref={worldRef}
            className={styles.world}
            style={{ bottom: worldBaseY, top: 'auto' }}
          >
            {platforms.map((p) => (
              <div
                key={p.id}
                ref={(el) => {
                  if (el) platformElsRef.current.set(p.id, el);
                  else platformElsRef.current.delete(p.id);
                }}
                className={styles.platform}
                style={{ left: p.x, bottom: p.y }}
              >
                <GamePlatform
                  kind={p.kind}
                  width={p.width}
                  breaking={p.breakAt != null}
                />
              </div>
            ))}
          </div>

          {/* 캐릭터 — 모닥불 옆 사람과 동일한 PersonSilhouette (배정받은 variant·scale) */}
          <div ref={charRef} className={styles.char}>
            <PersonSilhouette
              variant={charVariantRef.current ?? 0}
              scale={charScaleRef.current ?? 0.6}
            />
          </div>
        </>
      )}

      {/* HUD */}
      {gameState === 'playing' && (
        <div className={styles.hud}>{height.toFixed(1)}m</div>
      )}

      {/* 카운트다운 */}
      {gameState === 'countdown' && (
        <div className={styles.countdown}>
          <div key={countdownNum} className={styles.countdownNum}>
            {countdownNum}
          </div>
          <div className={styles.guide}>
            <div className={styles.keyGroup}>
              <div className={styles.keyRow}>
                <div className={styles.keyBox}>←</div>
                <div className={styles.keyBox}>→</div>
              </div>
              <span>좌우 이동</span>
            </div>
            <div className={styles.keyGroup}>
              <div className={`${styles.keyBox} ${styles.keyBoxWide}`}>SPACE</div>
              <span>점프</span>
            </div>
          </div>
        </div>
      )}

      {/* 결과/리더보드 모달 */}
      {(gameState === 'gameover' || leaderboardOpen) && (
        <div className={styles.modalBg} onClick={close}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={close}
              aria-label="닫기"
            >
              ×
            </button>

            {gameState === 'gameover' ? (
              <>
                <div className={styles.modalLabel}>RESULT</div>
                <div className={styles.modalScore}>
                  {(lastScoreHeight ?? 0).toFixed(2)}m
                </div>
              </>
            ) : (
              <div className={styles.modalTitle}>인내의 숲</div>
            )}

            <div className={styles.top10Label}>TOP 10</div>
            <div style={{ textAlign: 'left' }}>
              {leaderboard.length === 0 && (
                <div className={styles.top10Empty}>
                  {gameState === 'gameover' ? '불러오는 중...' : '아직 도전자 없음'}
                </div>
              )}
              {leaderboard.map((row, i) => {
                const isMe = row.nick === myNick;
                const m =
                  typeof row.height === 'number'
                    ? row.height
                    : parseFloat(String(row.height));
                return (
                  <div
                    key={i}
                    className={styles.top10Row}
                    style={{
                      background: isMe ? 'rgba(255,213,144,0.12)' : 'transparent',
                      color: isMe ? '#ffd590' : '#efe8d9',
                      fontWeight: isMe ? 600 : 400,
                    }}
                  >
                    <span style={{ opacity: 0.6, width: 28 }}>{i + 1}</span>
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.nick}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {m.toFixed(2)}m
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
