'use client';
import { useMemo } from 'react';
import type { MeteorGameApi } from './useMeteorGame';

// 키보드 가이드 일러스트 박스 스타일 (별똥별 카운트다운 화면).
const keyBox: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1.5px solid rgba(255,213,144,0.55)',
  borderRadius: 6,
  background: 'rgba(255,213,144,0.08)',
  color: '#ffd590',
  fontSize: 18,
  fontWeight: 600,
  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.35), inset 0 -2px 0 rgba(0,0,0,0.3)',
};
const keyEmpty: React.CSSProperties = { width: 36, height: 36 };

interface Props {
  api: MeteorGameApi;
  myNick: string;
}

export function MeteorOverlay({ api, myNick }: Props) {
  const {
    gameState,
    countdownNum,
    survivedMs,
    meteors,
    meteorElsRef,
    leaderboard,
    lastScoreSec,
    leaderboardOpen,
    close,
  } = api;

  // 위치는 RAF 가 ref 로 매 프레임 갱신 — 여기 useMemo 는 membership(meteors 참조) 바뀔 때만
  // 재생성. survivedMs 매 프레임 리렌더 시엔 동일 참조라 React 가 이 서브트리 reconcile 을 스킵.
  const meteorField = useMemo(
    () =>
      meteors.map((m) => {
        const angle = Math.atan2(m.vy, m.vx) * (180 / Math.PI);
        return (
          <div
            key={m.id}
            ref={(el) => {
              if (el) meteorElsRef.current.set(m.id, el);
              else meteorElsRef.current.delete(m.id);
            }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#fff7d6',
              boxShadow:
                '0 0 16px 6px rgba(255,213,144,0.75), 0 0 32px 10px rgba(255,140,58,0.35)',
              transform: `translate(${m.x}px, ${m.y}px) translate(-50%, -50%)`,
              pointerEvents: 'none',
              zIndex: 90,
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 2,
                height: 56,
                background:
                  'linear-gradient(0deg, transparent, rgba(255,213,144,0.8))',
                top: '50%',
                left: '50%',
                transformOrigin: '50% 0%',
                transform: `translate(-50%, 0) rotate(${angle + 90}deg)`,
              }}
            />
          </div>
        );
      }),
    [meteors, meteorElsRef],
  );

  return (
    <>
      {gameState !== 'idle' && (
        <>
          {/* 별똥별 — 위치는 RAF 가 ref 로 직접 갱신 */}
          {meteorField}

          {gameState === 'playing' && (
            <div
              style={{
                position: 'fixed',
                top: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#ffd590',
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textShadow:
                  '0 2px 12px rgba(0,0,0,0.7), 0 0 24px rgba(255,140,58,0.3)',
                zIndex: 95,
                pointerEvents: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {(survivedMs / 1000).toFixed(1)}초
            </div>
          )}

          {gameState === 'countdown' && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 36,
                background: 'rgba(0,0,0,0.35)',
                zIndex: 92,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  color: '#ffd590',
                  letterSpacing: '0.14em',
                  textShadow: '0 4px 20px rgba(0,0,0,0.7), 0 0 30px rgba(255,140,58,0.3)',
                  marginBottom: -20,
                }}
              >
                별똥별 피하기
              </div>
              <div
                key={countdownNum}
                style={{
                  fontSize: 200,
                  fontWeight: 800,
                  color: '#ffd590',
                  lineHeight: 1,
                  textShadow:
                    '0 8px 40px rgba(0,0,0,0.8), 0 0 60px rgba(255,140,58,0.4)',
                  animation: 'meteorCountdownPulse 1s ease-out both',
                }}
              >
                {countdownNum}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 40,
                  color: 'rgba(239,232,217,0.85)',
                  fontSize: 14,
                  letterSpacing: '0.04em',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <div style={keyEmpty} />
                      <div style={keyBox}>↑</div>
                      <div style={keyEmpty} />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={keyBox}>←</div>
                      <div style={keyBox}>↓</div>
                      <div style={keyBox}>→</div>
                    </div>
                  </div>
                  <span>이동</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{ ...keyBox, width: 168, fontSize: 12, letterSpacing: '0.16em' }}
                  >
                    SPACE
                  </div>
                  <span>점프</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 결과/리더보드 모달 */}
      {(gameState === 'gameover' || leaderboardOpen) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            zIndex: 96,
            animation: 'meteorOverlayIn 0.4s ease-out',
          }}
          onClick={close}
        >
          <div
            style={{
              position: 'relative',
              background:
                'linear-gradient(180deg, rgba(28,16,32,0.96), rgba(12,8,16,0.96))',
              border: '1px solid rgba(255,213,144,0.25)',
              borderRadius: 16,
              padding: '40px 48px',
              minWidth: 360,
              maxWidth: 520,
              color: '#efe8d9',
              textAlign: 'center',
              boxShadow:
                '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,140,58,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 28,
                height: 28,
                border: 'none',
                background: 'transparent',
                color: 'rgba(239,232,217,0.6)',
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#efe8d9';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,232,217,0.6)';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              ×
            </button>

            {gameState === 'gameover' ? (
              <>
                <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: '0.12em' }}>
                  RESULT
                </div>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color: '#ffd590',
                    margin: '12px 0 24px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {(lastScoreSec ?? 0).toFixed(2)}초
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#ffd590',
                  margin: '4px 0 24px',
                  letterSpacing: '0.04em',
                }}
              >
                별똥별 피하기
              </div>
            )}

            <div
              style={{
                fontSize: 13,
                letterSpacing: '0.12em',
                opacity: 0.7,
                marginBottom: 10,
              }}
            >
              TOP 10
            </div>
            <div style={{ textAlign: 'left' }}>
              {leaderboard.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.5, textAlign: 'center', padding: '8px 0' }}>
                  {gameState === 'gameover' ? '불러오는 중...' : '아직 도전자 없음'}
                </div>
              )}
              {leaderboard.map((row, i) => {
                const isMe = row.nick === myNick;
                const sec =
                  typeof row.seconds === 'number'
                    ? row.seconds
                    : parseFloat(String(row.seconds));
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: isMe ? 'rgba(255,213,144,0.12)' : 'transparent',
                      color: isMe ? '#ffd590' : '#efe8d9',
                      fontWeight: isMe ? 600 : 400,
                      fontSize: 14,
                    }}
                  >
                    <span style={{ opacity: 0.6, width: 28 }}>{i + 1}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.nick}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {sec.toFixed(2)}초
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
