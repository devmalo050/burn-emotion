import type { LeaderEntry } from '@/components/MeteorGame/useMeteorGame';
import type { LeaderEntry as JumpLeaderEntry } from '@/components/JumpGame/useJumpGame';

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  meteorTop10: () => jget<LeaderEntry[]>('/api/leaderboard/meteor'),
  submitMeteor: (nick: string, seconds: number) =>
    jpost<LeaderEntry[]>('/api/leaderboard/meteor', { nick, seconds }),
  jumpTop10: () => jget<JumpLeaderEntry[]>('/api/leaderboard/jump'),
  submitJump: (nick: string, height: number) =>
    jpost<JumpLeaderEntry[]>('/api/leaderboard/jump', { nick, height }),
  counterToday: () => jget<{ n: number }>('/api/counter').then((d) => d.n),
  incBurned: () => jpost<{ n: number }>('/api/counter', {}).then((d) => d.n),
};
