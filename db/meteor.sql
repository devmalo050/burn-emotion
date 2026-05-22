-- 별똥별 피하기 — 글로벌 TOP 10 리더보드. psql 로 통째 실행 (재실행 안전).
drop function if exists public.submit_meteor_record(text, numeric);
drop function if exists public.get_meteor_top10();

create table if not exists public.meteor_leaderboard (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  seconds numeric not null,
  created_at timestamptz not null default now()
);

-- 새 기록 제출 + TOP10 외 즉시 삭제 + TOP10 반환 (cap-and-prune)
create function public.submit_meteor_record(
  p_nick text,
  p_seconds numeric
)
returns table(nick text, seconds numeric)
language plpgsql
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

create function public.get_meteor_top10()
returns table(nick text, seconds numeric)
language sql
stable
as $$
  select nick, seconds
  from public.meteor_leaderboard
  order by seconds desc, created_at asc
  limit 10
$$;
