-- MDKR v0.8: profile TOP5, in-place correction, safer hard delete
-- Run after v0.5 - v0.7. Back up the database first.

-- Public aggregate. RLS on submissions limits nonowners to APPROVED rows.
-- The function returns only aggregate counts, never timestamps or score details.
create or replace function public.mdkr_favorite_songs(p_user_id uuid)
returns table(song_key text, record_count bigint)
language sql stable security invoker set search_path='' as $fn$
  select split_part(s.chart_id, ':', 1) as song_key,
         count(*)::bigint as record_count
  from public.submissions s
  where s.user_id = p_user_id and s.status = 'APPROVED'
  group by split_part(s.chart_id, ':', 1)
  order by record_count desc, song_key asc
  limit 5;
$fn$;
revoke all on function public.mdkr_favorite_songs(uuid) from public;
grant execute on function public.mdkr_favorite_songs(uuid) to anon,authenticated;

-- Snapshot-based audit; deliberately NO FK to submissions so it survives deletion.
create table if not exists public.mdkr_record_change_audit (
  id bigint generated always as identity primary key,
  record_id uuid not null,
  edit_request_id uuid,
  action text not null check (action in ('CORRECTED','DELETED')),
  actor_id uuid not null references auth.users(id),
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now()
);
alter table public.mdkr_record_change_audit enable row level security;
drop policy if exists mdkr_change_audit_admin_read on public.mdkr_record_change_audit;
create policy mdkr_change_audit_admin_read on public.mdkr_record_change_audit
for select to authenticated using(public.is_mdkr_admin());
revoke all on public.mdkr_record_change_audit from anon,authenticated;
grant select on public.mdkr_record_change_audit to authenticated;

-- Every corrected record keeps the SAME ID and one approved row.
-- Old score & evidence path remain in the admin-only audit table.
-- An approved correction does not count as a new play or throne reclaim.
create or replace function public.mdkr_review_record_edit(
  p_id uuid,p_action text,p_reason text default null)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
  req public.mdkr_record_edit_requests%rowtype;
  original public.submissions%rowtype;
  updated public.submissions%rowtype;
begin
  if not public.is_mdkr_admin() then raise exception 'ADMIN_ONLY'; end if;
  if p_action not in ('APPROVED','REJECTED') then raise exception 'INVALID_ACTION'; end if;
  if p_action='REJECTED' and length(trim(coalesce(p_reason,'')))<3 then
    raise exception 'REASON_REQUIRED';
  end if;
  select * into req from public.mdkr_record_edit_requests
    where id=p_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if req.status<>'PENDING' then raise exception 'ALREADY_REVIEWED'; end if;
  select * into original from public.submissions
    where id=req.submission_id for update;
  if not found or original.user_id<>req.user_id then
    raise exception 'SOURCE_NOT_FOUND';
  end if;
  if p_action='APPROVED' then
    if original.status not in ('APPROVED','PENDING','REJECTED') then
      raise exception 'SOURCE_NO_LONGER_ACTIVE';
    end if;
    if not exists (select 1 from storage.objects
      where bucket_id='mdkr-evidence' and name=req.screenshot_path) then
      raise exception 'EVIDENCE_MISSING';
    end if;
    update public.submissions set
      judge=req.judge, accuracy=req.accuracy, early=req.early,
      late=req.late, great=req.great, miss=req.miss,
      screenshot_path=req.screenshot_path, status='APPROVED',
      rejection_reason=null, reviewed_by=auth.uid(), reviewed_at=now()
    where id=original.id returning * into updated;
    insert into public.mdkr_record_change_audit
      (record_id,edit_request_id,action,actor_id,before_data,after_data)
    values(original.id,req.id,'CORRECTED',auth.uid(),to_jsonb(original),to_jsonb(updated));
    insert into public.review_logs(submission_id,reviewer_id,action,reason)
    values(original.id,auth.uid(),'APPROVED','기존 기록 수정 승인 · 신청 '||req.id::text);
  end if;
  update public.mdkr_record_edit_requests set
    status=p_action, reviewed_by=auth.uid(), reviewed_at=now(),
    review_reason=case when p_action='REJECTED' then trim(p_reason) else null end,
    replacement_submission_id=case when p_action='APPROVED' then original.id else null end
  where id=req.id;
  return case when p_action='APPROVED' then original.id else null end;
end;
$fn$;
revoke all on function public.mdkr_review_record_edit(uuid,text,text) from public;
grant execute on function public.mdkr_review_record_edit(uuid,text,text) to authenticated;

-- Hard delete: remove dependent edits, losses, events, reviews, then submission.
-- Deleting historical throne events can change cumulative achievements;
-- therefore write a permanent audit snapshot before removal.
-- Does not delete the file from Supabase Storage (see README).
create or replace function public.delete_mdkr_submission(p_id uuid)
returns void language plpgsql security definer set search_path='' as $fn$
declare
  original public.submissions%rowtype;
  removed_events bigint[];
  affected_losses jsonb;
  affected_edits jsonb;
begin
  if not public.is_mdkr_admin() then raise exception 'ADMIN_ONLY'; end if;
  select * into original from public.submissions where id=p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  select coalesce(array_agg(id),array[]::bigint[]) into removed_events
  from public.mdkr_throne_events where submission_id=p_id;
  select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) into affected_losses
  from public.mdkr_throne_losses l
  where l.event_id=any(removed_events) or l.reclaimed_event_id=any(removed_events);
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into affected_edits
  from public.mdkr_record_edit_requests r
  where r.submission_id=p_id or r.replacement_submission_id=p_id;

  insert into public.mdkr_record_change_audit
    (record_id,action,actor_id,before_data)
  values(p_id,'DELETED',auth.uid(),to_jsonb(original) || jsonb_build_object(
      'affected_losses',affected_losses,'affected_edits',affected_edits,
      'removed_throne_event_ids',to_jsonb(removed_events)));

  delete from public.mdkr_record_edit_requests
    where submission_id=p_id or replacement_submission_id=p_id;
  delete from public.mdkr_throne_losses
    where event_id=any(removed_events) or reclaimed_event_id=any(removed_events);
  delete from public.mdkr_throne_events where submission_id=p_id;
  delete from public.review_logs where submission_id=p_id;
  delete from public.submissions where id=p_id;
  -- Stored files are NOT deleted here, to avoid DB/Storage cross-service
  -- partial failures. Use the admin's storage cleanup tool separately.
end;
$fn$;
revoke all on function public.delete_mdkr_submission(uuid) from public;
grant execute on function public.delete_mdkr_submission(uuid) to authenticated;
