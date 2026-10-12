-- MDKR RECORDS v0.6: execute AFTER v0.5 migration. Make a backup first.
-- Screenshot evidence deletion is irreversible; submission rows/rankings remain.
alter table public.submissions add column if not exists evidence_deleted_at timestamptz;

create table if not exists public.mdkr_evidence_cleanup_logs (
 id bigint generated always as identity primary key,
 submission_id uuid not null,
 storage_path text not null,
 old_status text not null,
 deleted_by uuid not null references auth.users(id),
 deleted_at timestamptz not null default now()
);
alter table public.mdkr_evidence_cleanup_logs enable row level security;
drop policy if exists mdkr_evidence_cleanup_admin_read on public.mdkr_evidence_cleanup_logs;
create policy mdkr_evidence_cleanup_admin_read on public.mdkr_evidence_cleanup_logs
 for select to authenticated using(public.is_mdkr_admin());
revoke all on public.mdkr_evidence_cleanup_logs from anon,authenticated;
grant select on public.mdkr_evidence_cleanup_logs to authenticated;

-- Only an authorized MDKR administrator can remove files in the private bucket.
drop policy if exists mdkr_evidence_admin_delete on storage.objects;
create policy mdkr_evidence_admin_delete on storage.objects for delete to authenticated
 using(bucket_id='mdkr-evidence' and public.is_mdkr_admin());

-- Called after Storage successfully deletes a file. Checks ownership/identity and logs.
create or replace function public.mdkr_log_evidence_cleanup(p_submission_id uuid,p_path text)
returns void language plpgsql security definer set search_path='' as $$
declare v public.submissions%rowtype;
begin
 if not public.is_mdkr_admin() then raise exception 'ADMIN_ONLY'; end if;
 select * into v from public.submissions where id=p_submission_id for update;
 if not found then raise exception 'SUBMISSION_NOT_FOUND'; end if;
 if v.screenshot_path is distinct from p_path then raise exception 'PATH_MISMATCH'; end if;
 if v.evidence_deleted_at is not null then return; end if;
 -- The client deletes the object first. Do not grant ordinary users RPC access.
 update public.submissions set evidence_deleted_at=now() where id=p_submission_id;
 insert into public.mdkr_evidence_cleanup_logs(submission_id,storage_path,old_status,deleted_by)
 values(v.id,v.screenshot_path,v.status,auth.uid());
end;
$$;
revoke all on function public.mdkr_log_evidence_cleanup(uuid,text) from public;
grant execute on function public.mdkr_log_evidence_cleanup(uuid,text) to authenticated;

-- Optional: DB administrators can inspect evidence cleanup history.
-- select * from public.mdkr_evidence_cleanup_logs order by deleted_at desc;
