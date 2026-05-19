'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Star } from '@/components/StarrySky/StarrySky';

export type MeteorGameState = 'idle' | 'countdown' | 'playing' | 'gameover';
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
  skyStars: Star[];
  setHiddenStarIds: React.Dispatch<React.SetStateAction<ReadonlySet<number>>>;
}

export interface MeteorGameApi {
  gameState: MeteorGameState;
  countdownNum: number;
  survivedMs: number;
  meteors: Meteor[];
  leaderboard: LeaderEntry[];
  lastScoreSec: number | null;
  leaderboardOpen: boolean;
  start: () => void;
  openLeaderboard: () => void;
  close: () => void;
}

export function useMeteorGame(opts: Options): MeteorGameApi {
  const { myNick, spotRef, motionRef, skyStars, setHiddenStarIds } = opts;

  const [gameState, setGameState] = useState<MeteorGameState>('idle');
  const [countdownNum, setCountdownNum] = useState(3);
  const [survivedMs, setSurvivedMs] = useState(0);
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lastScoreSec, setLastScoreSec] = useState<number | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const meteorIdRef = useRef(1);

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
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.rpc('get_meteor_top10').then(({ data, error }) => {
      if (error || !Array.isArray(data)) return;
      setLeaderboard(data as LeaderEntry[]);
    });
  }, [gameState]);

  // === 모달 닫기 ===
  const close = useCallback(() => {
    if (gameState === 'gameover') {
      setGameState('idle');
      setMeteors([]);
      setLastScoreSec(null);
      setHiddenStarIds(new Set());
    }
    setLeaderboardOpen(false);
  }, [gameState, setHiddenStarIds]);

  // === 마운트 시 TOP10 fetch ===
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    void supabase.rpc('get_meteor_top10').then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data)) return;
      setLeaderboard(data as LeaderEntry[]);
    });
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
    let burst50 = false;
    let burst100 = false;
    const shuffled = [...skyStars].sort(() => Math.random() - 0.5);
    const fallFirstIds = new Set<number>(
      shuffled.slice(0, Math.floor(skyStars.length * 0.3)).map((s) => s.id),
    );
    const list: Meteor[] = [];

    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const elapsed = now - startAt - pauseAccumRef.current;
      setSurvivedMs(elapsed);

      // burst 헬퍼 — 특정 별 그룹을 그 자리에서 별똥별로 변환.
      // 한 번에 많이 떨어지는 만큼 vy 는 천천히 — 일반 spawn 의 절반 정도.
      const dropStars = (starsToDrop: Star[], timeAtMs: number) => {
        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const skyH = sh * 0.6;
        const speedBoost = (timeAtMs / 70000) * 0.25;
        const droppedIds: number[] = [];
        for (const s of starsToDrop) {
          list.push({
            id: meteorIdRef.current++,
            x: (s.x / 100) * sw,
            y: (s.y / 100) * skyH,
            vx: (Math.random() - 0.5) * 0.2,
            vy: 0.22 + Math.random() * 0.18 + speedBoost,
          });
          droppedIds.push(s.id);
        }
        setHiddenStarIds((prev) => {
          const next = new Set(prev);
          for (const id of droppedIds) next.add(id);
          return next;
        });
      };

      if (!burst50 && elapsed >= 50000) {
        burst50 = true;
        dropStars(skyStars.filter((s) => fallFirstIds.has(s.id)), 50000);
      }
      if (!burst100 && elapsed >= 100000) {
        burst100 = true;
        dropStars(skyStars.filter((s) => !fallFirstIds.has(s.id)), 100000);
      }

      // 난이도 곡선 — 점점 빨라짐
      const spawnInterval = Math.max(220, 1100 - elapsed * 0.029);
      const speedBoost = elapsed / 70000;
      if (now - lastSpawn > spawnInterval) {
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
      }

      // 이동 + 화면 밖 제거
      const sh = window.innerHeight;
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y > sh + 60) list.splice(i, 1);
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

      setMeteors([...list]);
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
    const supabase = getSupabase();
    if (supabase) {
      void supabase
        .rpc('submit_meteor_record', { p_nick: myNick, p_seconds: Number(sec.toFixed(2)) })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !Array.isArray(data)) {
            void supabase.rpc('get_meteor_top10').then(({ data: d2 }) => {
              if (cancelled || !Array.isArray(d2)) return;
              setLeaderboard(d2 as LeaderEntry[]);
            });
            return;
          }
          setLeaderboard(data as LeaderEntry[]);
        });
    }
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
    leaderboard,
    lastScoreSec,
    leaderboardOpen,
    start,
    openLeaderboard,
    close,
  };
}
