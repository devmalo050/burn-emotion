-- 별똥별 피하기 이스터에그 — 글로벌 TOP 10 리더보드.
-- Supabase Dashboard → SQL Editor 에서 통째로 실행 (재실행 안전).

-- 1. 기존 함수가 있으면 권한 꼬임 방지를 위해 일단 drop
drop function if exists public.submit_meteor_record(text, numeric);
drop function if exists public.get_meteor_top10();

-- 2. 테이블
create table if not exists public.meteor_leaderboard (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  seconds numeric not null,
  created_at timestamptz not null default now()
);

alter table public.meteor_leaderboard enable row level security;

drop policy if exists "read meteor_leaderboard" on public.meteor_leaderboard;
create policy "read meteor_leaderboard"
  on public.meteor_leaderboard for select using (true);

-- 3. 새 기록 제출 + TOP 10 만 유지 + TOP 10 반환
create function public.submit_meteor_record(
  p_nick text,
  p_seconds numeric
)
returns table(nick text, seconds numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_nick is null or length(trim(p_nick)) = 0 or length(p_nick) > 64 then
    raise exception 'invalid nick';
  end if;
  if p_seconds is null or p_seconds < 0 or p_seconds > 86400 then
    raise exception 'invalid seconds';
  end if;

  insert into public.meteor_leaderboard (nick, seconds)
  values (trim(p_nick), p_seconds);

  -- OUT 파라미터 이름(seconds, nick)과 컬럼 이름이 같아서 PL/pgSQL 이 헷갈림.
  -- 모든 컬럼 참조에 alias prefix 붙여서 ambiguous 해결.
  delete from public.meteor_leaderboard
  where id not in (
    select sub.id from public.meteor_leaderboard sub
    order by sub.seconds desc, sub.created_at asc
    limit 10
  );

  return query
  select m.nick, m.seconds
  from public.meteor_leaderboard m
  order by m.seconds desc, m.created_at asc
  limit 10;
end;
$$;

-- 4. 게임 진입 전/후 조회용
create function public.get_meteor_top10()
returns table(nick text, seconds numeric)
language sql
stable
security definer
set search_path = public
as $$
  select nick, seconds
  from public.meteor_leaderboard
  order by seconds desc, created_at asc
  limit 10
$$;

-- 5. 권한 — Supabase PostgREST 가 anon role 로 호출. 명시적으로 grant 필요.
revoke all on function public.submit_meteor_record(text, numeric) from public;
revoke all on function public.get_meteor_top10() from public;
grant execute on function public.submit_meteor_record(text, numeric) to anon, authenticated;
grant execute on function public.get_meteor_top10() to anon, authenticated;
