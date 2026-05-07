import type { ReactNode } from 'react';

interface PersonSilhouetteProps {
  variant?: number;
  scale?: number;
}

/**
 * 모닥불 옆에 앉은 사람의 실루엣.
 * 머리·목·어깨·팔·무릎 윤곽을 분리해 사람다운 그림자로 보이게 한다.
 * viewBox: 80×155 (앉은 자세 기준)
 */
const VARIANTS: ReadonlyArray<ReactNode> = [
  // 0) 무릎 끌어안고 앉은 자세 (가장 흔한 캠핑 자세)
  <g key="v0">
    {/* 머리 */}
    <ellipse cx="40" cy="22" rx="9.5" ry="11" />
    {/* 목 */}
    <path d="M 36 32 Q 36 35 38 38 L 42 38 Q 44 35 44 32 Z" />
    {/* 등·몸통 */}
    <path d="M 24 50 Q 22 56 24 64 L 24 96 Q 26 116 32 134
             L 48 134 Q 54 116 56 96 L 56 64 Q 58 56 56 50
             Q 52 40 48 38 L 32 38 Q 28 40 24 50 Z" />
    {/* 위팔 (왼) */}
    <path d="M 22 56 Q 16 70 18 88 Q 20 100 26 110 L 32 110 Q 30 100 28 88 Q 28 72 30 60 Z" />
    {/* 위팔 (오) */}
    <path d="M 58 56 Q 64 70 62 88 Q 60 100 54 110 L 48 110 Q 50 100 52 88 Q 52 72 50 60 Z" />
    {/* 손 모아쥐고 */}
    <ellipse cx="32" cy="116" rx="4" ry="5" />
    <ellipse cx="48" cy="116" rx="4" ry="5" />
    {/* 무릎 */}
    <path d="M 28 122 Q 26 134 30 144 L 50 144 Q 54 134 52 122 Z" />
  </g>,

  // 1) 책상다리 — 좀 낮고 넓게 앉음
  <g key="v1">
    <ellipse cx="40" cy="24" rx="10" ry="12" />
    <path d="M 36 34 Q 36 38 38 41 L 42 41 Q 44 38 44 34 Z" />
    <path d="M 22 54 Q 20 64 22 74 L 22 100 Q 24 118 30 134
             L 50 134 Q 56 118 58 100 L 58 74 Q 60 64 58 54
             Q 54 44 48 41 L 32 41 Q 26 44 22 54 Z" />
    <path d="M 22 130 Q 14 138 18 144 L 32 144 Q 36 138 34 130 Z" />
    <path d="M 58 130 Q 66 138 62 144 L 48 144 Q 44 138 46 130 Z" />
    <ellipse cx="28" cy="128" rx="3.5" ry="3" />
    <ellipse cx="52" cy="128" rx="3.5" ry="3" />
  </g>,

  // 2) 후드 쓴 사람
  <g key="v2">
    <path d="M 28 18 Q 28 6 40 6 Q 52 6 52 18
             Q 54 26 50 32 L 30 32 Q 26 26 28 18 Z" />
    <path d="M 22 50 Q 20 58 22 70 L 22 98 Q 24 118 30 134
             L 50 134 Q 56 118 58 98 L 58 70 Q 60 58 58 50
             Q 52 36 40 36 Q 28 36 22 50 Z" />
    <path d="M 24 64 Q 18 80 22 100 L 30 110 Q 30 96 28 80 Q 28 70 30 62 Z" />
    <path d="M 56 64 Q 62 80 58 100 L 50 110 Q 50 96 52 80 Q 52 70 50 62 Z" />
    <ellipse cx="30" cy="115" rx="3.5" ry="4" />
    <ellipse cx="50" cy="115" rx="3.5" ry="4" />
    <path d="M 28 122 Q 26 134 30 144 L 50 144 Q 54 134 52 122 Z" />
  </g>,

  // 3) 살짝 옆으로 기댄 자세
  <g key="v3" transform="rotate(-3 40 90)">
    <ellipse cx="42" cy="22" rx="9.5" ry="11" />
    <path d="M 38 32 Q 38 35 40 38 L 44 38 Q 46 35 46 32 Z" />
    <path d="M 26 50 Q 22 60 24 72 L 24 100 Q 26 118 32 134
             L 52 134 Q 58 118 58 100 L 58 72 Q 60 60 56 50
             Q 52 40 48 38 L 34 38 Q 30 40 26 50 Z" />
    <path d="M 22 60 Q 14 76 18 96 L 28 110 Q 26 96 24 80 Q 24 70 26 60 Z" />
    <path d="M 58 60 Q 66 78 60 100 L 50 112 Q 50 98 52 84 Q 54 72 56 60 Z" />
    <ellipse cx="28" cy="116" rx="3.5" ry="4" />
    <ellipse cx="50" cy="118" rx="3.5" ry="4" />
    <path d="M 28 122 Q 28 134 32 144 L 50 144 Q 54 134 52 122 Z" />
  </g>,

  // 4) 무릎 위 턱 — 컴팩트
  <g key="v4">
    <ellipse cx="40" cy="32" rx="9" ry="10" />
    <path d="M 24 56 Q 22 64 24 78 L 24 102 Q 26 120 32 134
             L 50 134 Q 56 120 58 102 L 58 78 Q 60 64 58 56
             Q 54 46 48 44 Q 42 42 40 42 Q 38 42 32 44 Q 28 46 24 56 Z" />
    <path d="M 22 70 Q 18 84 22 100 Q 26 112 30 116 L 36 116 Q 32 100 28 86 Q 28 76 30 68 Z" />
    <path d="M 58 70 Q 62 84 58 100 Q 54 112 50 116 L 44 116 Q 48 100 52 86 Q 52 76 50 68 Z" />
    <ellipse cx="34" cy="118" rx="3.5" ry="3.5" />
    <ellipse cx="46" cy="118" rx="3.5" ry="3.5" />
    <path d="M 28 124 Q 28 134 32 144 L 50 144 Q 54 134 52 124 Z" />
  </g>,
];

export function PersonSilhouette({ variant = 0, scale = 1 }: PersonSilhouetteProps) {
  return (
    <svg
      width={80 * scale}
      height={155 * scale}
      viewBox="-2 -2 84 152"
      fill="#0a0805"
      stroke="#1a0e08"
      strokeWidth="0.6"
    >
      {VARIANTS[variant % VARIANTS.length]}
    </svg>
  );
}
