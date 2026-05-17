'use client';
import styles from './HotAirBalloon.module.css';

interface Props {
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * 열기구 — 위 둥글고 아래 좁아지는 물방울 모양 풍선 + 다채로운 가로 줄무늬.
 * 모닥불 톤과 매치되는 따뜻한 빨강·노랑·짙은 보라.
 */
export function HotAirBalloon({ onClick, ariaLabel }: Props) {
  return (
    <div
      className={styles.balloon}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? ariaLabel ?? '열기구' : undefined}
    >
      <svg
        viewBox="0 0 72 110"
        width="64"
        height="98"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* 풍선 모양 — 위 둥글고 아래 좁아지는 물방울 */}
          <clipPath id="hab-shape">
            <path
              d="M36 3
                 C 60 3, 68 17, 66 34
                 C 64 50, 58 62, 50 70
                 L 22 70
                 C 14 62, 8 50, 6 34
                 C 4 17, 12 3, 36 3 Z"
            />
          </clipPath>

          {/* 가로 줄무늬 색 */}
          <linearGradient id="hab-band-1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff7050" />
            <stop offset="100%" stopColor="#d93a26" />
          </linearGradient>
          <linearGradient id="hab-band-2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe26a" />
            <stop offset="100%" stopColor="#f0a820" />
          </linearGradient>
          <linearGradient id="hab-band-3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a2a48" />
            <stop offset="100%" stopColor="#2e1428" />
          </linearGradient>

          <linearGradient id="hab-basket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a4a2e" />
            <stop offset="100%" stopColor="#3a1f10" />
          </linearGradient>
        </defs>

        {/* === 풍선 줄무늬 (모양으로 clip) === */}
        <g clipPath="url(#hab-shape)">
          {/* 위 빨강 띠 (60% 까지) */}
          <rect x="0" y="0" width="72" height="42" fill="url(#hab-band-1)" />
          {/* 중간 노랑 띠 */}
          <rect x="0" y="42" width="72" height="14" fill="url(#hab-band-2)" />
          {/* 아래 짙은 보라 띠 */}
          <rect x="0" y="56" width="72" height="20" fill="url(#hab-band-3)" />

          {/* 풍선 세로 살 — 6 갈래로 입체감 */}
          <path d="M36 3 C 30 22, 30 50, 36 70" stroke="rgba(0,0,0,0.22)" strokeWidth="0.6" fill="none" />
          <path d="M36 3 C 42 22, 42 50, 36 70" stroke="rgba(0,0,0,0.22)" strokeWidth="0.6" fill="none" />
          <path d="M18 8 C 12 26, 14 50, 22 68" stroke="rgba(0,0,0,0.22)" strokeWidth="0.6" fill="none" />
          <path d="M54 8 C 60 26, 58 50, 50 68" stroke="rgba(0,0,0,0.22)" strokeWidth="0.6" fill="none" />
          {/* 띠 사이 어두운 가는 선 (각 색 구분) */}
          <line x1="0" y1="42" x2="72" y2="42" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
          <line x1="0" y1="56" x2="72" y2="56" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />

          {/* 풍선 상단 하이라이트 */}
          <ellipse cx="24" cy="18" rx="8" ry="11" fill="rgba(255,240,210,0.32)" />
          {/* 풍선 가운데 발광 */}
          <ellipse cx="36" cy="40" rx="22" ry="6" fill="rgba(255,255,255,0.08)" />
        </g>

        {/* 풍선 외곽선 */}
        <path
          d="M36 3
             C 60 3, 68 17, 66 34
             C 64 50, 58 62, 50 70
             L 22 70
             C 14 62, 8 50, 6 34
             C 4 17, 12 3, 36 3 Z"
          fill="none"
          stroke="rgba(30,8,4,0.55)"
          strokeWidth="0.8"
        />

        {/* 풍선 아래 입구 (어두운 띠) */}
        <path d="M22 70 L50 70 L46 75 L26 75 Z" fill="#1a0c18" />

        {/* === 줄 4 가닥 === */}
        <line x1="25" y1="75" x2="27" y2="84" stroke="#1a0c08" strokeWidth="0.8" />
        <line x1="32" y1="75" x2="32" y2="84" stroke="#1a0c08" strokeWidth="0.8" />
        <line x1="40" y1="75" x2="40" y2="84" stroke="#1a0c08" strokeWidth="0.8" />
        <line x1="47" y1="75" x2="45" y2="84" stroke="#1a0c08" strokeWidth="0.8" />

        {/* === 바구니 (작은 사다리꼴) === */}
        <path
          d="M25 84 L47 84 L44 96 L28 96 Z"
          fill="url(#hab-basket)"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="0.6"
        />
        <line x1="26" y1="88" x2="46" y2="88" stroke="rgba(20,10,4,0.6)" strokeWidth="0.45" />
        <line x1="26.5" y1="92" x2="45.5" y2="92" stroke="rgba(20,10,4,0.6)" strokeWidth="0.45" />
        {/* 바구니 위 가장자리 */}
        <path d="M25 84 L47 84 L46 86 L26 86 Z" fill="rgba(255,210,150,0.28)" />

        {/* === 버너 불꽃 — 풍선 입구 아래쪽에서 위로 타오름 === */}
        <defs>
          <radialGradient id="hab-flame-outer" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#ffce4a" />
            <stop offset="60%" stopColor="#ff7a20" />
            <stop offset="100%" stopColor="#c43a10" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hab-flame-inner" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#fffff0" />
            <stop offset="60%" stopColor="#ffe28c" />
            <stop offset="100%" stopColor="#ff9a30" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className={styles.flame}>
          {/* 바깥 불꽃 — 위가 뾰족하고 아래가 둥근 물방울 */}
          <path
            d="M36 74
               C 41 78, 42 82, 39 85
               C 38 83, 37 82, 36 81
               C 35 82, 34 83, 33 85
               C 30 82, 31 78, 36 74 Z"
            fill="url(#hab-flame-outer)"
          />
          {/* 안쪽 코어 */}
          <path
            d="M36 77
               C 38.5 80, 39 82.5, 37 84
               C 36.5 83, 36 82.5, 36 82
               C 36 82.5, 35.5 83, 35 84
               C 33 82.5, 33.5 80, 36 77 Z"
            fill="url(#hab-flame-inner)"
          />
        </g>
      </svg>
    </div>
  );
}
