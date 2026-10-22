-- MDKR v2 / first-stage closed beta. Run in Supabase SQL Editor.
-- IMPORTANT: test on staging first; no existing table is altered by this migration.
create table if not exists public.mdkr_ladder_testers(
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
create table if not exists public.mdkr_ladder_catalog(
  chart_id text primary key, level int not null check(level between 7 and 12),
  enabled boolean not null default true
);
create table if not exists public.mdkr_ladder_queue(
  user_id uuid primary key references auth.users(id) on delete cascade,
  min_level int not null check(min_level between 7 and 12),
  max_level int not null check(max_level between 7 and 12),
  onepick text not null references public.mdkr_ladder_catalog(chart_id),
  joined_at timestamptz not null default now(),
  check(min_level<=max_level)
);
create table if not exists public.mdkr_ladder_matches(
  id bigint generated always as identity primary key,
  user_a uuid not null references auth.users(id), user_b uuid not null references auth.users(id),
  choices text[] not null, rounds text[], phase text not null default 'ban' check(phase in ('ban','rounds','closed')),
  created_at timestamptz not null default now(),
  check(user_a<>user_b)
);
create table if not exists public.mdkr_ladder_bans(
  match_id bigint not null references public.mdkr_ladder_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  chart_id text not null,
  primary key(match_id,user_id)
);
create unique index if not exists mdkr_ladder_open_a on public.mdkr_ladder_matches(user_a) where phase<>'closed';
create unique index if not exists mdkr_ladder_open_b on public.mdkr_ladder_matches(user_b) where phase<>'closed';
create index if not exists mdkr_ladder_queue_order on public.mdkr_ladder_queue(joined_at);

alter table public.mdkr_ladder_testers enable row level security;
alter table public.mdkr_ladder_catalog enable row level security;
alter table public.mdkr_ladder_queue enable row level security;
alter table public.mdkr_ladder_matches enable row level security;
alter table public.mdkr_ladder_bans enable row level security;
revoke all on public.mdkr_ladder_testers,public.mdkr_ladder_queue,public.mdkr_ladder_matches,public.mdkr_ladder_bans from anon,authenticated;
grant select on public.mdkr_ladder_testers to authenticated;
-- A logged-in user can only read whether their own user ID is approved.
drop policy if exists mdkr_ladder_testers_own on public.mdkr_ladder_testers;
create policy mdkr_ladder_testers_own on public.mdkr_ladder_testers for select to authenticated using(user_id=auth.uid());
-- Catalog is populated by administrator SQL, readable by members.
grant select on public.mdkr_ladder_catalog to authenticated;
drop policy if exists mdkr_ladder_catalog_read on public.mdkr_ladder_catalog;
create policy mdkr_ladder_catalog_read on public.mdkr_ladder_catalog for select to authenticated using(true);

create or replace function public.mdkr_ladder_join(p_min int,p_max int,p_onepick text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid:=auth.uid(); other public.mdkr_ladder_queue%rowtype; c text[]; lo int; hi int; n bigint;
begin
 if me is null then raise exception '로그인 필요';end if;
 if p_min<7 or p_max>12 or p_min>p_max or p_min is null or p_max is null then raise exception '잘못된 난이도 범위';end if;
 if not exists(select 1 from public.mdkr_ladder_catalog where chart_id=p_onepick and level between p_min and p_max and enabled) then raise exception '원픽이 선택 범위에 없거나 악곡 카탈로그가 준비되지 않았습니다.';end if;
 perform pg_advisory_xact_lock(704020);
 if exists(select 1 from public.mdkr_ladder_matches where phase<>'closed' and (user_a=me or user_b=me)) then raise exception '이미 진행 중인 매치가 있습니다.';end if;
 insert into public.mdkr_ladder_queue(user_id,min_level,max_level,onepick,joined_at) values(me,p_min,p_max,p_onepick,now())
 on conflict(user_id) do update set min_level=excluded.min_level,max_level=excluded.max_level,onepick=excluded.onepick,joined_at=excluded.joined_at;
 for other in select q.* from public.mdkr_ladder_queue q
 where q.user_id<>me and q.max_level>=p_min and q.min_level<=p_max

 and not exists(select 1 from public.mdkr_ladder_matches m where m.phase<>'closed' and (m.user_a=q.user_id or m.user_b=q.user_id))
 order by q.joined_at loop
  lo:=greatest(p_min,other.min_level); hi:=least(p_max,other.max_level);
  if not exists(select 1 from public.mdkr_ladder_catalog where chart_id=p_onepick and level between lo and hi and enabled)
     or not exists(select 1 from public.mdkr_ladder_catalog where chart_id=other.onepick and level between lo and hi and enabled) then continue;end if;
  select array_agg(chart_id order by is_first desc,rnd) into c from (
     select p_onepick chart_id,true is_first,0.0 rnd
     union all select other.onepick,true,0.0 where other.onepick<>p_onepick
     union all select chart_id,false,random() from public.mdkr_ladder_catalog
       where level between lo and hi and enabled and chart_id<>p_onepick and chart_id<>other.onepick
  ) pool;
  -- The first two positions are fixed picks; remaining positions randomly shuffled.
  if cardinality(c)<5 then continue;end if;
  c:=c[1:5];
  insert into public.mdkr_ladder_matches(user_a,user_b,choices) values(other.user_id,me,c) returning id into n;
  delete from public.mdkr_ladder_queue where user_id in(me,other.user_id);
  exit;
 end loop;
end $$;
create or replace function public.mdkr_ladder_cancel() returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception '로그인 필요';end if;
 delete from public.mdkr_ladder_queue where user_id=auth.uid();
end $$;
create or replace function public.mdkr_ladder_state() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid:=auth.uid(); m public.mdkr_ladder_matches%rowtype; myban text; isqueued bool;
begin
 if me is null then return jsonb_build_object('status','anonymous');end if;

 select * into m from public.mdkr_ladder_matches where phase<>'closed' and (user_a=me or user_b=me) order by id desc limit 1;
 if found then
  select chart_id into myban from public.mdkr_ladder_bans where match_id=m.id and user_id=me;
  return jsonb_build_object('status','matched','match_id',m.id,'phase',m.phase,'charts',case when m.phase='ban' then m.choices else m.rounds end,'my_ban_submitted',myban is not null);
 end if;
 select exists(select 1 from public.mdkr_ladder_queue where user_id=me) into isqueued;
 return jsonb_build_object('status',case when isqueued then 'queued' else 'idle' end);
end $$;
create or replace function public.mdkr_ladder_ban(p_chart_id text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid:=auth.uid(); m public.mdkr_ladder_matches%rowtype; b1 text;b2 text;pool text[]; result text[];
begin
 if me is null then raise exception '로그인 필요';end if;
 perform pg_advisory_xact_lock(704021);
 select * into m from public.mdkr_ladder_matches where phase='ban' and (user_a=me or user_b=me) order by id desc limit 1 for update;
 if not found then raise exception '밴 가능한 매치가 없습니다.';end if;
 if p_chart_id is null or not(p_chart_id=any(m.choices)) then raise exception '선택할 수 없는 채보입니다.';end if;
 insert into public.mdkr_ladder_bans(match_id,user_id,chart_id) values(m.id,me,p_chart_id) on conflict(match_id,user_id) do nothing;
 if (select count(*) from public.mdkr_ladder_bans where match_id=m.id)=2 then
  select chart_id into b1 from public.mdkr_ladder_bans where match_id=m.id and user_id=m.user_a;
  select chart_id into b2 from public.mdkr_ladder_bans where match_id=m.id and user_id=m.user_b;
  select array_agg(x) into pool from unnest(m.choices) x where x<>b1 and x<>b2;
  if cardinality(pool)=4 then
    select array_agg(x) into result from (select unnest(pool) x order by random() limit 3) z;
  else result:=pool;end if;
  -- hide raw bans from clients; expose only final three charts.
  update public.mdkr_ladder_matches set rounds=result,phase='rounds' where id=m.id;
 end if;
end $$;
revoke all on function public.mdkr_ladder_join(int,int,text),public.mdkr_ladder_cancel(),public.mdkr_ladder_state(),public.mdkr_ladder_ban(text) from public,anon;
grant execute on function public.mdkr_ladder_join(int,int,text),public.mdkr_ladder_cancel(),public.mdkr_ladder_state(),public.mdkr_ladder_ban(text) to authenticated;
-- Add your approved user UUID as an administrator in SQL Editor:
-- insert into public.mdkr_ladder_testers(user_id) values ('YOUR_AUTH_USER_UUID') on conflict do nothing;
-- Next: run ladder_catalog_seed.sql after importing MuseDash.moe songs.

-- PUBLIC OPEN TEST: participants may close their own test matches to queue again.
-- No Elo is assigned. A match may be closed by either participant.
create or replace function public.mdkr_ladder_close(p_match_id bigint)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception '로그인 필요'; end if;
  update public.mdkr_ladder_matches set phase='closed'
  where id=p_match_id and phase in ('ban','rounds')
    and (user_a=auth.uid() or user_b=auth.uid());
  if not found then raise exception '종료할 수 있는 매치가 없습니다'; end if;
end $$;
revoke all on function public.mdkr_ladder_close(bigint) from public,anon;
grant execute on function public.mdkr_ladder_close(bigint) to authenticated;
