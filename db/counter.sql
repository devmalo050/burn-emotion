-- 오늘 구워진 고구마 카운터. psql 로 통째 실행 (재실행 안전).
drop function if exists public.inc_burned();
drop function if exists public.start_today();

create table if not exists public.daily_counter (
  day date primary key default current_date,
  burned int not null default 0
);

-- 오늘 행을 보장하고 현재 카운트를 반환
create function public.start_today()
returns int
language plpgsql
as $$
declare
  n int;
begin
  insert into public.daily_counter (day, burned)
  values (current_date, 0)
  on conflict (day) do nothing;
  select burned into n from public.daily_counter where day = current_date;
  return coalesce(n, 0);
end;
$$;

-- 오늘 카운트를 1 증가시키고 새 값 반환
create function public.inc_burned()
returns int
language plpgsql
as $$
declare
  n int;
begin
  insert into public.daily_counter (day, burned)
  values (current_date, 1)
  on conflict (day) do update set burned = public.daily_counter.burned + 1
  returning burned into n;
  return n;
end;
$$;
