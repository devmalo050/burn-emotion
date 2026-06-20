import { relayHttpOrigin } from '@/lib/realtime/relay-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const origin = relayHttpOrigin();
  if (!origin) return new Response('realtime not configured', { status: 503 });

  const sid = new URL(req.url).searchParams.get('sid') ?? '';
  const secret = process.env.REALTIME_PROXY_SECRET;

  let upstream: Response;
  try {
    upstream = await fetch(`${origin}/sse?sid=${encodeURIComponent(sid)}`, {
      headers: secret ? { 'x-realtime-secret': secret } : {},
      signal: req.signal,
    });
  } catch {
    return new Response('upstream unreachable', { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response('upstream error', { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
