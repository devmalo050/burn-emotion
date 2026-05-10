'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Campfire } from '@/components/Campfire/Campfire';
import { SweetPotato } from '@/components/SweetPotato/SweetPotato';
import { PersonSilhouette } from '@/components/PersonSilhouette/PersonSilhouette';
import { StarrySky } from '@/components/StarrySky/StarrySky';
import { NightField } from '@/components/NightField/NightField';
import { makeNickname } from '@/lib/nickname';
import { PLACEHOLDER_LINES } from '@/lib/data/placeholder-lines';
import { COMFORT_LINES, type ComfortLine } from '@/lib/data/comfort-lines';
import { AudioEngine } from '@/lib/audio/audio-engine';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
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

const POTATO_SLOTS: ReadonlyArray<{ x: number; y: number; z: number; s: number; r: number }> = [
  { x: -48, y: 0, z: 1, s: 0.95, r: -68 },
  { x: -18, y: 6, z: 2, s: 1.0, r: 22 },
  { x: 12, y: 4, z: 1, s: 0.92, r: -18 },
  { x: 38, y: 0, z: 2, s: 1.05, r: 70 },
  { x: -32, y: -4, z: 0, s: 1.0, r: -28 },
  { x: 24, y: -2, z: 0, s: 0.98, r: 32 },
  { x: -2, y: 10, z: 3, s: 1.05, r: 0 },
];

// 모닥불 주위 랜덤 자리 — 정해진 호 대신 매 세션 다른 위치.
// 정중앙 앞 (불을 가리는 zone) 만 비우고, 좌우/뒤로 자연스럽게 흩어짐.
function randomSpot(): { x: number; y: number; scale: number; flip: boolean } {
  const isFront = Math.random() < 0.3;
  let theta: number;
  let radius: number;
  let y: number;
  let scale: number;
  if (isFront) {
    // 앞쪽 좌우 (정중앙은 피함)
    const isLeft = Math.random() < 0.5;
    theta = isLeft
      ? ((200 + Math.random() * 50) * Math.PI) / 180 // 200-250°
      : ((290 + Math.random() * 50) * Math.PI) / 180; // 290-340°
    radius = 28 + Math.random() * 10;
    y = 22 + Math.random() * 28;
    scale = 0.78 + Math.random() * 0.12;
  } else {
    // 뒤쪽 호 — 모닥불 너머
    theta = ((20 + Math.random() * 140) * Math.PI) / 180; // 20-160°
    radius = 36 + Math.random() * 12;
    y = 78 + Math.random() * 50;
    scale = 0.48 + Math.sin(theta) * 0.18 + Math.random() * 0.06;
  }
  const x = 50 + Math.cos(theta) * radius;
  return { x, y, scale, flip: x > 50 };
}

export function BonfireScene() {
  const [feedMessages, setFeedMessages] = useState<ChatMessage[]>([]);
  const [comfortMsg, setComfortMsg] = useState<(ComfortLine & { key: number }) | null>(null);
  const [embers, setEmbers] = useState<EmberParticle[]>([]);
  const [shake, setShake] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showPeople, setShowPeople] = useState(true);
  const [audioStarted, setAudioStarted] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [totalBurned, setTotalBurned] = useState(0);
  const [placeholder, setPlaceholder] = useState<string>(PLACEHOLDER_LINES[0]);
  const [draftMessage, setDraftMessage] = useState('');
  const [myNick] = useState(() => makeNickname());
  const [silhouettes, setSilhouettes] = useState<SilhouetteEntity[]>([]);
  const [activeBubbles, setActiveBubbles] = useState<Record<number, ActiveBubble>>({});
  const [pile, setPile] = useState<PotatoState[]>([]);
  // 내 자리 인덱스 — 세션 시작 후 첫 silhouettes 생성 시 랜덤 선택해서 고정
  const [mySilhouetteIdx, setMySilhouetteIdx] = useState<number | null>(null);

  const fireRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 도배 방지용 — 마지막 보낸 메시지 텍스트와 시각, 직전 N초 내 보낸 횟수
  const lastSentRef = useRef<{ text: string; at: number; recent: number[] }>({
    text: '',
    at: 0,
    recent: [],
  });
  const [throttleNotice, setThrottleNotice] = useState<string | null>(null);
  const messageIdRef = useRef(1);
  const potatoIdRef = useRef(1);
  const emberIdRef = useRef(1);
  // 실시간 채널 (broadcast + presence)
  const channelRef = useRef<RealtimeChannel | null>(null);
  // setSilhouettes updater 안에서 부작용 호출 시 StrictMode가 두 번 호출하는 문제 방지용
  const silhouettesRef = useRef<SilhouetteEntity[]>([]);
  // presence key — tab/session 별로 고유. 닉네임을 키로 쓰면 새로고침 시 옛 닉이
  // 서버 timeout(~30s)까지 ghost로 남음. UUID로 매 세션 새 슬롯 차지하게.
  const sessionIdRef = useRef<string | null>(null);
  if (sessionIdRef.current === null) {
    sessionIdRef.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  // 내 자리 정보 (mount 시 한 번만 정해서 presence로 공유)
  const mySpotRef = useRef<{
    x: number;
    y: number;
    scale: number;
    flip: boolean;
    variant: number;
    joinedAt: number;
  } | null>(null);
  if (mySpotRef.current === null) {
    const spot = randomSpot();
    mySpotRef.current = {
      ...spot,
      variant: Math.floor(Math.random() * 5),
      joinedAt: Date.now(),
    };
  }

  // === spawn potato AT the fire — stable slot so existing potatoes
  // don't reshuffle. At max capacity, only replace an already-cracked
  // potato (don't kick out a still-roasting one); otherwise skip silently. ===
  const spawnPotatoAtFire = useCallback((msg: ChatMessage) => {
    const id = potatoIdRef.current++;
    const seed = id;
    setPile((prev) => {
      let next = prev;
      if (next.length >= MAX_POTATOES) {
        const crackedIdx = next.findIndex((p) => p.cracked);
        if (crackedIdx >= 0) {
          next = next.filter((_, i) => i !== crackedIdx);
        } else {
          // 모든 자리에서 아직 익는 중 — 자리 양보 없이 소리없이 거름
          return prev;
        }
      }
      const used = new Set(next.map((p) => p.slotIdx));
      let freeSlot = 0;
      for (let s = 0; s < POTATO_SLOTS.length; s++) {
        if (!used.has(s)) {
          freeSlot = s;
          break;
        }
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
          slotIdx: freeSlot,
        },
      ];
    });
  }, []);

  // === messages from crowd (other peers via broadcast) ===
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
      setTimeout(() => spawnPotatoAtFire(msg), 150 + Math.random() * 250);
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

  // silhouettes ref 동기화 — broadcast 핸들러에서 최신값 읽기 위함
  useEffect(() => {
    silhouettesRef.current = silhouettes;
  }, [silhouettes]);

  // === Supabase Realtime: broadcast (메시지) + presence (접속자/실루엣) ===
  // 실제 멀티유저 모드일 때만. presence가 silhouettes 의 source of truth.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase || !mySpotRef.current) return;

    const channel = supabase.channel('campfire-room', {
      config: { presence: { key: sessionIdRef.current ?? myNick } },
    });
    channelRef.current = channel;

    type PresenceMeta = {
      nick: string;
      x: number;
      y: number;
      scale: number;
      flip: boolean;
      variant: number;
      joinedAt: number;
    };

    // presence sync 받을 때마다 silhouettes 재계산.
    // heartbeat/stale filter는 안 씀 — background tab throttling로 false positive 발생함.
    // Supabase 기본 disconnect 감지(WebSocket 끊김)에 맡김.
    const applyPeers = () => {
      const state = channel.presenceState<PresenceMeta>();
      const peerList: PresenceMeta[] = [];
      for (const key in state) {
        const arr = state[key];
        if (!arr || arr.length === 0) continue;
        const meta = arr[0];
        if (!meta?.nick) continue;
        peerList.push(meta);
      }
      peerList.sort((a, b) => a.joinedAt - b.joinedAt);
      const newSilhouettes: SilhouetteEntity[] = peerList.map((p) => ({
        id: 'peer-' + p.nick,
        nick: p.nick,
        x: p.x,
        y: p.y,
        scale: p.scale,
        variant: p.variant,
        flip: p.flip,
      }));
      setSilhouettes(newSilhouettes);
      setOnlineCount(newSilhouettes.length || 1);
      const myIdx = newSilhouettes.findIndex((s) => s.nick === myNick);
      setMySilhouetteIdx(myIdx >= 0 ? myIdx : null);
    };

    channel
      .on('broadcast', { event: 'msg' }, (payload) => {
        const data = payload.payload as { nick: string; text: string };
        if (!data?.nick || !data?.text) return;
        if (data.nick === myNick) return;
        const sList = silhouettesRef.current;
        const sIdx = sList.findIndex((s) => s.nick === data.nick);
        pushMessageFromCrowd({ text: data.text, nick: data.nick, sIdx });
      })
      .on('presence', { event: 'join' }, applyPeers)
      .on('presence', { event: 'leave' }, applyPeers)
      .on('presence', { event: 'sync' }, applyPeers)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && mySpotRef.current) {
          await channel.track({
            nick: myNick,
            x: mySpotRef.current.x,
            y: mySpotRef.current.y,
            scale: mySpotRef.current.scale,
            flip: mySpotRef.current.flip,
            variant: mySpotRef.current.variant,
            joinedAt: mySpotRef.current.joinedAt,
          });
        }
      });

    // pagehide/beforeunload — fire되면 즉시 정리. 못 받는 브라우저는 server timeout 의존.
    const onLeave = () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [myNick, pushMessageFromCrowd]);

  // === 오늘 구워진 고구마 카운터 — Supabase + Realtime ===
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    let cancelled = false;

    // 1) 마운트 시 오늘 카운트 fetch + 어제 row 정리
    void supabase
      .rpc('start_today')
      .then(({ data }) => {
        if (cancelled) return;
        if (typeof data === 'number') setTotalBurned(data);
      });

    // 2) Realtime: daily_counter 변경 구독해서 다른 클라 +1 시 갱신
    const counterChannel = supabase
      .channel('daily-counter')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_counter' },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as { date: string; count: number } | null;
          if (!row) return;
          // 오늘 row만 반영 (Asia/Seoul 자정 기준은 서버에서 결정)
          const todayKST = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
          )
            .toISOString()
            .slice(0, 10);
          if (row.date === todayKST) {
            setTotalBurned(row.count);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(counterChannel);
    };
  }, []);

  // === comfort drift — 하늘에 위로 문구 천천히 떠올랐다 사라짐 ===
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const tickFn = () => {
      const c = COMFORT_LINES[Math.floor(Math.random() * COMFORT_LINES.length)];
      setComfortMsg({ ...c, key: Date.now() });
      hideTimer = setTimeout(() => setComfortMsg(null), 8000);
    };
    const initialTimer = setTimeout(tickFn, 1500);
    const intervalTimer = setInterval(tickFn, 14000);
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

  // === embers — 활활 타오르는 모닥불에서 빈번하게 솟구침 ===
  useEffect(() => {
    const removalTimers = new Set<ReturnType<typeof setTimeout>>();
    const t = setInterval(() => {
      const id = emberIdRef.current++;
      const newEmber: EmberParticle = {
        id,
        startX: -30 + Math.random() * 60,
        endX: -80 + Math.random() * 160,
        endY: -180 - Math.random() * 280,
        duration: 2400 + Math.random() * 2600,
      };
      setEmbers((prev) => [...prev.slice(-30), newEmber]);
      const removal = setTimeout(() => {
        setEmbers((prev) => prev.filter((e) => e.id !== id));
        removalTimers.delete(removal);
      }, newEmber.duration + 100);
      removalTimers.add(removal);
    }, 220);
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
      // 카운터는 sender가 submit 시 RPC로 +1 시키고 Realtime 구독으로 모든 클라가 갱신.
      // 여기서 로컬 +1 안 함 (예전엔 했지만 server 카운터로 옮김).
      void didFinish;
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

  // === poke fire (easter egg: tap the campfire to roast faster) ===
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
      // === 도배 방지 — 5초 내 10번 이상만 차단 ===
      const now = Date.now();
      const last = lastSentRef.current;
      const recent = last.recent.filter((t) => now - t < 5000);
      if (recent.length >= 10) {
        setThrottleNotice('너무 빨리 던지고 있어요. 잠깐 숨 고르기');
        setTimeout(() => setThrottleNotice(null), 2200);
        return;
      }
      lastSentRef.current = { text, at: now, recent: [...recent, now] };
      setDraftMessage('');
      // 서버 카운터 +1 — 같은 메시지 보낸 다른 클라들은 자기 RPC를 따로 호출 안 함
      // (sender만 호출, Realtime으로 모두 갱신). 못 들어가도 UX엔 큰 영향 X.
      const supabase = getSupabase();
      if (supabase) void supabase.rpc('inc_burned');
      const id = messageIdRef.current++;
      // 내 메시지는 mySilhouetteIdx (= 내 실루엣) 위에서 떠오름
      const sIdx =
        mySilhouetteIdx !== null && mySilhouetteIdx < silhouettes.length ? mySilhouetteIdx : -1;
      const msg: ChatMessage = {
        id,
        text,
        nick: myNick,
        sIdx,
        isMe: true,
        time: Date.now(),
      };
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
      setFeedMessages((prev) => [{ ...msg, nick: msg.nick + ' (나)' }, ...prev].slice(0, 7));
      // 다른 접속자들에게 broadcast (Supabase 채널 연결되어 있을 때만)
      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'msg',
          payload: { nick: myNick, text },
        });
      }
      setTimeout(() => spawnPotatoAtFire(msg), 100);
      setTimeout(() => {
        setFeedMessages((prev) => prev.map((x) => (x.id === id ? { ...x, fading: true } : x)));
        setTimeout(
          () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
          400,
        );
      }, 6500);
    },
    [draftMessage, myNick, silhouettes, mySilhouetteIdx, spawnPotatoAtFire],
  );

  const fireIntensity = Math.min(1.5, 0.85 + pile.length * 0.04);

  return (
    <div className="stage">
      <StarrySky />
      <NightField />
      <div className={styles.fogLayer} />

      {/* Header — meta 만, 타이틀은 화면을 깔끔하게 비움 */}
      <div className={styles.header}>
        <div className={styles.meta}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>지금 모닥불 옆</span>
            <span className={styles.metaValue}>
              <span className={styles.liveDot} />
              {onlineCount}명
            </span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>오늘 구워진 고구마</span>
            <span className={styles.metaValue}>{totalBurned.toLocaleString()}개</span>
          </div>
        </div>
      </div>

      {/* Side feed — quiet whispers heard around the fire */}
      <div className={styles.feed}>
        {feedMessages.map((m) => (
          <div
            key={m.id}
            className={`${styles.feedItem} ${m.fading ? styles.fading : ''}`}
          >
            <div className={styles.feedNick}>{m.nick}</div>
            <div className={styles.feedText}>{m.text}</div>
          </div>
        ))}
      </div>

      {/* Comfort */}
      {comfortMsg && (
        <div className={styles.comfort} key={comfortMsg.key}>
          <div className={styles.comfortQuote}>{comfortMsg.kr}</div>
        </div>
      )}

      {/* Silhouettes — 토글로 숨길 수 있음 */}
      <div className={styles.silhouettes} style={{ opacity: showPeople ? 1 : 0, transition: 'opacity 0.4s ease' }}>
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
              {s.nick.slice(0, 16)}
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

      {/* Bonfire zone — clicking it boosts roasting (easter egg) */}
      <div
        ref={fireRef}
        className={`${styles.bonfireZone} ${shake ? styles.shake : ''}`}
        onClick={pokeFire}
      >
        <Campfire width={280} fireIntensity={fireIntensity} />

        {/* Roasting potatoes */}
        <div className={styles.potatoRow}>
          {pile.map((p) => {
            const slot = POTATO_SLOTS[p.slotIdx % POTATO_SLOTS.length];
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

        {/* Animated flames — radial-gradient teardrops, tall and narrow,
            multiple layers + aggressive leap = 활활 타오르는 캠프파이어 */}
        <div
          className={styles.campfireFlames}
          style={{ ['--intensity' as string]: fireIntensity } as React.CSSProperties}
        >
          <div className={`${styles.flame} ${styles.fHaze}`} />
          <div className={`${styles.flame} ${styles.fBackL}`} />
          <div className={`${styles.flame} ${styles.fBackR}`} />
          <div className={`${styles.flame} ${styles.fBack}`} />
          <div className={`${styles.flame} ${styles.fMid}`} />
          <div className={`${styles.flame} ${styles.fFront}`} />
          <div className={`${styles.flame} ${styles.fCore}`} />
          <div className={`${styles.flame} ${styles.fInner}`} />
        </div>

      </div>

      {/* Input */}
      <div className={styles.inputZone}>
        {throttleNotice && (
          <div className={styles.throttleNotice}>{throttleNotice}</div>
        )}
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
          <span className={styles.nick}>{myNick}</span>
          <button
            type="button"
            className={styles.iconToggle}
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            title={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted ? (
              // mute (사선 있는 스피커)
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 6h2.5L8 4v8L5.5 10H3V6z" fill="currentColor" />
                <path d="M11.5 6.5l3 3M14.5 6.5l-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              // sound on (스피커 + 음파)
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 6h2.5L8 4v8L5.5 10H3V6z" fill="currentColor" />
                <path d="M11 5.5c1 .8 1 4.2 0 5M13 4c1.6 1.4 1.6 6.6 0 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className={styles.iconToggle}
            onClick={() => setShowPeople((s) => !s)}
            aria-label={showPeople ? '사람 숨기기' : '사람 보이기'}
            title={showPeople ? '사람 숨기기' : '사람 보이기'}
          >
            {showPeople ? (
              // people on (두 사람)
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="5" r="2" />
                <circle cx="11" cy="5" r="2" />
                <path d="M2 13c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5H2zM8 13c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5H8z" />
              </svg>
            ) : (
              // people off (두 사람 + 사선)
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <g fill="currentColor" opacity="0.5">
                  <circle cx="5" cy="5" r="2" />
                  <circle cx="11" cy="5" r="2" />
                  <path d="M2 13c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5H2zM8 13c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5H8z" />
                </g>
                <path d="M2 14L14 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className={styles.grain} />
    </div>
  );
}
