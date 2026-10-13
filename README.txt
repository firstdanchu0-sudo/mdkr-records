MDKR RECORDS - Tier v1.0

1) BACKUP database.
2) Run mdkr_tier_v10.sql in Supabase SQL Editor.
3) Upload mdkr_tier_v10.js and mdkr_tier_v10.css to repository root.
4) index.html HEAD: directly under previous stylesheet:
   <link rel="stylesheet" href="mdkr_tier_v10.css">
5) index.html, just above </body>, AFTER mdkr_profile_v08.js:
   <script src="mdkr_tier_v10.js" defer></script>
6) Commit, push, Ctrl+Shift+R.

New formula per approved personal-best chart:
Lv10=300, Lv11=450, Lv12=650.
AP: base x 1.00 (accuracy 100%).
FC: base x (accuracy/100)^20 x 0.85.
OTHER: base x (accuracy/100)^20 x 0.65.
Top 20 DIFFERENT charts only; no extra points for repeated uploads.
Others/out-of-scope levels: 0 PT.

UNRANKED < 1000
STELLAR I-V starts at 1000,1300,1600,2000,2400
NEBULA I-V starts at 3000,3500,4000,4500,5000
QUASAR I-V starts at 5500,6000,6500,7000,7500
COSMOS I-V starts at 8000,8500,9000,9500,10500

This patch changes the existing mdkr_player_stats.points view.
No record tables or game scores are deleted.
SQL must run before publishing JS. The patch does not change existing title scoring/requirements.
