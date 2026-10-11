-- MDKR RECORDS v0.5: 프로필, 칭호, 왕좌 이벤트
-- v0.4가 먼저 설치되어 있어야 합니다. SQL Editor에서 한 번 실행하십시오.

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists equipped_title_id text;
-- 직접 UPDATE로 미획득 칭호를 장착하는 것을 막고 RPC만 장착 허용
revoke update on public.profiles from authenticated;
grant update(nickname,avatar_url) on public.profiles to authenticated;

create table if not exists public.mdkr_title_catalog (
  id text primary key, name text not null, rarity text not null check(rarity in ('COMMON','RARE','EPIC','LEGENDARY')),
  description text not null default ''
);
insert into public.mdkr_title_catalog(id,name,rarity,description) values
('common_0','용감한','COMMON','승인된 기록·프로필 활동 조건'),
('common_1','매운','COMMON','승인된 기록·프로필 활동 조건'),
('common_2','달콤한','COMMON','승인된 기록·프로필 활동 조건'),
('common_3','짠','COMMON','승인된 기록·프로필 활동 조건'),
('common_4','멋있는','COMMON','승인된 기록·프로필 활동 조건'),
('common_5','친절한','COMMON','승인된 기록·프로필 활동 조건'),
('common_6','배고픈','COMMON','승인된 기록·프로필 활동 조건'),
('common_7','기쁜','COMMON','승인된 기록·프로필 활동 조건'),
('common_8','안전한','COMMON','승인된 기록·프로필 활동 조건'),
('common_9','비싼','COMMON','승인된 기록·프로필 활동 조건'),
('common_10','바쁜','COMMON','승인된 기록·프로필 활동 조건'),
('common_11','귀여운','COMMON','승인된 기록·프로필 활동 조건'),
('common_12','예쁜','COMMON','승인된 기록·프로필 활동 조건'),
('common_13','여성','COMMON','승인된 기록·프로필 활동 조건'),
('common_14','남성','COMMON','승인된 기록·프로필 활동 조건'),
('common_15','시끄러운','COMMON','승인된 기록·프로필 활동 조건'),
('common_16','위험한','COMMON','승인된 기록·프로필 활동 조건'),
('common_17','유명한','COMMON','승인된 기록·프로필 활동 조건'),
('common_18','오래된','COMMON','승인된 기록·프로필 활동 조건'),
('common_19','늙은','COMMON','승인된 기록·프로필 활동 조건'),
('common_20','젊은','COMMON','승인된 기록·프로필 활동 조건'),
('common_21','아픈','COMMON','승인된 기록·프로필 활동 조건'),
('common_22','깨끗한','COMMON','승인된 기록·프로필 활동 조건'),
('common_23','더러운','COMMON','승인된 기록·프로필 활동 조건'),
('common_24','신선한','COMMON','승인된 기록·프로필 활동 조건'),
('common_25','무거운','COMMON','승인된 기록·프로필 활동 조건'),
('common_26','가벼운','COMMON','승인된 기록·프로필 활동 조건'),
('common_27','행복한','COMMON','승인된 기록·프로필 활동 조건'),
('common_28','시원한','COMMON','승인된 기록·프로필 활동 조건'),
('common_29','딱딱한','COMMON','승인된 기록·프로필 활동 조건'),
('common_30','목마른','COMMON','승인된 기록·프로필 활동 조건'),
('common_31','뜨거운','COMMON','승인된 기록·프로필 활동 조건'),
('common_32','차가운','COMMON','승인된 기록·프로필 활동 조건'),
('common_33','중요한','COMMON','승인된 기록·프로필 활동 조건'),
('common_34','아름다운','COMMON','승인된 기록·프로필 활동 조건'),
('common_35','피곤한','COMMON','승인된 기록·프로필 활동 조건'),
('common_36','졸린','COMMON','승인된 기록·프로필 활동 조건'),
('common_37','추운','COMMON','승인된 기록·프로필 활동 조건'),
('common_38','더운','COMMON','승인된 기록·프로필 활동 조건'),
('epic_0','완벽주의자','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_1','박애주의','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_2','안녕하세요','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_3','선수','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_4','챔피언','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_5','로드','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_6','왕','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_7','여왕','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_8','마왕','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_9','악마','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_10','천사','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_11','지배자','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_12','정복자','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_13','불멸자','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_14','도전자','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_15','초월자','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_16','전설','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_17','영웅','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_18','황제','EPIC','승인된 기록·전일 경쟁 업적'),
('epic_19','구원자','EPIC','승인된 기록·전일 경쟁 업적'),
('legend_0','MUSE DASH','LEGENDARY','특별 업적'),
('legend_1','PEROPERO','LEGENDARY','특별 업적'),
('legend_2','벽','LEGENDARY','특별 업적'),
('legend_3','1등','LEGENDARY','특별 업적'),
('legend_4','로봇','LEGENDARY','특별 업적'),
('legend_5','인간승리','LEGENDARY','특별 업적')
on conflict(id) do update set name=excluded.name,rarity=excluded.rarity,description=excluded.description;

create table if not exists public.mdkr_throne_events (
  id bigint generated always as identity primary key,
  chart_id text not null,
  new_holder_id uuid not null references auth.users(id),
  old_holder_id uuid references auth.users(id),
  submission_id uuid not null references public.submissions(id),
  created_at timestamptz not null default now()
);
create table if not exists public.mdkr_throne_losses (
  id bigint generated always as identity primary key,
  chart_id text not null,
  loser_id uuid not null references auth.users(id),
  winner_id uuid not null references auth.users(id),
  event_id bigint not null references public.mdkr_throne_events(id),
  reclaimed_at timestamptz,
  reclaimed_event_id bigint references public.mdkr_throne_events(id)
);
create table if not exists public.mdkr_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  actor_id uuid references auth.users(id),
  chart_id text not null,
  type text not null check(type in ('OVERTAKEN','RECLAIMED')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists mdkr_notif_user_idx on public.mdkr_notifications(user_id,created_at desc);

alter table public.mdkr_title_catalog enable row level security;
alter table public.mdkr_throne_events enable row level security;
alter table public.mdkr_throne_losses enable row level security;
alter table public.mdkr_notifications enable row level security;
drop policy if exists mdkr_titles_public on public.mdkr_title_catalog;
create policy mdkr_titles_public on public.mdkr_title_catalog for select to anon,authenticated using(true);
drop policy if exists mdkr_throne_public on public.mdkr_throne_events;
create policy mdkr_throne_public on public.mdkr_throne_events for select to anon,authenticated using(true);
drop policy if exists mdkr_losses_public on public.mdkr_throne_losses;
create policy mdkr_losses_public on public.mdkr_throne_losses for select to anon,authenticated using(true);
drop policy if exists mdkr_notif_self on public.mdkr_notifications;
create policy mdkr_notif_self on public.mdkr_notifications for select to authenticated using(user_id=(select auth.uid()));
grant select on public.mdkr_title_catalog, public.mdkr_throne_events, public.mdkr_throne_losses to anon,authenticated;
grant select on public.mdkr_notifications to authenticated;

-- 개인 최고 점수에 새 이론치가 도전하면 시간 순서로 단독 순위 (동점 공동 1위 없음).
-- 뷰 이름과 컬럼은 v0.4 인터페이스 유지
drop view if exists public.mdkr_player_stats;
drop view if exists public.mdkr_rankings;
create or replace view public.mdkr_rankings with (security_invoker=true) as
with best as (
  select s.*,
         coalesce(s.great,0) as great0,
         coalesce(s.miss,0) as miss0,
         (coalesce(s.early,0)+coalesce(s.late,0)+coalesce(s.great,0)+coalesce(s.miss,0)*2) as detail_score,
         row_number() over(
           partition by s.chart_id, s.user_id
           order by (coalesce(s.early,0)+coalesce(s.late,0)+coalesce(s.great,0)+coalesce(s.miss,0)*2),
                    case s.judge when 'AP' then 0 when 'FC' then 1 else 2 end,
                    s.created_at desc, s.id desc
         ) as personal_num
  from public.submissions s
  where s.status='APPROVED'
), placed as (
  select best.*,
         row_number() over(
           partition by best.chart_id
           order by best.detail_score,
                    case best.judge when 'AP' then 0 when 'FC' then 1 else 2 end, best.created_at desc, best.id desc
         ) as rank
  from best
  where personal_num=1
)
select p.id, p.user_id, p.chart_id, p.song_title, p.level, p.chart_type,
       p.judge, p.accuracy, p.early, p.late, p.great0 as great, p.miss0 as miss,
       p.detail_score, p.created_at, p.rank,
       pr.nickname, pr.avatar_url
from placed p
join public.profiles pr on pr.id=p.user_id;

grant select on public.mdkr_rankings to anon, authenticated;

drop view if exists public.mdkr_player_stats;
create or replace view public.mdkr_player_stats with (security_invoker=true) as
with ranked as (
  select * from public.mdkr_rankings
), agg as (
  select
    user_id,
    count(*) filter (where rank=1) as total_firsts,
    count(*) filter (where rank<=10) as top10_count,
    count(*) filter (where judge='AP') as ap_count,
    count(*) as charts_count,
    avg(accuracy) filter (where accuracy is not null) as avg_accuracy,
    avg(early::numeric) as avg_early,
    avg(late::numeric) as avg_late,
    avg((early+late)::numeric) as avg_el,
    avg(detail_score::numeric) as avg_detail,
    sum(
      (case coalesce(level,10) when 10 then 100 when 11 then 180 when 12 then 300 else 100 end) +
      (case rank when 1 then 80 when 2 then 60 when 3 then 45 when 4 then 35 when 5 then 30 when 6 then 26 when 7 then 22 when 8 then 18 when 9 then 14 when 10 then 10 else 0 end) +
      (case judge when 'AP' then 40 when 'FC' then 20 else 0 end) +
      greatest(0, 20 - detail_score) +
      greatest(0, floor((coalesce(accuracy,95) - 95) * 4))
    )::numeric as points
  from ranked
  group by user_id
)
select pr.id as user_id, pr.nickname, pr.avatar_url,
       coalesce(a.total_firsts,0) as total_firsts,
       coalesce(a.top10_count,0) as top10_count,
       coalesce(a.ap_count,0) as ap_count,
       coalesce(a.charts_count,0) as charts_count,
       a.avg_accuracy, a.avg_early, a.avg_late, a.avg_el, a.avg_detail,
       coalesce(a.points,0) as points
from public.profiles pr
left join agg a on a.user_id=pr.id;

grant select on public.mdkr_player_stats to anon, authenticated;


-- 과거 검수 기록의 순위 변경을 추정하지 않습니다. v0.5 이후 승인부터 이력 저장.
create or replace function public.mdkr_record_throne_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare prev record; best record; event_key bigint; loss_row bigint;
begin
 if old.status='APPROVED' or new.status<>'APPROVED' then return new; end if;
 -- 승인 후 새 1위의 제출이 방금 승인한 레코드인지 검증
 select id,user_id into best from public.mdkr_rankings where chart_id=new.chart_id and rank=1 limit 1;
 if best.id is distinct from new.id then return new; end if;
 -- 기존 1위(방금 승인된 신규 기록 제외)를 다시 계산
 select s.id,s.user_id into prev from public.submissions s
 where s.chart_id=new.chart_id and s.status='APPROVED' and s.id<>new.id
 order by (s.early+s.late+s.great+2*s.miss),
          case s.judge when 'AP' then 0 when 'FC' then 1 else 2 end,
          s.created_at desc, s.id desc limit 1;
 if prev.user_id is not distinct from new.user_id then return new; end if;
 insert into public.mdkr_throne_events(chart_id,new_holder_id,old_holder_id,submission_id)
 values(new.chart_id,new.user_id,prev.user_id,new.id) returning id into event_key;
 if prev.user_id is not null then
   insert into public.mdkr_throne_losses(chart_id,loser_id,winner_id,event_id)
   values(new.chart_id,prev.user_id,new.user_id,event_key);
   insert into public.mdkr_notifications(user_id,actor_id,chart_id,type)
   values(prev.user_id,new.user_id,new.chart_id,'OVERTAKEN');
 end if;
 -- 각 추월 사건별로 최초 재탈환만 연결. 이번 탈환 하나로 사건 하나만 해결.
 select id into loss_row from public.mdkr_throne_losses
 where chart_id=new.chart_id and loser_id=new.user_id and reclaimed_at is null
 order by id asc limit 1 for update;
 if loss_row is not null then
   update public.mdkr_throne_losses set reclaimed_at=now(),reclaimed_event_id=event_key where id=loss_row;
   insert into public.mdkr_notifications(user_id,actor_id,chart_id,type)
   values(new.user_id,prev.user_id,new.chart_id,'RECLAIMED');
 end if;
 return new;
end;
$$;
drop trigger if exists mdkr_throne_approval on public.submissions;
create trigger mdkr_throne_approval after update of status on public.submissions
for each row when(old.status='PENDING' and new.status='APPROVED')
execute function public.mdkr_record_throne_change();

-- 얻을 수 있는 칭호 목록은 서버에서 계산. 과거 승인 기록 기준.
create or replace function public.mdkr_available_titles(p_user_id uuid)
returns table(title_id text,name text,rarity text,description text,unlocked boolean)
language sql stable security definer set search_path='' as $$
 with r as (
  select s.*, (s.early+s.late+s.great+2*s.miss) as detail
  from public.submissions s where s.user_id=p_user_id and s.status='APPROVED'
 ), summary as (
  select count(distinct chart_id) charts,
   count(distinct chart_id) filter(where judge='AP') aps,
   count(distinct chart_id) filter(where level=12) lv12,
   count(distinct chart_id) filter(where level=12 and judge='AP') lv12ap,
   count(distinct chart_id) filter(where level=11 and judge='AP') lv11ap,
   count(distinct chart_id) filter(where level=10 and judge='AP') lv10ap,
   count(*) filter(where judge='OTHER') others,
   count(*) filter(where judge='AP' and early+late=0 and great=0 and miss=0) perfects,
   count(*) filter(where judge='AP') ap_rows,
   avg(early+late) filter(where judge='AP') avg_el,
   count(*) filter(where extract(hour from created_at at time zone 'Asia/Seoul') between 2 and 4) night_rows,
   count(*) filter(where extract(month from created_at at time zone 'Asia/Seoul') in (12,1,2)) winter_rows,
   count(*) filter(where extract(month from created_at at time zone 'Asia/Seoul') in (6,7,8)) summer_rows
  from r
 ), rankstat as (
  select count(*) filter(where rank=1) wins,count(*) filter(where rank<=10) top10,
   count(*) filter(where rank=1 and level=12) lv12wins
  from public.mdkr_rankings where user_id=p_user_id
 ), events as (
  select count(*) lost,count(*) filter(where reclaimed_at is not null) recaptured
  from public.mdkr_throne_losses where loser_id=p_user_id
 ), profile as (select created_at from public.profiles where id=p_user_id)
 select c.id,c.name,c.rarity,c.description,
  case
  when c.rarity='COMMON' then case c.name
   when '기쁜' then sm.charts>=1
   when '용감한' then sm.lv12>=1
   when '매운' then sm.lv12>=3
   when '달콤한' then sm.aps>=5
   when '멋있는' then rs.wins>=3
   when '친절한' then sm.charts>=10
   when '배고픈' then sm.charts>=20
   when '안전한' then sm.aps>=10
   when '비싼' then coalesce((select points from public.mdkr_player_stats where user_id=p_user_id),0)>=10000
   when '귀여운' then exists(select 1 from public.profiles where id=p_user_id and nickname <> 'Player')
   when '예쁜' then sm.aps>=3
   when '여성' then true
   when '남성' then true
   when '시끄러운' then sm.charts>=30
   when '위험한' then rs.lv12wins>=1
   when '유명한' then rs.wins>=10
   when '오래된' then (select created_at from profile)<=now()-interval '30 days'
   when '늙은' then (select created_at from profile)<=now()-interval '180 days'
   when '젊은' then exists(select 1 from r where created_at<=(select created_at+interval '7 days' from profile))
   when '깨끗한' then sm.perfects>=1
   when '더러운' then sm.others>=5
   when '신선한' then exists(select 1 from r where created_at<=(select created_at+interval '24 hours' from profile))
   when '무거운' then sm.lv12>=10
   when '가벼운' then (select count(distinct chart_id) from r where level=10)>=10
   when '행복한' then ev.recaptured>=3
   when '목마른' then ev.lost>=1
   when '중요한' then rs.top10>=50
   when '아름다운' then sm.lv11ap+sm.lv12ap>=20
   when '졸린' then sm.night_rows>=1
   when '추운' then sm.winter_rows>=1
   when '더운' then sm.summer_rows>=1
   else false end
  when c.rarity='EPIC' then case c.name
   when '완벽주의자' then sm.aps>=100
   when '박애주의' then sm.lv10ap>=10 and sm.lv11ap>=10 and sm.lv12ap>=10
   when '안녕하세요' then sm.charts>=1 and (select created_at from profile)<=now()-interval '30 days'
   when '선수' then sm.charts>=100
   when '챔피언' then rs.wins>=10
   when '로드' then ev.recaptured>=20
   when '왕' then rs.wins>=30
   when '여왕' then rs.wins>=30
   when '마왕' then rs.lv12wins>=5
   when '악마' then sm.lv12ap>=10
   when '천사' then sm.aps>=100 and sm.avg_el<=3
   when '도전자' then ev.recaptured>=10
   when '초월자' then exists(select 1 from r where level=12 and judge='AP' and detail=0)
   when '구원자' then (select count(distinct chart_id) from public.mdkr_throne_losses where loser_id=p_user_id and reclaimed_at is not null)>=20
   when '황제' then rs.wins>=50
   when '전설' then rs.wins>=50
   else false end
  when c.rarity='LEGENDARY' then case c.name
   when '벽' then exists(select 1 from r where level=12 and judge='AP' and detail=0)
   when '1등' then rs.wins>=100
   when '로봇' then (select count(distinct chart_id) from r where judge='AP' and detail=0)>=30
   when '인간승리' then ev.recaptured>=30
   else false end
  else false end as unlocked
 from public.mdkr_title_catalog c cross join summary sm cross join rankstat rs cross join events ev
 union all
 select 'rare_'||split_part(s.chart_id,':',1),max(coalesce(s.song_title,s.chart_id)),'RARE','해당 악곡 FC 이상',true
 from r s where s.judge in ('AP','FC') and s.miss=0
 group by split_part(s.chart_id,':',1)
 union all
 select 'legend_song_'||split_part(s.chart_id,':',1),max(coalesce(s.song_title,s.chart_id)),'LEGENDARY','Lv.12 AP',true
 from r s where s.level=12 and s.judge='AP' and s.great=0 and s.miss=0
 group by split_part(s.chart_id,':',1);
$$;
revoke all on function public.mdkr_available_titles(uuid) from public;
grant execute on function public.mdkr_available_titles(uuid) to anon,authenticated;

create or replace function public.mdkr_save_profile(p_nickname text,p_bio text,p_title_id text)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if length(trim(coalesce(p_nickname,''))) not between 2 and 24 then raise exception 'BAD_NICKNAME'; end if;
 if length(coalesce(p_bio,''))>160 then raise exception 'BIO_TOO_LONG'; end if;
 if p_title_id is not null and not exists(
  select 1 from public.mdkr_available_titles(v_uid) t where t.title_id=p_title_id and t.unlocked
 ) then raise exception 'TITLE_LOCKED'; end if;
 update public.profiles set nickname=trim(p_nickname),bio=coalesce(p_bio,''),equipped_title_id=p_title_id where id=v_uid;
 if not found then raise exception 'PROFILE_MISSING'; end if;
end;
$$;
revoke all on function public.mdkr_save_profile(text,text,text) from public;
grant execute on function public.mdkr_save_profile(text,text,text) to authenticated;

create or replace function public.mdkr_mark_notifications_read()
returns void language sql security definer set search_path='' as $$
 update public.mdkr_notifications set read_at=now() where user_id=auth.uid() and read_at is null;
$$;
revoke all on function public.mdkr_mark_notifications_read() from public;
grant execute on function public.mdkr_mark_notifications_read() to authenticated;
