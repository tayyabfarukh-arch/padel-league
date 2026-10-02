# Batch results and active/inactive teams

## Deploy this update

1. Open your Supabase project.
2. Click **SQL Editor** and then **New query**.
3. Open `SUPABASE_BATCH_RESULTS_AND_TEAM_STATUS_UPDATE.sql` from this folder.
4. Copy the entire file into Supabase and click **Run**.
5. Upload this complete deployment folder to GitHub.
6. Wait for Netlify to finish the production deployment.

No new Netlify environment variables are required.

## Submit several match results together

1. Open the Active tournament.
2. Enter complete scores into as many displayed matches as needed.
3. Press **Submit all entered results** on any match.

Every entered result is checked first and then saved in displayed schedule order. The operation is all-or-nothing: if one result is invalid, none of the entered results are saved. Standings and ratings refresh once after the complete batch.

## Deactivate or reactivate a team

1. Open **Admin** and sign in.
2. Open **Regular Tournament > People**.
3. Find **Manage team status**.
4. Press **Deactivate** or **Reactivate** beside the team.

Deactivation never deletes the team, matches or statistics. The Players leaderboard is unchanged.

The Teams page now starts with **Active teams** and provides **Active**, **Inactive** and **All** selectors above the leaderboard.
