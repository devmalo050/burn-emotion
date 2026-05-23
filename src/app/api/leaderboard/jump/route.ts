import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query(
    'select nick, height::float8 as height from get_jump_top10()',
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nick = typeof body?.nick === 'string' ? body.nick : '';
  const height = Number(body?.height);
  if (!nick || !Number.isFinite(height)) {
    return NextResponse.json({ error: 'bad input' }, { status: 400 });
  }
  try {
    const { rows } = await pool.query(
      'select nick, height::float8 as height from submit_jump_record($1, $2)',
      [nick, height],
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'rejected' }, { status: 400 });
  }
}
