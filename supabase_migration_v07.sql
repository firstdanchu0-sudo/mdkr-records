-- MDKR v0.7: record correction requests. Run after v0.5/v0.6 migrations.
create table if not exists public.mdkr_record_edit_requests (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.submissions(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete cascade,
 judge text not null check (judge in ('AP','FC','OTHER')),
 accuracy numeric(6,3) check (accuracy between 0 and 100),
 early integer not null check(early between 0 and 100000),
 late integer not null check(late between 0 and 100000),
 great integer not null check(great between 0 and 100000),
 miss integer not null check(miss between 0 and 100000),
 screenshot_path text not null,
 message text not null default '' check (length(message)<=500),
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 review_reason text,
 replacement_submission_id uuid references public.submissions(id) on delete restrict,
 created_at timestamptz not null default now(),
 constraint mdkr_edit_judge_consistency check (
   (judge='AP' and great=0 and miss=0) or
   (judge='FC' and miss=0) or judge='OTHER'
 ),
 constraint mdkr_edit_path_shape check(length(screenshot_path)<500)
);
create index if not exists mdkr_edit_user_idx on public.mdkr_record_edit_requests(user_id,created_at desc);
create unique index if not exists mdkr_edit_one_pending on public.mdkr_record_edit_requests(submission_id) where status='PENDING';
alter table public.mdkr_record_edit_requests enable row level security;
drop policy if exists mdkr_edit_read on public.mdkr_record_edit_requests;
create policy mdkr_edit_read on public.mdkr_record_edit_requests for select to authenticated
 using (user_id=(select auth.uid()) or public.is_mdkr_admin());
drop policy if exists mdkr_edit_insert on public.mdkr_record_edit_requests;
create policy mdkr_edit_insert on public.mdkr_record_edit_requests for insert to authenticated
 with check (
 user_id=(select auth.uid()) and status='PENDING' and reviewed_by is null and reviewed_at is null
 and review_reason is null and replacement_submission_id is null
 and exists (select 1 from public.submissions s where s.id=submission_id and s.user_id=(select auth.uid()) and s.status in ('APPROVED','PENDING','REJECTED'))
 and (screenshot_path like (select auth.uid())::text||'/%')
 );
revoke all on public.mdkr_record_edit_requests from anon,authenticated;
grant select,insert on public.mdkr_record_edit_requests to authenticated;
-- Reject all untrusted insertions with screenshot mismatches at the server side.
create or replace function public.mdkr_review_record_edit(p_id uuid,p_action text,p_reason text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.mdkr_record_edit_requests%rowtype; o public.submissions%rowtype; new_id uuid;
begin
 if not public.is_mdkr_admin() then raise exception 'ADMIN_ONLY'; end if;
 if p_action not in ('APPROVED','REJECTED') then raise exception 'INVALID_ACTION'; end if;
 if p_action='REJECTED' and length(trim(coalesce(p_reason,'')))<3 then raise exception 'REASON_REQUIRED'; end if;
 select * into v from public.mdkr_record_edit_requests where id=p_id for update;
 if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
 if v.status<>'PENDING' then raise exception 'ALREADY_REVIEWED'; end if;
 select * into o from public.submissions where id=v.submission_id for update;
 if not found or o.user_id<>v.user_id then raise exception 'SOURCE_NOT_FOUND'; end if;
 if p_action='APPROVED' then
   if o.status not in ('APPROVED','PENDING','REJECTED') then raise exception 'SOURCE_NO_LONGER_ACTIVE'; end if;
   if not exists (select 1 from storage.objects where bucket_id='mdkr-evidence' and name=v.screenshot_path)
     then raise exception 'EVIDENCE_MISSING'; end if;
   -- Preserve source row & historical foreign keys, remove source from ranking.
   update public.submissions set status='VOIDED', reviewed_by=auth.uid(),reviewed_at=now() where id=o.id;
   -- Create fresh result with its own approval event, preserving existing throne trigger semantics.
   insert into public.submissions(user_id,chart_id,judge,accuracy,early,late,great,miss,
     screenshot_path,level,chart_type,song_title,status)
   values(o.user_id,o.chart_id,v.judge,v.accuracy,v.early,v.late,v.great,v.miss,
     v.screenshot_path,o.level,o.chart_type,o.song_title,'PENDING') returning id into new_id;
   update public.submissions set status='APPROVED',reviewed_by=auth.uid(),reviewed_at=now() where id=new_id;
   insert into public.review_logs(submission_id,reviewer_id,action,reason)
     values(new_id,auth.uid(),'APPROVED','수정 신청 승인 · 원본 '||o.id::text);
 end if;
 update public.mdkr_record_edit_requests set status=p_action,reviewed_by=auth.uid(),reviewed_at=now(),
   review_reason=case when p_action='REJECTED' then trim(p_reason) else null end,
   replacement_submission_id=new_id where id=p_id;
 return new_id;
end $$;
revoke all on function public.mdkr_review_record_edit(uuid,text,text) from public;
grant execute on function public.mdkr_review_record_edit(uuid,text,text) to authenticated;
