# Exact match rating display

This update makes each match badge calculate its green/red team change directly from the two players' stored rating audit events.

It therefore displays the amount actually applied after:

- the 10.00 maximum or 1.00 minimum;
- provisional-player multipliers;
- score corrections;
- score clearing or deletion.

No additional Supabase SQL is required if the match rating engine is already installed.

If `SUPABASE_BATCH_RESULTS_AND_TEAM_STATUS_UPDATE.sql` has not yet been run, run it before deploying this folder because this package also contains the batch-results and team-status release.
