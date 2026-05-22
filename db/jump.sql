-- 우주를 줄게(점프맵) — 글로벌 TOP 10 리더보드. psql 로 통째 실행 (재실행 안전).
drop function if exists public.submit_jump_record(text, numeric);
drop function if exists public.get_jump_top10();

create table if not exists public.jump_leaderboard (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  height numeric not null,
  created_at timestamptz not null default now()
);

create function public.submit_jump_record(
  p_nick text,
  p_height numeric
)
returns table(nick text, height numeric)
language plpgsql
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
as $$
  select nick, height
  from public.jump_leaderboard
  order by height desc, created_at asc
  limit 10
$$;
