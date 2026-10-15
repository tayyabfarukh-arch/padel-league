# Individual Player Elo V2.1

This update gives the two partners separate rating changes from the same match result.

## New calculation

Each player's own rating is compared with the opposing team's average rating.

- A weaker player receives more rating for beating stronger opponents.
- A stronger partner receives less rating from the same victory.
- A weaker player loses less when defeated by stronger opponents.
- A stronger partner loses more when the result is below expectations.

The existing 75% match weighting, provisional first 10 matches, high-rating gain reduction, and 1.00 to 10.00 limits remain active.

## Match result display

Every match card now shows:

- Two separate, non-overlapping player photographs for each team.
- The first name underneath each player.
- That player's individual green or red rating change.
- The team name and match score remain visible.

## Historical recalculation

The updated SQL safely reverses the current post-publication rating events and replays the same completed matches chronologically using individual Elo V2.1. Existing scores are not deleted.

## Step 1: Update Supabase

Do this when nobody is entering match scores.

1. Open Supabase and click **SQL Editor**.
2. Click **New query**.
3. Open `SUPABASE_ELO_RATING_SYSTEM_UPDATE.sql` from this deployment folder.
4. Copy the complete file and paste it into Supabase.
5. Click **Run** once.
6. Wait for the success message and check `matches_rebuilt` in the returned summary.

This is safe to run even if the earlier Elo V2 SQL was already applied.

## Step 2: Deploy

Upload everything inside the ready-to-upload folder to the root of your GitHub repository and replace the existing files.

Netlify will deploy automatically. No new environment variable is required.

Do not clear tournament scores before running the SQL.
