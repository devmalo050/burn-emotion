export type OutMsg =
  | { t: 'track'; meta: unknown }
  | { t: 'broadcast'; event: string; payload: unknown };

export function collapseOutbound(queue: OutMsg[]): OutMsg[] {
  let lastMotionIdx = -1;
  for (let i = 0; i < queue.length; i++) {
    const m = queue[i];
    if (m.t === 'broadcast' && m.event === 'motion') lastMotionIdx = i;
  }
  if (lastMotionIdx === -1) return queue.slice();
  const out: OutMsg[] = [];
  for (let i = 0; i < queue.length; i++) {
    const m = queue[i];
    if (m.t === 'broadcast' && m.event === 'motion' && i !== lastMotionIdx) continue;
    out.push(m);
  }
  return out;
}
