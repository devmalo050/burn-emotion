'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

// 본인 silhouette 위치 정보 — 점프 시작점.
export interface JumpStartSpot {
  x: number;     // silhouettes container 기준 % (0~100)
  y: number;     // silhouettes container 안 bottom px
}

export type JumpGameState = 'idle' | 'countdown' | 'playing' | 'gameover';

export interface Platform {
  id: number;
  x: number;        // world x (viewport 좌측 기준 px)
  y: number;        // world y (시작점 0, 위로 갈수록 +)
  width: number;
}
export interface LeaderEntry {
  nick: string;
  height: number;
}

/**
 * 인내의 숲 — 위로 끝없이 점프하며 올라가는 점프맵.
 * 좌표계: world.y 는 시작점에서 위로 양수. 카메라가 캐릭터 따라 위로 스크롤.
 * 도달한 최고 높이(m) 가 점수.
 */
const GRAVITY = 0.0028;          // px/ms²
const JUMP_INITIAL_V = 1.05;     // 초기 점프 속도 (px/ms, 위 양수)
const MOVE_SPEED = 0.42;         // 좌우 이동 (px/ms)
const CHAR_W = 32;
const CHAR_H = 48;
const PLATFORM_H = 12;

interface Options {
  myNick: string;
}

export interface JumpGameApi {
  gameState: JumpGameState;
  countdownNum: number;
  height: number;            // 현재 도달 높이 (m). world.y / 50 으로 환산.
  platforms: Platform[];     // React state (spawn/cleanup 시점만 갱신)
  worldBaseY: number;        // silhouette 위치 viewport bottom. wrapper bottom 으로 사용.
  leaderboard: LeaderEntry[];
  lastScoreHeight: number | null;
  leaderboardOpen: boolean;
  start: (spot?: JumpStartSpot) => void;
  openLeaderboard: () => void;
  close: () => void;
  // 렌더용 ref (overlay 가 매 프레임 읽음)
  charXRef: React.RefObject<number>;
  charYRef: React.RefObject<number>;
  cameraYRef: React.RefObject<number>;
  platformsRef: React.RefObject<Platform[]>;
  worldBaseYRef: React.RefObject<number>;
  // overlay 가 자기 transform/위치 갱신 콜백 등록
  registerFrameListener: (fn: () => void) => () => void;
}

export function useJumpGame({ myNick }: Options): JumpGameApi {
  const [gameState, setGameState] = useState<JumpGameState>('idle');
  const [countdownNum, setCountdownNum] = useState(3);
  const [height, setHeight] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lastScoreHeight, setLastScoreHeight] = useState<number | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  // platforms 는 spawn/cleanup 시점에만 React state 갱신 (몇 초마다 1번).
  // 매 프레임 transform 은 ref 로 직접 DOM 조작.
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [worldBaseY, setWorldBaseY] = useState(0);

  // 게임 ref state — 매 프레임 직접 갱신, React 리렌더 없이 DOM 직접 그림
  const charXRef = useRef(0);
  const charYRef = useRef(0);
  const charVyRef = useRef(0);
  const charOnGroundRef = useRef(false);
  const cameraYRef = useRef(0);
  const maxYRef = useRef(0); // 도달한 최고 world.y
  const platformsRef = useRef<Platform[]>([]);
  const platformIdRef = useRef(1);
  const keysRef = useRef<Set<string>>(new Set());
  // 점프 시작점의 viewport bottom 좌표 (silhouette 위치). char.y · platform.y 는 이 점 기준 위로.
  const worldBaseYRef = useRef(0);
  // 점프 시작점의 viewport x 좌표 (silhouette 화면 x). char.x 의 시작점.
  const worldBaseXRef = useRef(0);

  // overlay 에서 매 프레임 callback 받게
  const frameListenersRef = useRef<Set<() => void>>(new Set());
  const registerFrameListener = useCallback((fn: () => void) => {
    frameListenersRef.current.add(fn);
    return () => {
      frameListenersRef.current.delete(fn);
    };
  }, []);

  // === 게임 시작 ===
  // silhouettes container width 1100 max-width 100% center. spot.x % 는 컨테이너 width 기준.
  // 시작점 viewport x/y 계산.
  const start = useCallback((spot?: JumpStartSpot) => {
    if (gameState !== 'idle') return;
    const sw = window.innerWidth;
    const cw = Math.min(1100, sw);
    const containerLeft = (sw - cw) / 2;
    const containerBottom = 180;
    const startScreenX = spot ? containerLeft + (spot.x / 100) * cw : sw / 2;
    const startBottomY = spot ? containerBottom + spot.y : containerBottom;

    worldBaseXRef.current = startScreenX;
    worldBaseYRef.current = startBottomY;
    setWorldBaseY(startBottomY);

    // 초기화 — char.x/y 와 platform.y 는 worldBase 기준 상대 좌표
    charXRef.current = startScreenX;
    charYRef.current = 0;
    charVyRef.current = 0;
    charOnGroundRef.current = true;
    cameraYRef.current = 0;
    maxYRef.current = 0;
    platformIdRef.current = 1;
    // 시작 발판들 — 점프로 닿게 간격 60~100
    const list: Platform[] = [];
    // 첫 발판 — 캐릭터 발 바로 아래
    list.push({
      id: platformIdRef.current++,
      x: startScreenX - 60,
      y: -8,
      width: 120,
    });
    let lastY = 0;
    let lastX = startScreenX;
    for (let i = 0; i < 8; i++) {
      lastY += 60 + Math.random() * 35; // 60~95 점프로 닿는 수직 거리
      // 가로 거리도 점프 동안 좌우 이동 가능 범위(±220)로 제한
      const offset = (Math.random() - 0.5) * 440;
      lastX = Math.max(20, Math.min(sw - 120, lastX + offset));
      list.push({
        id: platformIdRef.current++,
        x: lastX,
        y: lastY,
        width: 100,
      });
    }
    platformsRef.current = list;
    setPlatforms([...list]);
    setHeight(0);
    setLastScoreHeight(null);
    setCountdownNum(3);
    setGameState('countdown');
  }, [gameState]);

  const openLeaderboard = useCallback(() => {
    if (gameState !== 'idle') return;
    setLastScoreHeight(null);
    setLeaderboardOpen(true);
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.rpc('get_jump_top10').then(({ data, error }) => {
      if (error || !Array.isArray(data)) return;
      setLeaderboard(data as LeaderEntry[]);
    });
  }, [gameState]);

  const close = useCallback(() => {
    if (gameState === 'gameover') {
      setGameState('idle');
      setLastScoreHeight(null);
    }
    setLeaderboardOpen(false);
  }, [gameState]);

  // mount 시 TOP10 fetch
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    void supabase.rpc('get_jump_top10').then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data)) return;
      setLeaderboard(data as LeaderEntry[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // === 카운트다운 3초 → playing ===
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

  // === 키보드 입력 ===
  useEffect(() => {
    if (gameState !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') {
        e.preventDefault();
        keysRef.current.add(k);
        // 스페이스바 점프 — onGround 일 때만
        if (k === ' ' && charOnGroundRef.current) {
          charVyRef.current = JUMP_INITIAL_V;
          charOnGroundRef.current = false;
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    const onBlur = () => keysRef.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      keysRef.current.clear();
    };
  }, [gameState]);

  // === 게임 RAF 루프 — 물리 + 충돌 + 발판 spawn/cleanup + 죽음 ===
  useEffect(() => {
    if (gameState !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    let lastHeightSet = 0;

    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;

      // 좌우 이동
      const keys = keysRef.current;
      let dx = 0;
      if (keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('ArrowRight')) dx += 1;
      charXRef.current += dx * MOVE_SPEED * dt;
      // 화면 양 끝에서 멈춤
      charXRef.current = Math.max(
        CHAR_W / 2,
        Math.min(window.innerWidth - CHAR_W / 2, charXRef.current),
      );

      // 중력 + 수직 이동
      const prevY = charYRef.current;
      charVyRef.current -= GRAVITY * dt;
      charYRef.current += charVyRef.current * dt;

      // 발판 충돌 — 떨어지는 중(vy < 0) 일 때만, 발판 위에서 아래로 통과하는 순간 착지
      let landed = false;
      if (charVyRef.current < 0) {
        for (const p of platformsRef.current) {
          // 캐릭터가 발판 가로 범위 안
          if (charXRef.current < p.x - 4) continue;
          if (charXRef.current > p.x + p.width + 4) continue;
          // 이전 frame 발판 위, 현재 frame 발판 통과
          if (prevY >= p.y && charYRef.current <= p.y) {
            charYRef.current = p.y;
            charVyRef.current = 0;
            charOnGroundRef.current = true;
            landed = true;
            break;
          }
        }
      }
      if (!landed && charVyRef.current !== 0) {
        charOnGroundRef.current = false;
      }

      // 최고 높이 갱신
      if (charYRef.current > maxYRef.current) {
        maxYRef.current = charYRef.current;
      }

      // 카메라 — char.y 는 worldBaseY 기준 상대 높이. 캐릭터 screen y (bottom) =
      // worldBaseY + char.y - cameraY. 캐릭터가 viewport 위 40% 부근 (= bottom 60%) 도달하면
      // 카메라가 따라 올라감.
      const sh = window.innerHeight;
      const screenBottomBudget = sh * 0.6; // 캐릭터의 viewport bottom 위치 한계
      const desiredCameraY =
        worldBaseYRef.current + charYRef.current - screenBottomBudget;
      if (desiredCameraY > cameraYRef.current) {
        cameraYRef.current = desiredCameraY;
      }

      // 발판 spawn — 가장 높은 발판이 카메라 위쪽 근처면 위에 추가
      const list = platformsRef.current;
      let topY = 0;
      for (const p of list) if (p.y > topY) topY = p.y;
      // spawn 타겟 — cameraY 보다 화면 한 화면 위까지 발판 채움.
      // cameraY 는 worldBaseY 기준 시점이므로 spawn y(상대) 한계는 cameraY - worldBaseY + sh.
      const cameraRelY = cameraYRef.current - worldBaseYRef.current;
      const targetSpawnY = cameraRelY + sh + 200;
      let dirty = false;
      // 마지막 발판 x 도 참고 — 가로 이동 가능 범위 안에 spawn
      let lastSpawnX = 0;
      let lastSpawnYCheck = -Infinity;
      for (const p of list) {
        if (p.y > lastSpawnYCheck) {
          lastSpawnYCheck = p.y;
          lastSpawnX = p.x;
        }
      }
      const sw = window.innerWidth;
      while (topY < targetSpawnY) {
        const difficulty = Math.min(1, maxYRef.current / 4000);
        // 수직 간격 — 점프 최대 도달 ~196px. 후반엔 140~175 까지 늘어남.
        topY += 60 + Math.random() * 35 + difficulty * 80;
        // 발판 폭 — 후반엔 40~70 까지 좁아짐.
        const minW = 120 - difficulty * 80;
        const maxW = minW + 30;
        const w = minW + Math.random() * (maxW - minW);
        const offset = (Math.random() - 0.5) * 440;
        lastSpawnX = Math.max(20, Math.min(sw - w - 20, lastSpawnX + offset));
        list.push({
          id: platformIdRef.current++,
          x: lastSpawnX,
          y: topY,
          width: w,
        });
        dirty = true;
      }

      // 발판 cleanup — 화면 아래로 한참 떨어진 거 제거 (cameraRelY 기준)
      const cullBelow = cameraRelY - 100;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].y < cullBelow) {
          list.splice(i, 1);
          dirty = true;
        }
      }
      if (dirty) setPlatforms([...list]);

      // 죽음 판정 — 캐릭터 viewport 화면 아래로 한참 떨어짐
      const charBottomFromViewport =
        worldBaseYRef.current + charYRef.current - cameraYRef.current;
      const charScreenY = sh - charBottomFromViewport;
      if (charScreenY > sh + 100) {
        setLastScoreHeight(maxYRef.current / 50);
        setGameState('gameover');
        return;
      }

      // height HUD 갱신 — 매 200ms 정도
      if (now - lastHeightSet > 100) {
        lastHeightSet = now;
        setHeight(maxYRef.current / 50);
      }

      // overlay 에 매 frame 신호
      for (const fn of frameListenersRef.current) fn();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  // === gameover RPC submit + TOP10 fetch ===
  useEffect(() => {
    if (gameState !== 'gameover') return;
    let cancelled = false;
    const h = lastScoreHeight ?? 0;
    const supabase = getSupabase();
    if (supabase) {
      void supabase
        .rpc('submit_jump_record', { p_nick: myNick, p_height: Number(h.toFixed(2)) })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !Array.isArray(data)) {
            void supabase.rpc('get_jump_top10').then(({ data: d2 }) => {
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
    height,
    platforms,
    worldBaseY,
    worldBaseYRef,
    leaderboard,
    lastScoreHeight,
    leaderboardOpen,
    start,
    openLeaderboard,
    close,
    charXRef,
    charYRef,
    cameraYRef,
    platformsRef,
    registerFrameListener,
  };
}
