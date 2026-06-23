'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Campfire } from '@/components/Campfire/Campfire';
import { SweetPotato } from '@/components/SweetPotato/SweetPotato';
import { PersonSilhouette } from '@/components/PersonSilhouette/PersonSilhouette';
import { StarrySky, makeStars } from '@/components/StarrySky/StarrySky';
import { NightField } from '@/components/NightField/NightField';
import { useMeteorGame } from '@/components/MeteorGame/useMeteorGame';
import { MeteorOverlay } from '@/components/MeteorGame/MeteorOverlay';
import { useJumpGame } from '@/components/JumpGame/useJumpGame';
import { JumpGameOverlay } from '@/components/JumpGame/JumpGameOverlay';
import { HotAirBalloon } from '@/components/HotAirBalloon/HotAirBalloon';
import TouchControls from '@/components/TouchControls/TouchControls';
import {
  CampfireFlames,
  type CampfireFlamesHandle,
} from '@/components/CampfireFlames/CampfireFlames';
import { HeadFire } from '@/components/CampfireFlames/HeadFire';
import { makeNickname } from '@/lib/nickname';
import { PLACEHOLDER_LINES } from '@/lib/data/placeholder-lines';
import { COMFORT_LINES, type ComfortLine } from '@/lib/data/comfort-lines';
import { AudioEngine } from '@/lib/audio/audio-engine';
import {
  connectRealtime,
  isRealtimeConfigured,
  type RealtimeClient,
  type RealtimeStatus,
} from '@/lib/realtime/client';
import { buildMyEntity, mergeSilhouettes } from '@/lib/realtime/presence';
import { sampleAt, prune, type PeerSnapshot } from '@/lib/realtime/interpolate';
import { api } from '@/lib/api';
import type {
  ChatMessage,
  PotatoState,
  SilhouetteEntity,
  ActiveBubble,
} from '@/lib/types';
import styles from './BonfireScene.module.css';

const ROAST_DURATION_MS = 18000;
const CRACK_DURATION_MS = 2400;
const POKE_BOOST = 0.18;
const MAX_POTATOES = 7;

// === NPC 모닥지기 — 이스터에그를 모르는 사람들을 위해 주기적 가이드. ===
// 모든 클라이언트가 Date.now() 기반으로 같은 메시지를 같은 시점에 보임(서버 변경 없이 동기화).
const NPC_NICK = '모닥지기';
const NPC_SPOT = { x: 72, y: 10, variant: 3, scale: 0.6 } as const;
const NPC_INTERVAL_MS = 60_000; // 메시지 간격
const NPC_BUBBLE_VISIBLE_MS = 10_000; // 버블 표시 지속
const NPC_MESSAGES = [
  '방향키로 캐릭터를 움직일 수 있어요. 스페이스바를 누르면 점프해요.',
  '오른쪽 위 달을 한 번 눌러보세요. 별똥별 피하기 게임이 시작돼요.',
  '달 옆에 큼직한 별 하나가 있어요. 누르면 별똥별 리더보드를 볼 수 있어요.',
  '왼쪽 위 열기구를 누르면 끝없이 올라가는 점프맵이 시작돼요.',
  '열기구 옆 작은 구름을 누르면 점프맵 리더보드를 볼 수 있어요.',
  '모닥불을 한 번 눌러보세요. 불멍가루가 흩날리고, 직후 통과하면 머리에 무지개 불이 붙어요.',
  '메시지는 어디에도 저장되지 않아요. 마음 편히 한 마디 던지고 가세요.',
];

// 별똥별 게임 카운트다운에서 보여주는 키보드 일러스트 스타일.
const meteorKeyStyle: React.CSSProperties = {
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
const meteorKeyEmpty: React.CSSProperties = { width: 36, height: 36 };

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
  const [shake, setShake] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showPeople, setShowPeople] = useState(true);
  const [audioStarted, setAudioStarted] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [realtimeBlocked, setRealtimeBlocked] = useState(false);
  const [totalBurned, setTotalBurned] = useState(0);
  const [placeholder, setPlaceholder] = useState<string>(PLACEHOLDER_LINES[0]);
  const [draftMessage, setDraftMessage] = useState('');
  const [myNick] = useState(() => makeNickname());
  const [silhouettes, setSilhouettes] = useState<SilhouetteEntity[]>([]);
  const [activeBubbles, setActiveBubbles] = useState<Record<string, ActiveBubble>>({});
  const [pile, setPile] = useState<PotatoState[]>([]);
  // 내 자리 인덱스 — 세션 시작 후 첫 silhouettes 생성 시 랜덤 선택해서 고정
  const [mySilhouetteIdx, setMySilhouetteIdx] = useState<number | null>(null);
  // 이스터에그: 방향키로 본인 캐릭터 이동, 스페이스바로 점프. 로컬 전용 (presence 동기화 X).
  // setState 안 거치고 ref 로 DOM 직접 갱신 — 매 프레임 리렌더 없어 점프 낙하 시 jitter 안 생김.
  const myCharRef = useRef<HTMLDivElement | null>(null);
  // motion 을 ref 로 노출 — 별똥별 게임의 충돌 판정에서 캐릭터 위치 읽음.
  const motionRef = useRef({
    dx: 0,
    dy: 0,
    yJump: 0,
    vy: 0,
    jumping: false,
    keys: new Set<string>(),
  });
  const joystickRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  // 다른 접속자들의 motion (broadcast 수신) — 수신 시각 스냅샷 버퍼를 RENDER_DELAY 만큼 지연
  // 재생해 등속 이동을 등속 직선으로 복원(시간기반 보간). 외삽은 방향 전환 오버슈팅 때문에 안 씀.
  type PeerMotion = { dx: number; dy: number; yJump: number };
  const peerBufRef = useRef<Map<string, PeerSnapshot[]>>(new Map()); // 수신 스냅샷 버퍼
  const peerElsRef = useRef<Map<string, HTMLDivElement>>(new Map()); // silhouette DOM
  const peerFlipRef = useRef<Map<string, boolean>>(new Map()); // flip flag 캐시
  const peerSpotYRef = useRef<Map<string, number>>(new Map()); // spot.y 캐시 (z-index 계산용)
  // 내 motion 의 직전 송신값 — 변화 없으면 송신 안 함(가만 있을 때 트래픽 0).
  const lastSentMotionRef = useRef<PeerMotion | null>(null);

  // 하늘의 별 데이터 — StarrySky 표시용.
  const skyStars = useMemo(() => makeStars(180), []);

  const fireRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 캠프파이어 불꽃(캔버스) ref — 모닥불 클릭 시 splash 트리거
  const campfireFlamesRef = useRef<CampfireFlamesHandle | null>(null);
  // 가장 최근 splash 종료 시점 (불멍가루 활성 중인지 알기 위함)
  const splashUntilRef = useRef(0);
  // 본인 캐릭터가 모닥불 zone 안에 있는지 (진입 감지용)
  const inBonfireZoneRef = useRef(false);
  // 머리 위 불꽃 이스터에그 — 캐릭터가 모닥불 통과 시 5초 지속
  const [headFire, setHeadFire] = useState<{ rainbow: boolean } | null>(null);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const headFireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // NPC 모닥지기 가이드 버블 (시간 기반 로테이션)
  const [npcBubble, setNpcBubble] = useState<{ text: string; key: number } | null>(null);
  // 다른 접속자들의 머리 불 — broadcast 수신. on/off 가 5초 단위라 state 로 충분.
  const [peerHeadFires, setPeerHeadFires] = useState<Record<string, { rainbow: boolean }>>({});
  // 도배 방지용 — 마지막 보낸 메시지 텍스트와 시각, 직전 N초 내 보낸 횟수
  const lastSentRef = useRef<{ text: string; at: number; recent: number[] }>({
    text: '',
    at: 0,
    recent: [],
  });
  const [throttleNotice, setThrottleNotice] = useState<string | null>(null);
  const messageIdRef = useRef(1);
  const potatoIdRef = useRef(1);
  // 본인이 spawn한 고구마 id들 — 익으면 inc_burned() RPC 발사 후 set에서 제거.
  // 다른 사람이 보낸 메시지로 spawn된 고구마는 여기 안 들어가서 우리가 카운트 안 함
  // (그쪽 sender가 카운트). 결과적으로 메시지 1개당 정확히 1번 카운트.
  const myPotatoIdsRef = useRef<Set<number>>(new Set());
  // 실시간 클라이언트 (broadcast + presence)
  const realtimeRef = useRef<RealtimeClient | null>(null);
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

  // === 별똥별 게임 (이스터에그) — 훅에 다 위임 ===
  const meteor = useMeteorGame({
    myNick,
    spotRef: mySpotRef,
    motionRef,
  });

  // === 우주를 줄게 점프맵 (이스터에그) ===
  const jump = useJumpGame({ myNick });

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
      // 본인이 쳤을 때만 my pending set에 추가 (다 익으면 내가 카운트).
      // updater 안에서 처리해야 React 18 setState 비동기성에 안 휘말림.
      // (예전엔 outer flag로 했더니 setPile 호출 끝난 시점엔 updater가 아직
      //  안 돌아가서 flag가 false로 보여 카운팅이 누락됨.)
      // StrictMode 더블콜에도 Set.add는 idempotent라 안전.
      if (msg.isMe) myPotatoIdsRef.current.add(id);
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

      if (nick) {
        const bubbleKey = Date.now() + Math.random();
        setActiveBubbles((prev) => ({ ...prev, [nick]: { text, key: bubbleKey } }));
        setTimeout(() => {
          setActiveBubbles((prev) => {
            if (prev[nick]?.key === bubbleKey) {
              const next = { ...prev };
              delete next[nick];
              return next;
            }
            return prev;
          });
        }, 6000);
      }

      setFeedMessages((prev) => [msg, ...prev].slice(0, 4));
      setTimeout(() => spawnPotatoAtFire(msg), 150 + Math.random() * 250);
      setTimeout(
        () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
        8200,
      );
    },
    [spawnPotatoAtFire],
  );

  // silhouettes ref 동기화 — broadcast 핸들러에서 최신값 읽기 위함
  useEffect(() => {
    silhouettesRef.current = silhouettes;
  }, [silhouettes]);

  useEffect(() => {
    let lastWidth = window.innerWidth;
    const onResize = () => {
      const newWidth = window.innerWidth;
      if (newWidth === lastWidth) return;
      const oldWidth = lastWidth;
      lastWidth = newWidth;
      const oldCw = Math.min(1100, oldWidth);
      const newCw = Math.min(1100, newWidth);
      const oldCL = (oldWidth - oldCw) / 2;
      const newCL = (newWidth - newCw) / 2;
      const deltaFor = (sx: number) =>
        (oldCL - newCL) + (sx / 100) * (oldCw - newCw);

      const spot = mySpotRef.current;
      if (spot) motionRef.current.dx += deltaFor(spot.x);

      silhouettesRef.current.forEach((s) => {
        const d = deltaFor(s.x);
        const buf = peerBufRef.current.get(s.nick);
        if (buf) for (const snap of buf) snap.dx += d;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.load) return;
    document.fonts.load('800 200px Pretendard').catch(() => {});
    document.fonts.load('700 42px Pretendard').catch(() => {});
    document.fonts.load('600 18px Pretendard').catch(() => {});
    document.fonts.load('400 14px Pretendard').catch(() => {});
  }, []);

  useEffect(() => {
    if (!mySpotRef.current) return;
    const me = buildMyEntity(mySpotRef.current, myNick);
    setSilhouettes((prev) => (prev.length ? prev : [me]));
    setMySilhouetteIdx((prev) => (prev === null ? 0 : prev));
    if (!isRealtimeConfigured()) setRealtimeBlocked(true);
  }, [myNick]);

  // === 실시간: broadcast (메시지) + presence (접속자/실루엣) ===
  useEffect(() => {
    if (!isRealtimeConfigured() || !mySpotRef.current) return;

    const applyPeers = (state: Record<string, unknown>) => {
      const me = buildMyEntity(mySpotRef.current!, myNick);
      const newSilhouettes = mergeSilhouettes(me, state, myNick);
      setSilhouettes(newSilhouettes);
      setOnlineCount(newSilhouettes.length);
      setMySilhouetteIdx(0);
      // peer motion 버퍼 정리 + flip 캐시 갱신 (RAF 가 이걸 읽어 transform 합성)
      const valid = new Set(newSilhouettes.map((s) => s.nick));
      for (const nick of peerBufRef.current.keys()) {
        if (!valid.has(nick)) peerBufRef.current.delete(nick);
      }
      peerFlipRef.current.clear();
      peerSpotYRef.current.clear();
      for (const s of newSilhouettes) {
        if (s.nick !== myNick) {
          peerFlipRef.current.set(s.nick, s.flip);
          peerSpotYRef.current.set(s.nick, s.y);
        }
      }
      // 떠난 사람의 headFire 도 정리.
      setPeerHeadFires((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [nick, h] of Object.entries(prev)) {
          if (valid.has(nick)) next[nick] = h;
          else changed = true;
        }
        return changed ? next : prev;
      });
      // 떠난 사람의 말풍선도 정리 (유령 버블 방지).
      setActiveBubbles((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [nick, b] of Object.entries(prev)) {
          if (valid.has(nick)) next[nick] = b;
          else changed = true;
        }
        return changed ? next : prev;
      });
    };

    let blockTimer: ReturnType<typeof setTimeout> | null = null;
    const onStatus = (status: RealtimeStatus) => {
      if (status === 'open') {
        if (blockTimer) {
          clearTimeout(blockTimer);
          blockTimer = null;
        }
        setRealtimeBlocked(false);
      } else if (!blockTimer) {
        blockTimer = setTimeout(() => {
          setRealtimeBlocked(true);
          blockTimer = null;
        }, 9000);
      }
    };

    const client = connectRealtime(sessionIdRef.current ?? myNick, {
      onBroadcast: (event, payload) => {
        if (event === 'msg') {
          const data = payload as { nick: string; text: string };
          if (!data?.nick || !data?.text) return;
          if (data.nick === myNick) return;
          const sList = silhouettesRef.current;
          const sIdx = sList.findIndex((s) => s.nick === data.nick);
          pushMessageFromCrowd({ text: data.text, nick: data.nick, sIdx });
        } else if (event === 'counter') {
          const data = payload as { count: number | string };
          const n =
            typeof data?.count === 'number'
              ? data.count
              : parseInt(String(data?.count ?? ''), 10);
          if (!isNaN(n)) setTotalBurned((prev) => Math.max(prev, n));
        } else if (event === 'motion') {
          const data = payload as {
            nick: string;
            dx: number;
            dy: number;
            yJump: number;
          };
          if (!data?.nick || data.nick === myNick) return;
          const buf = peerBufRef.current.get(data.nick) ?? [];
          buf.push({
            t: performance.now(),
            dx: data.dx,
            dy: data.dy,
            yJump: data.yJump,
          });
          if (buf.length > 8) buf.shift();
          peerBufRef.current.set(data.nick, buf);
        } else if (event === 'splash') {
          // 다른 사람의 불멍가루 splash — 위치는 각자 화면 모닥불 중앙에 트리거.
          const data = payload as { nick: string };
          if (!data?.nick || data.nick === myNick) return;
          campfireFlamesRef.current?.splash(
            window.innerWidth / 2,
            window.innerHeight * 0.6,
          );
        } else if (event === 'headfire') {
          const data = payload as {
            nick: string;
            active: boolean;
            rainbow: boolean;
          };
          if (!data?.nick || data.nick === myNick) return;
          setPeerHeadFires((prev) => {
            if (data.active) {
              return { ...prev, [data.nick]: { rainbow: data.rainbow } };
            }
            if (!(data.nick in prev)) return prev;
            const next = { ...prev };
            delete next[data.nick];
            return next;
          });
        }
      },
      onPresence: applyPeers,
      onStatus,
    });
    if (!client) return;
    realtimeRef.current = client;
    client.track({
      nick: myNick,
      x: mySpotRef.current.x,
      y: mySpotRef.current.y,
      scale: mySpotRef.current.scale,
      flip: mySpotRef.current.flip,
      variant: mySpotRef.current.variant,
      joinedAt: mySpotRef.current.joinedAt,
    });

    const onLeave = () => client.close();
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
      if (blockTimer) clearTimeout(blockTimer);
      realtimeRef.current = null;
      client.close();
    };
  }, [myNick, pushMessageFromCrowd]);

  // === 본인 motion 20Hz broadcast — 변화 없으면 송신 안 함. 보간 없이 즉시 적용해 지연 최소화. ===
  useEffect(() => {
    if (!isRealtimeConfigured()) return;
    const id = setInterval(() => {
      const client = realtimeRef.current;
      if (!client) return;
      const m = motionRef.current;
      const last = lastSentMotionRef.current;
      if (
        last &&
        Math.abs(last.dx - m.dx) < 0.1 &&
        Math.abs(last.dy - m.dy) < 0.1 &&
        Math.abs(last.yJump - m.yJump) < 0.1
      ) {
        return;
      }
      client.send('motion', {
        nick: myNick,
        dx: m.dx,
        dy: m.dy,
        yJump: m.yJump,
      });
      lastSentMotionRef.current = { dx: m.dx, dy: m.dy, yJump: m.yJump };
    }, 50);
    return () => clearInterval(id);
  }, [myNick]);

  // === 다른 사람 motion 시간기반 보간 — 'now - RENDER_DELAY' 시점을 수신 스냅샷 사이
  // 선형보간해 60fps 로 렌더. 도착 간격(jitter) 과 무관하게 등속 이동이 등속 직선으로 복원됨.
  // RENDER_DELAY 는 의도적 지연 버퍼(딜레이보다 부드러움 우선). 외삽은 안 씀. ===
  useEffect(() => {
    let raf = 0;
    const RENDER_DELAY = 100;
    const step = () => {
      const bufs = peerBufRef.current;
      const els = peerElsRef.current;
      const flips = peerFlipRef.current;
      const renderTime = performance.now() - RENDER_DELAY;
      for (const [nick, buf] of bufs) {
        prune(buf, renderTime);
        const n = sampleAt(buf, renderTime);
        if (!n) continue;
        const el = els.get(nick);
        if (el) {
          const flipPart = flips.get(nick) ? 'scaleX(-1)' : '';
          const yOff = -(n.dy + n.yJump);
          el.style.transform = `translate(${n.dx.toFixed(1)}px, ${yOff.toFixed(1)}px) ${flipPart}`;
          // 모닥불 깊이: 180 + spot.y + dy < 270 이면 불 앞(z25), 아니면 뒤(z8)
          const spotY = peerSpotYRef.current.get(nick) ?? 0;
          el.style.zIndex = 180 + spotY + n.dy < 270 ? '25' : '8';
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // === NPC 모닥지기 가이드 로테이션 — 첫 메시지는 10초 뒤, 이후 60초 경계에 맞춰 ===
  // Math.floor(Date.now()/INTERVAL) 인덱스라 모든 클라이언트가 같은 메시지를 같은 시점에 봄.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const showCurrent = () => {
      const idx = Math.floor(Date.now() / NPC_INTERVAL_MS) % NPC_MESSAGES.length;
      setNpcBubble({ text: NPC_MESSAGES[idx], key: Date.now() });
      timers.push(setTimeout(() => setNpcBubble(null), NPC_BUBBLE_VISIBLE_MS));
    };
    timers.push(
      setTimeout(() => {
        showCurrent();
        const align = NPC_INTERVAL_MS - (Date.now() % NPC_INTERVAL_MS);
        const loop = () => {
          showCurrent();
          timers.push(setTimeout(loop, NPC_INTERVAL_MS));
        };
        timers.push(setTimeout(loop, align));
      }, 10_000),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // === 오늘 구워진 고구마 카운터 — 마운트 시 fetch만, 갱신은 campfire-room broadcast로 ===
  useEffect(() => {
    if (!isRealtimeConfigured()) return;
    let cancelled = false;
    void api
      .counterToday()
      .then((n) => {
        if (!cancelled && !isNaN(n)) setTotalBurned(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // === 본인 고구마가 pile에서 사라지면(=다 익어 사라지거나 evict됨) 그때 카운트 +1 ===
  // pile.length가 아니라 ID 집합 변화에 반응해야 함.
  // 이유: MAX_POTATOES 도달 시 cracked 한 개 evict + 새 spawn 하면 length 동일(7→7)
  // 인데 id는 바뀌니, length만 보면 evict된 내 고구마 카운트가 누락됨.
  const pileIdsKey = pile.map((p) => p.id).join(',');
  useEffect(() => {
    const currentIds = new Set(pile.map((p) => p.id));
    const disappearedMine: number[] = [];
    for (const id of myPotatoIdsRef.current) {
      if (!currentIds.has(id)) disappearedMine.push(id);
    }
    if (disappearedMine.length === 0) return;
    for (const id of disappearedMine) myPotatoIdsRef.current.delete(id);
    if (!isRealtimeConfigured()) return;
    for (const _ of disappearedMine) {
      void api
        .incBurned()
        .then((n) => {
          if (isNaN(n)) return;
          setTotalBurned((prev) => Math.max(prev, n));
          realtimeRef.current?.send('counter', { count: n });
        })
        .catch(() => {});
    }
    // pile 자체가 아니라 pileIdsKey로 dep 잡아 roast 진행 frame엔 무시
    // (length만 보면 evict+spawn 동시 발생 시 missed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pileIdsKey]);

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

  // embers 솟구침은 CampfireFlames 캔버스가 담당 — 기존 div 기반 ember 시스템 제거.

  // === ROAST TICKER ===
  // wall-clock 기반 (placedAt 시점부터 경과한 실제 시간으로 roast 계산).
  // RAF만 쓰면 백그라운드 탭에서 멈춰서 → roast 진행 안 됨 → cracked 안 됨 → pile에서
  // 안 사라짐 → pileIdsKey 변화 없음 → inc_burned 호출 누락 → 카운팅 안 됨.
  // 그래서 setInterval 백업 동시에 돌림 (백그라운드에서도 ~1Hz throttle 되긴 해도 fire됨).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      setPile((prev) => {
        if (prev.length === 0) return prev;
        const next: PotatoState[] = [];
        for (const p of prev) {
          if (p.cracked) {
            if (now - p.crackedAt > CRACK_DURATION_MS) continue;
            next.push(p);
            continue;
          }
          const elapsed = now - p.placedAt;
          const newRoast = Math.min(1, elapsed / ROAST_DURATION_MS);
          if (newRoast >= 1) {
            next.push({ ...p, roast: 1, cracked: true, crackedAt: now });
          } else {
            next.push({ ...p, roast: newRoast });
          }
        }
        return next;
      });
    };
    // 매 RAF 마다 setPile 호출하면 7개 SweetPotato 가 60Hz 로 재렌더 → main thread 부하 ↑.
    // 같은 thread 의 불꽃 RAF callback 지연됨. 30Hz 로 throttle.
    let lastTickAt = 0;
    const loop = (now: number) => {
      if (now - lastTickAt > 80) {
        // ~12Hz — roast 진행은 18 초라 step 차이 0.45% / tick, 시각적으로 충분히 부드럽고
        // 매 RAF 마다 React reconciliation 안 일어나서 불꽃 RAF main-thread 여유 확보.
        lastTickAt = now;
        tick();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const bgInterval = setInterval(tick, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(bgInterval);
    };
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

  // === 첫 진입 시 입력창에 포커스 (모바일은 브라우저가 막을 수 있음) ===
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // === Enter: 입력창에 포커스 없을 때 채팅창으로 점프 (idle 일 때만) ===
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (meteor.gameState !== 'idle' || jump.gameState !== 'idle') return;
      if (document.activeElement === inputRef.current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [meteor.gameState, jump.gameState]);

  const triggerJump = useCallback(() => {
    const m = motionRef.current;
    if (!m.jumping) {
      m.vy = 0.95;
      m.jumping = true;
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarsePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // === EASTER EGG: 방향키 이동 + 스페이스바 점프 ===
  // 본인 화면에서만 (presence 업데이트 안 함). 채팅 입력창 blur 일 때만 키 인식.
  // 대각선은 두 키 동시 입력 시 자동 정규화 (대각선이 더 빠르지 않게).
  useEffect(() => {
    // 점프 게임 중에는 모닥불 옆 silhouette motion 비활성 (같은 키를 점프 게임이 처리).
    if (jump.gameState !== 'idle') return;
    const motion = motionRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const isMoveKey =
        k === 'ArrowLeft' ||
        k === 'ArrowRight' ||
        k === 'ArrowUp' ||
        k === 'ArrowDown' ||
        k === ' ';
      if (!isMoveKey) return;
      const input = inputRef.current;
      // 입력창에 텍스트가 있으면 채팅용으로 양보 (커서 이동/스페이스 입력).
      // 비어있으면 자동으로 blur 시키고 캐릭터 조작.
      if (input && document.activeElement === input) {
        if (input.value !== '') return;
        input.blur();
      }
      e.preventDefault();
      motion.keys.add(k);
      if (k === ' ') triggerJump();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      motion.keys.delete(e.key);
    };
    const onBlur = () => motion.keys.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    let raf = 0;
    let last = performance.now();
    const SPEED = 0.28;
    const GRAVITY = 0.0038;

    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;

      let kx = 0;
      let ky = 0;
      const joy = joystickRef.current;
      if (joy.active) {
        kx = joy.x;
        ky = joy.y;
      } else {
        if (motion.keys.has('ArrowLeft')) kx -= 1;
        if (motion.keys.has('ArrowRight')) kx += 1;
        if (motion.keys.has('ArrowUp')) ky += 1;
        if (motion.keys.has('ArrowDown')) ky -= 1;
        if (kx !== 0 && ky !== 0) {
          const k = Math.SQRT1_2;
          kx *= k;
          ky *= k;
        }
      }
      motion.dx += kx * SPEED * dt;
      motion.dy += ky * SPEED * dt;

      // === 화면 안 / 땅 위로 clamp ===
      // silhouettes 컨테이너:
      //   width: min(1100, sw), left: 50%, translateX(-50%), bottom: 180px
      // silhouette의 s.x % 는 컨테이너 너비 기준이고, s.y(=spot.y) 는 컨테이너 bottom(=180px) 기준.
      // 화면 절대좌표로 환산해서 clamp.
      const spot = mySpotRef.current;
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const cw = Math.min(1100, sw);
      const containerLeft = (sw - cw) / 2;
      const containerBottom = 180;
      const MARGIN_X = 40;                 // 캐릭터 너비 절반
      // NightField 그라데이션: top 0~38% transparent(하늘), 38~62% fade, 62~100% 땅.
      // 캐릭터 발이 "땅 색이 시작되는 선"(top 62% = bottom 38%) 위로 가지 못하게.
      // 그 위는 fade zone 이라 시각적으로 이미 "땅 위에 떠 있는" 느낌.
      const SKY_BOTTOM_RATIO = 0.38;
      const skyBottomPx = sh * SKY_BOTTOM_RATIO;

      if (spot) {
        const charCenterX = containerLeft + (spot.x / 100) * cw;
        // 좌우 — base 가 어디든 브라우저 창의 좌·우 끝까지 도달 가능.
        const dxMin = MARGIN_X - charCenterX;
        const dxMax = sw - MARGIN_X - charCenterX;
        const dyMin = -spot.y - 80;                             // 컨테이너 바닥보다 80px 아래까지
        const dyMax = skyBottomPx - containerBottom - spot.y;   // 발이 땅 선 못 넘게
        motion.dx = Math.max(dxMin, Math.min(dxMax, motion.dx));
        motion.dy = Math.max(dyMin, Math.min(dyMax, motion.dy));
      }

      // 점프는 dy 한계와 무관하게 자유 — 땅 선에서 점프해도 잠깐 위로 갔다가 자연 낙하.
      // 천장 cap 안 검: cap 으로 vy=0 잘라버리면 정점이 갑자기 끝나서 "확 떨어지는" 느낌이 남.
      // 안 자르면 올라간 시간 = 떨어진 시간 대칭.
      if (motion.jumping) {
        motion.vy -= GRAVITY * dt;
        motion.yJump += motion.vy * dt;
        if (motion.yJump <= 0) {
          motion.yJump = 0;
          motion.vy = 0;
          motion.jumping = false;
        }
      }

      // ref 로 DOM 직접 갱신 — setState 안 거쳐서 다른 setState(roast pile 등)와의
      // batch/timing 충돌 없이 매끄러움.
      if (myCharRef.current && spot) {
        myCharRef.current.style.transform = `translate(${motion.dx}px, ${
          -(motion.dy + motion.yJump)
        }px)`;
        // 모닥불 깊이 처리 — 본인 캐릭터 base viewport bottom (silhouettes container 180 + spot.y + dy).
        // 270 (모닥불 base) 보다 작으면 불 앞(z 25), 크면 불 뒤(z 8).
        const charBottomY = 180 + spot.y + motion.dy;
        myCharRef.current.style.zIndex = charBottomY < 270 ? '25' : '8';

        // === 머리 위 불 이스터에그 — 캐릭터가 모닥불 zone 안 지나가면 점화 ===
        // 화면 좌표 계산: silhouettes container (1100 max-width, center) 안 spot.x % + dx.
        const sw = window.innerWidth;
        const cw = Math.min(1100, sw);
        const containerLeft = (sw - cw) / 2;
        const charScreenX = containerLeft + (spot.x / 100) * cw + motion.dx;
        // 모닥불 zone: 화면 center ±60 (실제 통나무 폭에 가깝게).
        const bonfireCenter = sw / 2;
        const xIn = Math.abs(charScreenX - bonfireCenter) < 60;
        // 캐릭터 발이 통나무 위 좁은 영역 안.
        const charBottomWithJump = 180 + spot.y + motion.dy + motion.yJump;
        const yIn = charBottomWithJump > 255 && charBottomWithJump < 310;
        const inZone = xIn && yIn;
        if (inZone && !inBonfireZoneRef.current) {
          inBonfireZoneRef.current = true;
          // splash 활성 중이면 무지개. 아니면 일반 주황.
          const rainbow = splashUntilRef.current > performance.now();
          setHeadFire({ rainbow });
          realtimeRef.current?.send('headfire', {
            nick: myNick,
            active: true,
            rainbow,
          });
          if (headFireTimerRef.current) clearTimeout(headFireTimerRef.current);
          headFireTimerRef.current = setTimeout(() => {
            setHeadFire(null);
            realtimeRef.current?.send('headfire', {
              nick: myNick,
              active: false,
              rainbow: false,
            });
          }, 5000);
        } else if (!inZone) {
          inBonfireZoneRef.current = false;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      cancelAnimationFrame(raf);
    };
  }, [jump.gameState, triggerJump]);

  // === poke fire (easter egg: tap the campfire to roast faster + 불멍가루 splash) ===
  const pokeFire = useCallback((e?: React.MouseEvent<HTMLDivElement>) => {
    AudioEngine.ensure();
    setShake(true);
    setTimeout(() => setShake(false), 220);
    // 불꽃에 무지개 splash — 모닥불 zone 클릭에서만 발동
    if (e) {
      campfireFlamesRef.current?.splash(e.clientX, e.clientY);
    } else {
      campfireFlamesRef.current?.splash(window.innerWidth / 2, window.innerHeight * 0.6);
    }
    // splash 지속 시간 5초 동안 머리 불 색이 무지개로 붙음.
    splashUntilRef.current = performance.now() + 5000;
    // 다른 접속자에게도 동일하게 splash 보임 (위치는 각자 화면 중앙).
    realtimeRef.current?.send('splash', { nick: myNick });
    // roast가 placedAt 기반이라 직접 못 더함 — placedAt을 앞당겨서 시뮬레이션.
    setPile((prev) =>
      prev.map((p) => {
        if (p.cracked) return p;
        const now = performance.now();
        const newPlacedAt = p.placedAt - POKE_BOOST * ROAST_DURATION_MS;
        const elapsed = now - newPlacedAt;
        const newRoast = Math.min(1, elapsed / ROAST_DURATION_MS);
        if (newRoast >= 1) {
          return { ...p, placedAt: newPlacedAt, roast: 1, cracked: true, crackedAt: now };
        }
        return { ...p, placedAt: newPlacedAt, roast: newRoast };
      }),
    );
    // pokeFire 시 부가 ember burst 는 CampfireFlames 의 splash 효과로 대체.
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
        setActiveBubbles((prev) => ({ ...prev, [myNick]: { text, key: bubbleKey } }));
        setTimeout(() => {
          setActiveBubbles((prev) => {
            if (prev[myNick]?.key === bubbleKey) {
              const next = { ...prev };
              delete next[myNick];
              return next;
            }
            return prev;
          });
        }, 6000);
      }
      setFeedMessages((prev) => [{ ...msg, nick: msg.nick + ' (나)' }, ...prev].slice(0, 4));
      realtimeRef.current?.send('msg', { nick: myNick, text });
      setTimeout(() => spawnPotatoAtFire(msg), 100);
      setTimeout(
        () => setFeedMessages((prev) => prev.filter((x) => x.id !== id)),
        8200,
      );
    },
    [draftMessage, myNick, silhouettes, mySilhouetteIdx, spawnPotatoAtFire],
  );

  const fireIntensity = Math.min(1.5, 0.85 + pile.length * 0.04);

  // 점프맵 진행 중 카메라 따라 메인 씬(stage 안 sceneShift wrapper) 만 아래로 밀려
  // 위로 올라가는 효과. JumpGameOverlay/MeteorOverlay 는 wrapper 밖이라 영향 없음.
  const sceneShiftRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sceneShiftRef.current;
    if (jump.gameState !== 'playing' && jump.gameState !== 'gameover') {
      if (el) {
        el.style.transform = '';
        el.style.maskImage = '';
        el.style.webkitMaskImage = '';
      }
      return;
    }
    // 점프 중 — 메인 씬 위쪽을 페이드해 끝선이 드러나지 않게.
    // 캐릭터가 올라가면 메인 씬이 카메라 따라 내려가는데, 유한한 씬의 위쪽 끝과
    // 점프 배경 사이에 경계선이 생기던 것을 mask 로 부드럽게 사라지게 함.
    if (el) {
      const fade = 'linear-gradient(0deg, #000 0%, #000 68%, transparent 92%)';
      el.style.maskImage = fade;
      el.style.webkitMaskImage = fade;
    }
    return jump.registerFrameListener(() => {
      if (sceneShiftRef.current) {
        sceneShiftRef.current.style.transform = `translate3d(0, ${jump.cameraYRef.current}px, 0)`;
      }
    });
  }, [jump.gameState, jump.registerFrameListener, jump.cameraYRef]);

  return (
    <div className="stage">
      <div
        ref={sceneShiftRef}
        style={{
          position: 'absolute',
          inset: 0,
          willChange: 'transform',
        }}
      >
      <StarrySky
        stars={skyStars}
        onMoonClick={() => {
          if (jump.gameState !== 'idle') return;
          if (meteor.gameState !== 'idle') return;
          meteor.start();
        }}
        onLeaderboardClick={meteor.openLeaderboard}
      />
      <NightField />
      <div className={styles.fogLayer} />

      {/* Header — meta 만, 타이틀은 화면을 깔끔하게 비움 */}
      <div className={styles.header}>
        <div className={styles.meta}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>지금 모닥불 옆</span>
            <span className={styles.metaValue}>
              <span
                className={`${styles.liveDot} ${realtimeBlocked ? styles.liveDotOff : ''}`}
              />
              {realtimeBlocked ? '오프라인' : `${onlineCount}명`}
            </span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>오늘 구워진 고구마</span>
            <span className={styles.metaValue}>{totalBurned.toLocaleString()}개</span>
          </div>
        </div>
      </div>

      {realtimeBlocked && (
        <div className={styles.offlineBanner} role="status">
          실시간 연결이 막혀 있어요. 지금은 당신만 보이고, 메시지는 다른 사람에게 전달되지 않아요.
        </div>
      )}

      {/* 모닥불 옆 연기 — 우측 하단에서 위로 떠오르며 흩어지는 속삭임 */}
      <div className={styles.feed} aria-hidden={feedMessages.length === 0}>
        {feedMessages.map((m) => (
          <div key={m.id} className={styles.feedItem}>
            <span className={styles.feedNick}>{m.nick}</span>
            <span className={styles.feedText}>{m.text}</span>
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
        {/* NPC 모닥지기 — 이스터에그 가이드. presence/online count 에 포함되지 않는 고정 자리. */}
        <div
          className={styles.silhouette}
          style={{
            left: `calc(${NPC_SPOT.x}% - 40px)`,
            bottom: NPC_SPOT.y + 'px',
            zIndex: 25,
          }}
        >
          <div
            className={styles.silhouetteNick}
            style={{
              transform: 'translateX(-50%)',
              color: '#ffb84d',
              fontWeight: 600,
            }}
          >
            {NPC_NICK}
          </div>
          <div style={{ filter: 'drop-shadow(0 0 6px rgba(255,184,77,0.4))' }}>
            <PersonSilhouette variant={NPC_SPOT.variant} scale={NPC_SPOT.scale} />
          </div>
          {npcBubble && (
            <div
              className={styles.silhouetteBubble}
              key={npcBubble.key}
              style={{ transform: 'translateX(-50%)', width: 260, maxWidth: 'none' }}
            >
              {npcBubble.text}
            </div>
          )}
        </div>
        {silhouettes.map((s, i) => {
          const isMine = i === mySilhouetteIdx;
          // 점프 게임 active 시 본인 silhouette 은 숨김 — 점프맵 캐릭터가 그 자리에서 시작.
          if (isMine && jump.gameState !== 'idle') return null;
          // 본인은 flip 무시 (정면 유지). 다른 사람 transform 은 RAF lerp 가 매 프레임 DOM 에
          // 직접 세팅 (peerElsRef 에 등록). 첫 렌더 동안은 flip 만 잡아두고, RAF 가 곧 덮어씀.
          const otherTransform = s.flip ? 'scaleX(-1)' : 'none';
          // === 모닥불 깊이 처리 ===
          // silhouettes container bottom 180 + spot.y = silhouette base viewport bottom.
          // 모닥불 통나무 base viewport bottom ~ 270 (bonfireZone bottom 270).
          // silhouette base < 270 → 모닥불 앞 (z 25, CampfireFlames 14~16 위)
          // silhouette base >= 270 → 모닥불 뒤 (z 8, CampfireFlames 아래, bonfireZone 5 위)
          // (본인 캐릭터는 motion.dy 로 변화 → RAF 안에서 ref.style.zIndex 동적 갱신)
          const charBottomY = 180 + s.y;
          const staticDepthZ = charBottomY < 270 ? 25 : 8;
          return (
            <div
              key={s.id}
              ref={(el) => {
                if (isMine) {
                  myCharRef.current = el;
                } else if (el) {
                  peerElsRef.current.set(s.nick, el);
                } else {
                  peerElsRef.current.delete(s.nick);
                }
              }}
              className={styles.silhouette}
              style={{
                left: `calc(${s.x}% - 40px)`,
                bottom: s.y + 'px',
                zIndex: staticDepthZ,
                // 본인은 transform key 자체를 안 줌 — ref 가 매 프레임 직접 갱신.
                // 다른 사람도 RAF lerp 가 직접 갱신 — 초기 flip 만 인라인으로 잡아둠.
                ...(isMine
                  ? { transition: 'none' }
                  : { transform: otherTransform }),
              }}
            >
              <div
                className={styles.silhouetteNick}
                style={{
                  // 본인은 부모 silhouette 에 scaleX(-1) 안 적용했으므로 nick 도 flip 무시.
                  // 그 외 사람은 부모가 scaleX(-1) 라 nick 을 또 scaleX(-1) 해서 정상.
                  transform: `translateX(-50%) ${!isMine && s.flip ? 'scaleX(-1)' : ''}`,
                  ...(isMine ? { color: '#ffd590', fontWeight: 600 } : {}),
                }}
              >
                {isMine ? `${s.nick.slice(0, 12)} (나)` : s.nick.slice(0, 16)}
              </div>
              <div
                style={
                  isMine
                    ? { filter: 'drop-shadow(0 0 8px rgba(255,213,144,0.55))' }
                    : undefined
                }
              >
                {isMine && headFire && <HeadFire rainbow={headFire.rainbow} />}
                {!isMine && peerHeadFires[s.nick] && (
                  <HeadFire rainbow={peerHeadFires[s.nick].rainbow} />
                )}
                <PersonSilhouette variant={s.variant} scale={s.scale} />
              </div>
              {activeBubbles[s.nick] && (
                <div
                  className={styles.silhouetteBubble}
                  key={activeBubbles[s.nick].key}
                  style={{
                    transform: `translateX(-50%) ${!isMine && s.flip ? 'scaleX(-1)' : ''}`,
                  }}
                >
                  {activeBubbles[s.nick].text}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fire glow */}
      {/* fireGlow / 모닥불 주변 밝아지는 효과 제거 — CampfireFlames 캔버스 자체 글로우로 충분 */}

      {/* 열기구 — 우주를 줄게(점프맵) 진입 트리거. 좌측 상단(별똥별 달의 좌우 대칭) 떠 있음. */}
      <div
        style={{
          position: 'absolute',
          top: '12%',
          left: '12%',
          zIndex: 12,
        }}
      >
        <HotAirBalloon
          onClick={() => {
            if (meteor.gameState !== 'idle') return;
            if (jump.gameState !== 'idle') return;
            const spot = mySpotRef.current;
            jump.start(
              spot
                ? {
                    x: spot.x,
                    y: spot.y,
                    variant: spot.variant,
                    scale: spot.scale,
                  }
                : undefined,
            );
          }}
          ariaLabel="달까지 시작"
        />
      </div>

      <div
        onClick={jump.openLeaderboard}
        role="button"
        aria-label="달까지 리더보드 열기"
        title="달까지 리더보드"
        className={styles.leaderboardCloud}
        style={{
          position: 'absolute',
          top: 'calc(12% - 8px)',
          left: 'calc(12% + 36px)',
          zIndex: 11,
        }}
      >
        <svg width="44" height="26" viewBox="0 0 44 26">
          <ellipse cx="12" cy="16" rx="11" ry="9" fill="#eef3f9" opacity="0.9" />
          <ellipse cx="24" cy="12" rx="13" ry="11" fill="#eef3f9" opacity="0.9" />
          <ellipse cx="34" cy="17" rx="9" ry="8" fill="#eef3f9" opacity="0.9" />
        </svg>
      </div>

      {/* Bonfire zone — clicking it boosts roasting (easter egg) */}
      <div
        ref={fireRef}
        className={`${styles.bonfireZone} ${shake ? styles.shake : ''}`}
        onClick={pokeFire}
        data-no-joystick
      >
        <Campfire width={280} fireIntensity={fireIntensity} />

        {/* embers 는 CampfireFlames 캔버스에서 처리 — 기존 div 시스템 제거됨.
            potatoRow 는 stage 자식으로 빼서 z 50 (CampfireFlames z 14~16 위)에 둠. */}

      </div>

      {/* 모닥불 불꽃 — Claude Design 핸드오프(메탈볼 캔버스 파티클).
          bonfireZone 의 transform 이 fixed containing block 을 가둬서
          좌표가 어긋남. stage 직접 자식으로 두어 viewport 기준 fixed 가 작동하게. */}
      <CampfireFlames
        ref={campfireFlamesRef}
        paused={jump.gameState !== 'idle'}
      />

      {/* 굽고 있는 고구마 — bonfireZone 에서 빼서 stage 자식으로. z 50 으로 불꽃 위에 보임.
          bonfireZone bottom 220 기준으로 좌표 offset. */}
      <div className={styles.potatoRowFloating}>
        {pile.map((p) => {
          const slot = POTATO_SLOTS[p.slotIdx % POTATO_SLOTS.length];
          return (
            <div
              key={p.id}
              className={`${styles.potatoItem} ${p.cracked ? styles.cracked : ''}`}
              style={{
                left: `calc(50% + ${slot.x}px)`,
                bottom: `${270 + slot.y}px`,
                zIndex: 17 + slot.z,
                transform: `translateX(-50%) rotate(${slot.r}deg) scale(${slot.s})`,
              }}
              title={p.text}
            >
              <SweetPotato size={36} seed={p.seed} roastLevel={p.roast} cracked={p.cracked} />
            </div>
          );
        })}
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
      </div>{/* /sceneShift */}

      {/* 게임 오버레이는 sceneShift wrapper 밖 — stage transform 영향 안 받게.
          캐릭터/발판은 viewport 기준 그 자리에 유지되고 메인 씬만 아래로 밀려야 함. */}
      <JumpGameOverlay api={jump} myNick={myNick} />
      <MeteorOverlay api={meteor} myNick={myNick} />
      <TouchControls
        joystickRef={joystickRef}
        onJump={triggerJump}
        enabled={coarsePointer && jump.gameState === 'idle'}
      />
    </div>
  );
}
