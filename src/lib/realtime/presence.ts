import type { SilhouetteEntity } from '@/lib/types';

export interface MySpot {
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  variant: number;
  joinedAt: number;
}

export interface PresenceMeta {
  nick: string;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  variant: number;
  joinedAt: number;
}

export function buildMyEntity(spot: MySpot, nick: string): SilhouetteEntity {
  return {
    id: 'me',
    nick,
    x: spot.x,
    y: spot.y,
    scale: spot.scale,
    variant: spot.variant,
    flip: spot.flip,
  };
}

export function mergeSilhouettes(
  myEntity: SilhouetteEntity,
  state: Record<string, unknown>,
  myNick: string,
): SilhouetteEntity[] {
  const peers: PresenceMeta[] = [];
  for (const key in state) {
    const meta = state[key] as PresenceMeta | undefined;
    if (!meta?.nick) continue;
    if (meta.nick === myNick) continue;
    peers.push(meta);
  }
  peers.sort((a, b) => a.joinedAt - b.joinedAt);
  return [
    myEntity,
    ...peers.map((p) => ({
      id: 'peer-' + p.nick,
      nick: p.nick,
      x: p.x,
      y: p.y,
      scale: p.scale,
      variant: p.variant,
      flip: p.flip,
    })),
  ];
}
