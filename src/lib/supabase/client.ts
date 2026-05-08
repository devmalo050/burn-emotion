import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

let cached: SupabaseClient | null = null;

/**
 * 브라우저 전용 Supabase 클라이언트 — broadcast + presence 만 씀.
 * 환경 변수 없으면 null 반환해서 호출부에서 가짜 트래픽 폴백 가능.
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (cached) return cached;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  cached = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return cached;
}

export const isSupabaseConfigured = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
