import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query('select start_today() as n');
  return NextResponse.json({ n: rows[0].n as number });
}

export async function POST() {
  const { rows } = await pool.query('select inc_burned() as n');
  return NextResponse.json({ n: rows[0].n as number });
}
