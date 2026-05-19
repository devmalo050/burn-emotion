-- 인내의 숲(점프맵) 이스터에그 — 글로벌 TOP 10 리더보드.
-- 점수는 도달한 높이(미터). 클수록 좋음.
-- Supabase Dashboard → SQL Editor 에 통째로 실행 (재실행 안전).

drop function if exists public.submit_jump_record(text, numeric);
drop function if exists public.get_jump_top10();

create table if not exists public.jump_leaderboard (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  height numeric not null,
  created_at timestamptz not null default now()
);

alter table public.jump_leaderboard enable row level security;

drop policy if exists "read jump_leaderboard" on public.jump_leaderboard;
create policy "read jump_leaderboard"
  on public.jump_leaderboard for select using (true);

-- INSERT + TOP10 외 즉시 삭제 + TOP10 반환 (cap-and-prune)
create function public.submit_jump_record(
  p_nick text,
  p_height numeric
)
returns table(nick text, height numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_nick is null or length(trim(p_nick)) = 0 or length(p_nick) > 64 then
    raise exception 'invalid nick';
  end if;
  if p_height is null or p_height < 0 or p_height > 1000000 then
    raise exception 'invalid height';
  end if;

  insert into public.jump_leaderboard (nick, height)
  values (trim(p_nick), p_height);

  delete from public.jump_leaderboard
  where id not in (
    select sub.id from public.jump_leaderboard sub
    order by sub.height desc, sub.created_at asc
    limit 10
  );

  return query
  select m.nick, m.height
  from public.jump_leaderboard m
  order by m.height desc, m.created_at asc
  limit 10;
end;
$$;

create function public.get_jump_top10()
returns table(nick text, height numeric)
language sql
stable
security definer
set search_path = public
as $$
  select nick, height
  from public.jump_leaderboard
  order by height desc, created_at asc
  limit 10
$$;

revoke all on function public.submit_jump_record(text, numeric) from public;
revoke all on function public.get_jump_top10() from public;
grant execute on function public.submit_jump_record(text, numeric) to anon, authenticated;
grant execute on function public.get_jump_top10() to anon, authenticated;
