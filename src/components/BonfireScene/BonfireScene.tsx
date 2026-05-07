'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Campfire } from '@/components/Campfire/Campfire';
import { SweetPotato } from '@/components/SweetPotato/SweetPotato';
import { PersonSilhouette } from '@/components/PersonSilhouette/PersonSilhouette';
import { StarrySky } from '@/components/StarrySky/StarrySky';
import { NightField } from '@/components/NightField/NightField';
import { makeNickname } from '@/lib/nickname';
import { PLACEHOLDER_LINES } from '@/lib/data/placeholder-lines';
import { FAKE_MESSAGES } from '@/lib/data/fake-messages';
import { COMFORT_LINES, type ComfortLine } from '@/lib/data/comfort-lines';
import { AudioEngine } from '@/lib/audio/audio-engine';
import { layoutPos } from '@/lib/layout/silhouette-layout';
import type {
  ChatMessage,
  PotatoState,
  SilhouetteEntity,
  ActiveBubble,
  EmberParticle,
} from '@/lib/types';
import styles from './BonfireScene.module.css';

const ROAST_DURATION_MS = 18000;
const CRACK_DURATION_MS = 2400;
const POKE_BOOST = 0.18;
const MAX_POTATOES = 7;
const VISUAL_MAX_SILHOUETTES = 30;

const POTATO_SLOTS: ReadonlyArray<{ x: number; y: number; z: number; s: number; r: number }> = [
  { x: -48, y: 0, z: 1, s: 0.95, r: -68 },
  { x: -18, y: 6, z: 2, s: 1.0, r: 22 },
  { x: 12, y: 4, z: 1, s: 0.92, r: -18 },
  { x: 38, y: 0, z: 2, s: 1.05, r: 70 },
  { x: -32, y: -4, z: 0, s: 1.0, r: -28 },
  { x: 24, y: -2, z: 0, s: 0.98, r: 32 },
  { x: -2, y: 10, z: 3, s: 1.05, r: 0 },
];

function makeSilhouetteEntity(i: number): SilhouetteEntity {
  return {
    id: 'sil-' + i + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    nick: makeNickname(),
    x: 0,
    y: 0,
    scale: 0,
    variant: 0,
    flip: false,
  };
}

export function BonfireScene() {
  const [feedMessages, setFeedMessages] = useState<ChatMessage[]>([]);
  const [comfortMsg, setComfortMsg] = useState<(ComfortLine & { key: number }) | null>(null);
  const [embers, setEmbers] = useState<EmberParticle[]>([]);
  const [shake, setShake] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [onlineCount, setOnlineCount] = useState(24);
  const [totalBurned, setTotalBurned] = useState(8421);
  const [placeholder, setPlaceholder] = useState<string>(PLACEHOLDER_LINES[0]);
  const [draftMessage, setDraftMessage] = useState('');
  const [myNick] = useState(() => makeNickname());
  const [silhouettes, setSilhouettes] = useState<SilhouetteEntity[]>([]);
  const [activeBubbles, setActiveBubbles] = useState<Record<number, ActiveBubble>>({});
  const [pile, setPile] = useState<PotatoState[]>([]);

  const fireRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messageIdRef = useRef(1);
  const potatoIdRef = useRef(1);
  const emberIdRef = useRef(1);

  // === spawn potato AT the fire (no flying arc) ===
  const spawnPotatoAtFire = useCallback((msg: ChatMessage) => {
    const id = potatoIdRef.current++;
    const seed = id;
    setPile((prev) => {
      let next = prev;
      if (next.length >= MAX_POTATOES) {
        const idx = next.findIndex((p) => !p.cracked);
        if (idx >= 0) next = next.filter((_, i) => i !== idx);
        else next = next.slice(1);
        setTotalBurned((t) => t + 1);
      }
      return [
        ...next,
        {
          id,
          seed,
          text: msg.text,
          roast: 0,
          cracked: false,
          crackedAt: 0,
          placedAt: performance.now(),
          wobble: (id * 1.7) % 1,
        },
      ];
    });
  }, []);

  // === messages from crowd ===
  const pushMessageFromCrowd = useCallback(
    ({ text, nick, sIdx }: { text: string; nick: string; sIdx: number }) => {
      const id = messageIdRef.current++;
      const msg: ChatMessage = { id, text, nick, sIdx, time: Date.now(), isMe: false };

      if (sIdx >= 0) {
        const bubbleKey = Date.now() + Math.random();
        setActiveBubbles((prev) => ({ ...prev, [sIdx]: { text, key: bubbleKey } }));
        setTimeout(() => {
          setActiveBubbles((prev) => {
            if (prev[sIdx]?.key === bubbleKey) {
              const next = { ...prev };
              delete next[sIdx];
              return next;
            }
            return prev;
          });
        }, 3000);
      }

      setFeedMessages((prev) => [msg, ...prev].slice(0, 7));
      setTimeout(() => spawnPotatoAtFire(msg), 1500 + Math.random() * 1200);
      setTimeout(() => {
        setFeedMessages((prev) => prev.map((x) => (x.id === id ? { ...x, fading: true } : x)));
        setTimeout(
          () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
          400,
        );
      }, 6500);
    },
    [spawnPotatoAtFire],
  );

  // === init silhouettes synced with onlineCount ===
  useEffect(() => {
    const targetCount = Math.min(onlineCount, VISUAL_MAX_SILHOUETTES);
    setSilhouettes((prev) => {
      if (prev.length === targetCount) {
        return prev.map((s, i) => ({ ...s, ...layoutPos(i, targetCount) }));
      }
      if (prev.length < targetCount) {
        const additions: SilhouetteEntity[] = [];
        for (let i = prev.length; i < targetCount; i++) {
          additions.push(makeSilhouetteEntity(i));
        }
        return [...prev, ...additions].map((s, i) => ({ ...s, ...layoutPos(i, targetCount) }));
      }
      return prev.slice(0, targetCount).map((s, i) => ({ ...s, ...layoutPos(i, targetCount) }));
    });
  }, [onlineCount]);

  // === fake online drift ===
  useEffect(() => {
    const t = setInterval(() => {
      setOnlineCount((c) => Math.max(8, Math.min(36, c + (Math.random() < 0.5 ? -1 : 1))));
    }, 6000);
    return () => clearInterval(t);
  }, []);

  // === fake stream ===
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tickFn = () => {
      if (cancelled) return;
      const text = FAKE_MESSAGES[Math.floor(Math.random() * FAKE_MESSAGES.length)];
      const sIdx = silhouettes.length ? Math.floor(Math.random() * silhouettes.length) : -1;
      const nick = sIdx >= 0 ? silhouettes[sIdx].nick : makeNickname();
      pushMessageFromCrowd({ text, nick, sIdx });
      const delay = 2400 + Math.random() * 4000;
      timer = setTimeout(tickFn, delay);
    };
    if (silhouettes.length) timer = setTimeout(tickFn, 1200);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [silhouettes, pushMessageFromCrowd]);

  // === comfort drift ===
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const tickFn = () => {
      const c = COMFORT_LINES[Math.floor(Math.random() * COMFORT_LINES.length)];
      setComfortMsg({ ...c, key: Date.now() });
      hideTimer = setTimeout(() => setComfortMsg(null), 7000);
    };
    const initialTimer = setTimeout(tickFn, 6000);
    const intervalTimer = setInterval(tickFn, 26000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  // === placeholder rotate ===
  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholder(PLACEHOLDER_LINES[Math.floor(Math.random() * PLACEHOLDER_LINES.length)]);
    }, 7000);
    return () => clearInterval(t);
  }, []);

  // === sparse embers ===
  useEffect(() => {
    const removalTimers = new Set<ReturnType<typeof setTimeout>>();
    const t = setInterval(() => {
      const id = emberIdRef.current++;
      const newEmber: EmberParticle = {
        id,
        startX: -20 + Math.random() * 40,
        endX: -50 + Math.random() * 100,
        endY: -120 - Math.random() * 180,
        duration: 3000 + Math.random() * 2200,
      };
      setEmbers((prev) => [...prev.slice(-15), newEmber]);
      const removal = setTimeout(() => {
        setEmbers((prev) => prev.filter((e) => e.id !== id));
        removalTimers.delete(removal);
      }, newEmber.duration + 100);
      removalTimers.add(removal);
    }, 600);
    return () => {
      clearInterval(t);
      for (const r of removalTimers) clearTimeout(r);
    };
  }, []);

  // === ROAST TICKER ===
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = 1;
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const inc = (dt / ROAST_DURATION_MS) * speed;
      let didFinish = false;
      setPile((prev) => {
        if (prev.length === 0) return prev;
        const next: PotatoState[] = [];
        for (const p of prev) {
          if (p.cracked) {
            if (now - p.crackedAt > CRACK_DURATION_MS) {
              didFinish = true;
              continue;
            }
            next.push(p);
            continue;
          }
          const newRoast = Math.min(1, p.roast + inc);
          if (newRoast >= 1) {
            next.push({ ...p, roast: 1, cracked: true, crackedAt: now });
          } else {
            next.push({ ...p, roast: newRoast });
          }
        }
        return next;
      });
      if (didFinish) {
        setTotalBurned((t) => t + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // === first-interaction audio start ===
  useEffect(() => {
    const onFirstInteract = () => {
      if (audioStarted) return;
      AudioEngine.ensure();
      AudioEngine.startBgm();
      setAudioStarted(true);
    };
    window.addEventListener('pointerdown', onFirstInteract, { once: true });
    window.addEventListener('keydown', onFirstInteract, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstInteract);
      window.removeEventListener('keydown', onFirstInteract);
    };
  }, [audioStarted]);

  // === mute sync ===
  useEffect(() => {
    AudioEngine.setMuted(muted);
  }, [muted]);

  // === poke fire ===
  const pokeFire = useCallback(() => {
    AudioEngine.ensure();
    setShake(true);
    setTimeout(() => setShake(false), 220);
    setPile((prev) =>
      prev.map((p) => {
        if (p.cracked) return p;
        const newRoast = Math.min(1, p.roast + POKE_BOOST);
        if (newRoast >= 1) {
          return { ...p, roast: 1, cracked: true, crackedAt: performance.now() };
        }
        return { ...p, roast: newRoast };
      }),
    );
    for (let k = 0; k < 8; k++) {
      const eid = emberIdRef.current++;
      const newEmber: EmberParticle = {
        id: eid,
        startX: (Math.random() - 0.5) * 30,
        endX: (Math.random() - 0.5) * 140,
        endY: -120 - Math.random() * 200,
        duration: 1500 + Math.random() * 1200,
      };
      setEmbers((prev) => [...prev, newEmber]);
      setTimeout(
        () => setEmbers((prev) => prev.filter((e) => e.id !== eid)),
        newEmber.duration + 100,
      );
    }
  }, []);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault?.();
      const text = draftMessage.trim();
      if (!text) return;
      setDraftMessage('');
      const id = messageIdRef.current++;
      const msg: ChatMessage = {
        id,
        text,
        nick: myNick,
        sIdx: -1,
        isMe: true,
        time: Date.now(),
      };
      setFeedMessages((prev) => [{ ...msg, nick: msg.nick + ' (나)' }, ...prev].slice(0, 7));
      setTimeout(() => spawnPotatoAtFire(msg), 100);
      setTimeout(() => {
        setFeedMessages((prev) => prev.map((x) => (x.id === id ? { ...x, fading: true } : x)));
        setTimeout(
          () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
          400,
        );
      }, 6500);
    },
    [draftMessage, myNick, spawnPotatoAtFire],
  );

  const fireIntensity = Math.min(1.5, 0.85 + pile.length * 0.04);
  const roastingCount = pile.filter((p) => !p.cracked).length;

  return (
    <div className="stage">
      <StarrySky />
      <NightField />
      <div className={styles.fogLayer} />

      {/* Header */}
      <div className={styles.header}>
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
              <span className={styles.liveDot} />
              {onlineCount}
            </span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Roasted tonight</span>
            <span className={styles.metaValue}>{totalBurned.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Side feed */}
      <div className={styles.feed}>
        <div className={styles.feedHeader}>
          <span>
            <span className={styles.blink}>●</span> Live · 들리는 말들
          </span>
          <span>{feedMessages.length}</span>
        </div>
        {feedMessages.map((m) => (
          <div
            key={m.id}
            className={`${styles.feedItem} ${m.fading ? styles.fading : ''}`}
          >
            <div className={styles.feedMeta}>
              <span className={styles.feedNick}>@{m.nick}</span>
              <span className={styles.feedTime}>방금</span>
            </div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      {/* Comfort */}
      {comfortMsg && (
        <div className={styles.comfort} key={comfortMsg.key}>
          <div className={styles.comfortQuote}>{comfortMsg.kr}</div>
          <div className={styles.comfortQuoteEn}>{comfortMsg.en}</div>
        </div>
      )}

      {/* Silhouettes */}
      <div className={styles.silhouettes}>
        {silhouettes.map((s, i) => (
          <div
            key={s.id}
            className={styles.silhouette}
            style={{
              left: `calc(${s.x}% - 40px)`,
              bottom: s.y + 'px',
              transform: s.flip ? 'scaleX(-1)' : 'none',
            }}
          >
            <div
              className={styles.silhouetteNick}
              style={{ transform: `translateX(-50%) ${s.flip ? 'scaleX(-1)' : ''}` }}
            >
              @{s.nick.slice(0, 16)}
            </div>
            <PersonSilhouette variant={s.variant} scale={s.scale} />
            {activeBubbles[i] && (
              <div
                className={styles.silhouetteBubble}
                key={activeBubbles[i].key}
                style={{ transform: `translateX(-50%) ${s.flip ? 'scaleX(-1)' : ''}` }}
              >
                {activeBubbles[i].text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fire glow */}
      <div className={styles.fireGlow} style={{ opacity: fireIntensity * 0.7 }} />

      {/* Bonfire zone */}
      <div
        ref={fireRef}
        className={`${styles.bonfireZone} ${shake ? styles.shake : ''}`}
        onClick={pokeFire}
      >
        <Campfire width={280} fireIntensity={fireIntensity} />

        {/* Roasting potatoes */}
        <div className={styles.potatoRow}>
          {pile.map((p, i) => {
            const slot = POTATO_SLOTS[i % POTATO_SLOTS.length];
            return (
              <div
                key={p.id}
                className={`${styles.potatoItem} ${p.cracked ? styles.cracked : ''}`}
                style={{
                  left: `calc(50% + ${slot.x}px)`,
                  bottom: `${slot.y}px`,
                  zIndex: 16 + slot.z,
                  transform: `translateX(-50%) rotate(${slot.r}deg) scale(${slot.s})`,
                }}
                title={p.text}
              >
                <SweetPotato size={36} seed={p.seed} roastLevel={p.roast} cracked={p.cracked} />
              </div>
            );
          })}
        </div>

        {/* Embers */}
        <div className={styles.emberLayer}>
          {embers.map((e) => (
            <div
              key={e.id}
              className={styles.emberParticle}
              style={
                {
                  left: `calc(50% + ${e.startX}px)`,
                  bottom: '120px',
                  animation: `emberRise ${e.duration}ms ease-out forwards`,
                  ['--end-x' as string]: e.endX + 'px',
                  ['--end-y' as string]: e.endY + 'px',
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* Animated flames */}
        <div
          className={styles.campfireFlames}
          style={{ ['--intensity' as string]: fireIntensity } as React.CSSProperties}
        >
          <div className={`${styles.flame} ${styles.fBack}`} />
          <div className={`${styles.flame} ${styles.fMid}`} />
          <div className={`${styles.flame} ${styles.fFront}`} />
          <div className={`${styles.flame} ${styles.fCore}`} />
        </div>

        {/* Pile counter */}
        {roastingCount > 0 && (
          <div className={styles.pileCounter}>{roastingCount}개 굽는 중 · tap to stoke</div>
        )}
      </div>


      {/* Stoke button */}
      <button className={styles.stokeButton} onClick={pokeFire}>
        🔥 {roastingCount > 0 ? `불 쑤시기 · stoke (${roastingCount})` : '불 쑤시기 · stoke'}
      </button>

      {/* Sound */}
      <button className={styles.soundToggle} onClick={() => setMuted((m) => !m)}>
        {muted ? '◎ Sound off' : '◉ Sound on'}
      </button>

      {/* Input */}
      <div className={styles.inputZone}>
        <form
          className={`${styles.inputBar} ${draftMessage.trim() ? styles.glow : ''}`}
          onSubmit={submit}
        >
          <input
            ref={inputRef}
            type="text"
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            placeholder={placeholder}
            maxLength={140}
          />
          <button type="submit" disabled={!draftMessage.trim()}>
            보내기
          </button>
        </form>
        <div className={styles.inputHint}>
          <span>ENTER · send</span>
          <span className={styles.nick}>@{myNick}</span>
          <span>ANONYMOUS · 익명</span>
        </div>
      </div>

      <div className={styles.grain} />
    </div>
  );
}
