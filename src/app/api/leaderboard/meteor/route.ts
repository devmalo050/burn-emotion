import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query(
    'select nick, seconds::float8 as seconds from get_meteor_top10()',
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nick = typeof body?.nick === 'string' ? body.nick : '';
  const seconds = Number(body?.seconds);
  if (!nick || !Number.isFinite(seconds)) {
    return NextResponse.json({ error: 'bad input' }, { status: 400 });
  }
  try {
    const { rows } = await pool.query(
      'select nick, seconds::float8 as seconds from submit_meteor_record($1, $2)',
      [nick, seconds],
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'rejected' }, { status: 400 });
  }
}
