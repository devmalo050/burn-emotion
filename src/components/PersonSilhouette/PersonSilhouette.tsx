import type { ReactNode } from 'react';

interface PersonSilhouetteProps {
  variant?: number;
  scale?: number;
}

/**
 * 모닥불 옆에 앉은 사람의 실루엣 — 디자인 번들 원본 변형 5종.
 */
const VARIANTS: ReadonlyArray<ReactNode> = [
  <g key="v0">
    <circle cx="40" cy="20" r="12" />
    <path d="M 28 32 Q 22 50 20 80 L 14 110 Q 12 130 18 140 L 64 140 Q 70 130 68 110 L 60 80 Q 56 60 52 32 Q 46 28 40 28 Q 34 28 28 32 Z" />
    <path d="M 18 90 Q 26 100 34 108 L 36 124 Q 30 124 24 120 Q 16 112 14 100 Z" />
    <path d="M 62 90 Q 54 100 46 108 L 44 124 Q 50 124 56 120 Q 64 112 66 100 Z" />
  </g>,
  <g key="v1">
    <circle cx="40" cy="22" r="13" />
    <path d="M 26 36 Q 20 60 18 90 L 12 130 L 24 142 L 56 142 L 68 130 L 62 90 Q 60 60 54 36 Q 48 32 40 32 Q 32 32 26 36 Z" />
    <path d="M 14 130 Q 8 138 14 142 L 30 142 L 32 130 Z" />
    <path d="M 66 130 Q 72 138 66 142 L 50 142 L 48 130 Z" />
  </g>,
  <g key="v2">
    <path d="M 30 12 Q 22 6 32 -2 Q 40 -8 48 -2 Q 58 6 50 12 Q 56 22 52 32 Q 56 60 54 90 L 60 130 L 50 145 L 30 145 L 20 130 L 26 90 Q 24 60 28 32 Q 24 22 30 12 Z" />
    <path d="M 24 100 Q 16 112 22 124 L 32 130 L 36 120 Q 30 110 28 100 Z" />
    <path d="M 56 100 Q 64 112 58 124 L 48 130 L 44 120 Q 50 110 52 100 Z" />
  </g>,
  <g key="v3" transform="rotate(-4 40 80)">
    <circle cx="42" cy="22" r="12" />
    <path d="M 30 34 Q 24 56 22 88 L 16 128 L 22 142 L 60 142 L 66 128 L 62 88 Q 60 56 54 34 Q 48 30 42 30 Q 36 30 30 34 Z" />
    <path d="M 22 96 Q 14 108 20 122 L 30 130 Z" />
    <path d="M 62 96 Q 70 108 64 122 L 54 130 Z" />
  </g>,
  <g key="v4">
    <circle cx="40" cy="24" r="11" />
    <path d="M 30 34 Q 22 56 22 88 L 18 124 Q 18 138 24 142 L 56 142 Q 62 138 62 124 L 58 88 Q 58 56 50 34 Q 46 30 40 30 Q 34 30 30 34 Z" />
    <path d="M 22 90 Q 14 100 20 116 L 32 122 Z" />
    <path d="M 58 90 Q 66 100 60 116 L 48 122 Z" />
  </g>,
];

export function PersonSilhouette({ variant = 0, scale = 1 }: PersonSilhouetteProps) {
  return (
    <svg
      width={80 * scale}
      height={170 * scale}
      viewBox="-10 -10 100 160"
      fill="#0a0805"
      stroke="#1a0e08"
      strokeWidth="1"
    >
      {VARIANTS[variant % VARIANTS.length]}
    </svg>
  );
}
