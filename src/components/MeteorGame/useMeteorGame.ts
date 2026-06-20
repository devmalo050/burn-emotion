'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { api } from '@/lib/api';

export type MeteorGameState = 'idle' | 'countdown' | 'playing' | 'gameover';

// burst — 50초마다 별똥별 다발이 쏟아짐. k 번째 burst 개수 = BURST_BASE * k
// (상한 BURST_MAX_COUNT). 50초 54 → 100초 108 → 150초 162 …
const BURST_INTERVAL = 50000;
const BURST_BASE = 54;
const BURST_MAX_COUNT = 270;
const BURST_QUIET_MS = 3000;
export interface Meteor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}
export interface LeaderEntry {
  nick: string;
  seconds: number;
}

// 훅이 캐릭터 위치 추적용으로 필요한 최소 모양 — BonfireScene 의 실제 ref 그대로 전달 가능.
export interface CharSpot {
  x: number;
  y: number;
}
export interface CharMotion {
  dx: number;
  dy: number;
  yJump: number;
}

interface Options {
  myNick: string;
  spotRef: RefObject<CharSpot | null>;
  motionRef: RefObject<CharMotion>;
}

export interface MeteorGameApi {
  gameState: MeteorGameState;
  countdownNum: number;
  survivedMs: number;
  meteors: Meteor[];
  meteorElsRef: RefObject<Map<number, HTMLDivElement | null>>;
  leaderboard: LeaderEntry[];
  lastScoreSec: number | null;
  leaderboardOpen: boolean;
  start: () => void;
  openLeaderboard: () => void;
  close: () => void;
}

export function useMeteorGame(opts: Options): MeteorGameApi {
  const { myNick, spotRef, motionRef } = opts;

  const [gameState, setGameState] = useState<MeteorGameState>('idle');
  const [countdownNum, setCountdownNum] = useState(3);
  const [survivedMs, setSurvivedMs] = useState(0);
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lastScoreSec, setLastScoreSec] = useState<number | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const meteorIdRef = useRef(1);
  // 매 프레임 위치는 setState 안 거치고 ref 로 DOM transform 직접 갱신 — setMeteors 는
  // 생성/소멸(membership) 변경 시에만. survivedMs 매 프레임 리렌더에도 메테오 노드는 안 건드림.
  const meteorElsRef = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // === pause 보정 — 탭 hidden 시 시간/시뮬 정지, visible 복귀 시 hidden 동안 흐른 시간을 차감 ===
  const pausedAtRef = useRef<number | null>(null);
  const pauseAccumRef = useRef(0);

  // === 게임 시작 ===
  const start = useCallback(() => {
    if (gameState !== 'idle') return;
    setLastScoreSec(null);
    setMeteors([]);
    setSurvivedMs(0);
    setCountdownNum(3);
    pausedAtRef.current = null;
    pauseAccumRef.current = 0;
    setGameState('countdown');
  }, [gameState]);

  // === 리더보드만 열기 (게임 X) ===
  const openLeaderboard = useCallback(() => {
    if (gameState !== 'idle') return;
    setLastScoreSec(null);
    setLeaderboardOpen(true);
    void api
      .meteorTop10()
      .then(setLeaderboard)
      .catch(() => {});
  }, [gameState]);

  // === 모달 닫기 ===
  const close = useCallback(() => {
    if (gameState === 'gameover') {
      setGameState('idle');
      setMeteors([]);
      setLastScoreSec(null);
    }
    setLeaderboardOpen(false);
  }, [gameState]);

  // === 마운트 시 TOP10 fetch ===
  useEffect(() => {
    let cancelled = false;
    void api
      .meteorTop10()
      .then((d) => {
        if (!cancelled) setLeaderboard(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // === 카운트다운 3초 ===
  useEffect(() => {
    if (gameState !== 'countdown') return;
    setCountdownNum(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setGameState('playing');
      } else {
        setCountdownNum(n);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [gameState]);

  // === 게임 RAF loop ===
  useEffect(() => {
    if (gameState !== 'playing') return;
    let raf = 0;
    const startAt = performance.now();
    let last = startAt;
    let lastSpawn = startAt;
    // playing 진입 시점이 hidden 이면 그 시점부터 pause 시작 — visible 복귀 시 pauseAccum 으로
    // 그 사이 wall-clock 흐름이 elapsed 에서 빠짐.
    pauseAccumRef.current = 0;
    pausedAtRef.current =
      document.visibilityState === 'hidden' ? startAt : null;
    let nextBurstAt = BURST_INTERVAL;
    let burstNum = 0;
    let quietUntilElapsed = 0;
    const list: Meteor[] = [];

    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const elapsed = now - startAt - pauseAccumRef.current;
      setSurvivedMs(elapsed);
      let memberChanged = false;

      // burst 헬퍼 — 화면 맨 위에서 별똥별 다발이 쏟아짐. 화면 위 영역에 y 를
      // 흩어 순차적으로 진입하게. 한 번에 많이 떨어지므로 vy 는 천천히.
      const dropMeteors = (count: number, timeAtMs: number) => {
        const sw = window.innerWidth;
        const skyH = window.innerHeight * 0.6;
        const speedBoost = (timeAtMs / 70000) * 0.25;
        for (let i = 0; i < count; i++) {
          list.push({
            id: meteorIdRef.current++,
            x: Math.random() * sw,
            y: -40 - Math.random() * skyH,
            vx: (Math.random() - 0.5) * 0.2,
            vy: 0.22 + Math.random() * 0.18 + speedBoost,
          });
        }
        if (count > 0) memberChanged = true;
      };

      // 50초마다 burst — k 번째는 BURST_BASE * k 개 (상한까지).
      while (elapsed >= nextBurstAt) {
        burstNum += 1;
        const count = Math.min(BURST_BASE * burstNum, BURST_MAX_COUNT);
        dropMeteors(count, nextBurstAt);
        quietUntilElapsed = nextBurstAt + BURST_QUIET_MS;
        nextBurstAt += BURST_INTERVAL;
      }

      // 난이도 곡선 — 점점 빨라짐
      const spawnInterval = Math.max(220, 1100 - elapsed * 0.029);
      const speedBoost = elapsed / 70000;
      if (elapsed < quietUntilElapsed) {
        lastSpawn = now;
      } else if (now - lastSpawn > spawnInterval) {
        lastSpawn = now;
        const widthFactor = Math.max(1, Math.round(window.innerWidth / 1100));
        for (let k = 0; k < widthFactor; k++) {
          list.push({
            id: meteorIdRef.current++,
            x: Math.random() * window.innerWidth,
            y: -40,
            vx: (Math.random() - 0.5) * 0.25,
            vy: 0.45 + Math.random() * 0.4 + speedBoost,
          });
        }
        memberChanged = true;
      }

      // 이동 + 화면 밖 제거
      const sh = window.innerHeight;
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y > sh + 60) {
          list.splice(i, 1);
          memberChanged = true;
        }
      }

      // 충돌 판정
      const spot = spotRef.current;
      if (spot) {
        const sw = window.innerWidth;
        const cw = Math.min(1100, sw);
        const containerLeft = (sw - cw) / 2;
        const containerBottom = 180;
        const m = motionRef.current;
        const charScreenX = containerLeft + (spot.x / 100) * cw + m.dx;
        const charBottomFromTop = sh - (containerBottom + spot.y + m.dy + m.yJump);
        const charCenterY = charBottomFromTop - 40;
        const HIT_RADIUS = 28;
        for (const met of list) {
          const dxh = met.x - charScreenX;
          const dyh = met.y - charCenterY;
          if (dxh * dxh + dyh * dyh < HIT_RADIUS * HIT_RADIUS) {
            setLastScoreSec(elapsed / 1000);
            setGameState('gameover');
            return;
          }
        }
      }

      const els = meteorElsRef.current;
      for (const m of list) {
        const el = els.get(m.id);
        if (el)
          el.style.transform = `translate(${m.x}px, ${m.y}px) translate(-50%, -50%)`;
      }
      if (memberChanged) setMeteors([...list]);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // === 탭 visibility — countdown/playing 동안 hidden 으로 흐른 시간을 elapsed 에서 차감 ===
  // RAF 가 백그라운드에서 거의 멈춰 시뮬은 정지되는데 wall-clock(now-startAt) 만 흘러 점수만
  // 부풀던 어뷰징 방지. visible 복귀 시 hidden 동안 흐른 시간을 pauseAccum 에 누적해서 빼줌.
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'countdown') return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (pausedAtRef.current === null) pausedAtRef.current = performance.now();
      } else {
        if (pausedAtRef.current !== null) {
          pauseAccumRef.current += performance.now() - pausedAtRef.current;
          pausedAtRef.current = null;
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [gameState]);

  // === gameover 처리: RPC submit + TOP10 fetch ===
  useEffect(() => {
    if (gameState !== 'gameover') return;
    let cancelled = false;
    const sec = lastScoreSec ?? 0;
    void api
      .submitMeteor(myNick, Number(sec.toFixed(2)))
      .then((d) => {
        if (!cancelled) setLeaderboard(d);
      })
      .catch(() => {
        void api
          .meteorTop10()
          .then((d2) => {
            if (!cancelled) setLeaderboard(d2);
          })
          .catch(() => {});
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  return {
    gameState,
    countdownNum,
    survivedMs,
    meteors,
    meteorElsRef,
    leaderboard,
    lastScoreSec,
    leaderboardOpen,
    start,
    openLeaderboard,
    close,
  };
}
