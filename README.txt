MDKR RECORDS POINT DETAILS v1.0.1

1. Run mdkr_point_details.sql in Supabase SQL Editor. It creates a read-only, SECURITY INVOKER RPC using existing leaderboard RLS.
2. Upload mdkr_point_details.js and mdkr_point_details.css to the repository root.
3. In index.html <head>, add below existing tier CSS:
   <link rel="stylesheet" href="mdkr_point_details.css">
4. Before </body>, add AFTER mdkr_tier_v10.js:
   <script src="mdkr_point_details.js" defer></script>
5. Commit + Push, hard reload.

Click the tier panel or the compact points stat to open a right-side drawer. Each song links to the exact chart. No recorded scores are modified.
The 20 displayed items are taken from mdkr_rankings and use the same point formula as mdkr_player_stats. Existing rankings select the best score per chart by detail, not necessarily highest point yield; this patch preserves that established behavior.
