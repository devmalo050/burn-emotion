export function relayHttpOrigin(
  env: Record<string, string | undefined> = process.env,
): string {
  const explicit = env.REALTIME_HTTP_ORIGIN;
  if (explicit) return explicit.replace(/\/+$/, '');
  const ws = env.NEXT_PUBLIC_WS_URL ?? '';
  if (ws.startsWith('wss://')) return 'https://' + ws.slice(6).replace(/\/+$/, '');
  if (ws.startsWith('ws://')) return 'http://' + ws.slice(5).replace(/\/+$/, '');
  return '';
}
