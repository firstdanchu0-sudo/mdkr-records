-- MDKR RECORDS: Supabase SQL Editor에서 전체 실행
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Player',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_mdkr_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_mdkr_admin() from public;
grant execute on function public.is_mdkr_admin() to authenticated;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chart_id text not null,
  judge text not null check (judge in ('AP','FC','OTHER')),
  early integer not null check (early>=0 and early<=100000),
  late integer not null check (late>=0 and late<=100000),
  screenshot_path text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','VOIDED')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chart_id_format check (chart_id ~ '^[0-9]+-[0-9]+:[0-4]$')
);
create index if not exists submissions_chart_idx on public.submissions(chart_id,status);
create index if not exists submissions_user_idx on public.submissions(user_id,created_at desc);

create table if not exists public.review_logs (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.submissions(id),
  reviewer_id uuid not null references auth.users(id),
  action text not null check (action in ('APPROVED','REJECTED','VOIDED')),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.submissions enable row level security;
alter table public.review_logs enable row level security;

create policy "profiles_public" on public.profiles for select to anon,authenticated using (true);
create policy "profiles_self_insert" on public.profiles for insert to authenticated with check (id= (select auth.uid()));
create policy "profiles_self_update" on public.profiles for update to authenticated using (id= (select auth.uid())) with check (id=(select auth.uid()));
create policy "admins_self_read" on public.admins for select to authenticated using (user_id=(select auth.uid()));
create policy "submissions_public_approved" on public.submissions for select to anon,authenticated using (
  status='APPROVED' or user_id=(select auth.uid()) or public.is_mdkr_admin()
);
create policy "submissions_self_insert" on public.submissions for insert to authenticated
 with check (user_id=(select auth.uid()) and status='PENDING' and reviewed_at is null and reviewed_by is null and rejection_reason is null);
-- 수정 및 삭제 정책 없음. 검수는 SECURITY DEFINER RPC만 사용.
create policy "review_logs_admin_read" on public.review_logs for select to authenticated using (public.is_mdkr_admin());

-- 사용자 측에서 컬럼을 변경하거나 조회 권한을 확대하는 경로를 제거
revoke all on public.admins from anon,authenticated;
grant select on public.admins to authenticated;
revoke update,delete on public.submissions from anon,authenticated;

-- 공개 스토리지 버킷이 아니며 제출자 본인만 업로드, 관리자만 읽기 가능
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('mdkr-evidence','mdkr-evidence',false,8388608,array['image/jpeg','image/png','image/webp'])
 on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "evidence_user_upload" on storage.objects for insert to authenticated
 with check (bucket_id='mdkr-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "evidence_user_or_admin_read" on storage.objects for select to authenticated
 using (bucket_id='mdkr-evidence' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_mdkr_admin()));

create or replace function public.review_mdkr_submission(p_id uuid, p_action text, p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v public.submissions%rowtype;
begin
  if not public.is_mdkr_admin() then raise exception 'ADMIN_ONLY'; end if;
  if p_action not in ('APPROVED','REJECTED','VOIDED') then raise exception 'INVALID_ACTION'; end if;
  if p_action='REJECTED' and length(trim(coalesce(p_reason,'')))<3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v from public.submissions where id=p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_action='VOIDED' then
    if v.status<>'APPROVED' then raise exception 'NOT_APPROVED'; end if;
  elsif v.status<>'PENDING' then raise exception 'ALREADY_REVIEWED'; end if;
  update public.submissions set status=p_action,
    rejection_reason=case when p_action='REJECTED' then trim(p_reason) else null end,
    reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
  insert into public.review_logs(submission_id,reviewer_id,action,reason)
    values(p_id,auth.uid(),p_action,nullif(trim(coalesce(p_reason,'')),''));
end;
$$;
revoke all on function public.review_mdkr_submission(uuid,text,text) from public;
grant execute on function public.review_mdkr_submission(uuid,text,text) to authenticated;

-- 전일 랭킹: 모든 플레이어의 승인된 최고 기록 1개씩; AP>FC>OTHER, E+L 적은 순
create or replace view public.mdkr_rankings with (security_invoker=true) as
with best as (
  select s.*,row_number() over(partition by chart_id,user_id
     order by case judge when 'AP' then 0 when 'FC' then 1 else 2 end,
       (early+late),created_at,id) as personal_num
  from public.submissions s where status='APPROVED'
), placed as (
  select best.*,dense_rank() over(partition by chart_id
     order by case judge when 'AP' then 0 when 'FC' then 1 else 2 end,
       (early+late)) as rank
  from best where personal_num=1
)
select p.id,p.user_id,p.chart_id,p.judge,p.early,p.late,p.created_at,p.rank,
       pr.nickname,pr.avatar_url
from placed p join public.profiles pr on pr.id=p.user_id;
grant select on public.mdkr_rankings to anon,authenticated;

-- IMPORTANT: SQL Editor에서 최초 운영자 등록은 Discord로 로그인한 다음 별도로 실행:
-- insert into public.admins(user_id) values ('SUPABASE_AUTH_USER_UUID');
-- Auth > Users 화면의 UUID 사용. Discord ID 자체가 아닙니다.
