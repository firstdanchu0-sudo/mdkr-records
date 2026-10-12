MDKR RECORDS v0.8 - profile / corrections / deletion

BACK UP THE DATABASE BEFORE RUNNING SQL.

1) Supabase SQL Editor: execute supabase_migration_v08.sql fully.
   Prerequisites: v0.5, v0.6, v0.7 migrations already applied.
2) Upload mdkr_profile_v08.js and mdkr_profile_v08.css to the repo root.
3) In index.html HEAD add:
      <link rel="stylesheet" href="mdkr_profile_v08.css">
   Before </body> and AFTER backend.js, mdkr_edit.js, accuracy guard:
      <script src="mdkr_profile_v08.js" defer></script>
4) Commit, push, hard refresh.

BEHAVIOR
- Own profile: recent submitted records including pending/rejected.
- Visitors: recent-record table removed and Top 5 favorite songs shown, counted
  from APPROVED submissions (all charts under the same song combined).
- Existing approved scores remain publicly accessible via chart leaderboards and
  the current Supabase submissions SELECT policy! This is PROFILE DISPLAY privacy,
  not a fully private database/API guarantee. To hide approved recent activity
  throughout APIs requires an RLS/public leaderboard redesign.
- Edit approval updates the existing submission in place (same UUID), so no
  duplicate/VOIDED source row is created by new approvals. Previous values saved
  in admin-only mdkr_record_change_audit. Changes to an existing crown-winning
  submission do not retroactively recompute historical throne/notification events.
- Admin hard-delete cascades manually through edit requests, throne loss links,
  throne events, review logs, then submission; a snapshot is archived for admins.
  This DOES erase the selected record's historical throne events and linked loss
  events and may change historical title/reclaim metrics. It does not perform a
  global repair of rankings' historical events. Rankings are live and recalculated.
- Screenshot files are not automatically removed from Supabase Storage; use the
  storage cleanup tool. Existing cleanup page may list only records still in DB;
  orphaned Storage files need a separate orphan-cleanup workflow.
- Test correction, deletion and top5 in a staging copy before production rollout.
