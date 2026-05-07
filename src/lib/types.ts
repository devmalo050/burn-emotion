export interface ChatMessage {
  id: number;
  text: string;
  nick: string;
  /** silhouette index (-1 for self / no avatar) */
  sIdx: number;
  /** unix ms */
  time: number;
  isMe?: boolean;
  /** UI: feed item leaving */
  fading?: boolean;
}

export interface PotatoState {
  id: number;
  seed: number;
  text: string;
  /** 0..1 */
  roast: number;
  cracked: boolean;
  /** performance.now() when cracked */
  crackedAt: number;
  /** performance.now() when added */
  placedAt: number;
  wobble: number;
  /** stable slot index in POTATO_SLOTS — does not shift when other potatoes leave */
  slotIdx: number;
}

export interface SilhouetteEntity {
  id: string;
  nick: string;
  /** position (overridden by layoutPos result on layout) */
  x: number;
  y: number;
  scale: number;
  variant: number;
  flip: boolean;
}

export interface ActiveBubble {
  text: string;
  /** unique key per bubble for animation */
  key: number;
}

export interface EmberParticle {
  id: number;
  startX: number;
  endX: number;
  endY: number;
  duration: number;
}
