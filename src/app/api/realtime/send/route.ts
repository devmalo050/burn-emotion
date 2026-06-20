import { relayHttpOrigin } from '@/lib/realtime/relay-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const origin = relayHttpOrigin();
  if (!origin) return new Response('realtime not configured', { status: 503 });

  const sid = new URL(req.url).searchParams.get('sid') ?? '';
  const secret = process.env.REALTIME_PROXY_SECRET;
  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${origin}/send?sid=${encodeURIComponent(sid)}`, {
      method: 'POST',
      headers: secret
        ? { 'x-realtime-secret': secret, 'content-type': 'application/json' }
        : { 'content-type': 'application/json' },
      body,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
  return new Response(null, { status: upstream.status });
}
