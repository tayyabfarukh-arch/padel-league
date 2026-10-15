# Elo Player Rating System V2

This update introduces the agreed match-based rating system and recalculates completed regular-tournament matches played after the community ratings were published.

## How ratings now work

- A team's strength is the average rating of its two players.
- Beating a stronger team gives a larger increase.
- Beating a weaker team gives a smaller increase.
- Losing to a weaker team causes a larger deduction.
- Losing to a stronger team causes a smaller deduction.
- Group and knockout matches both use 75% of the standard rating movement.
- New players move faster during their first 10 rated matches.
- Positive gains gradually reduce above 8.00, making ratings near 10 difficult to reach.
- Ratings always stay between 1.00 and 10.00.

## What happens to existing match history

The SQL update automatically finds the date and time when the community ratings were published. It then:

1. Finds every completed regular-tournament match played after publication.
2. Rewinds the old rating effects in reverse order.
3. Replays the matches in chronological order using Elo v2.
4. Updates player ratings and the green/red match rating changes.

Match scores, schedules, tournaments, teams, players, votes, and awards are not deleted.

## Step 1: Run the Supabase update

Do this when nobody is submitting match scores.

1. Open your Supabase project.
2. Click **SQL Editor**.
3. Click **New query**.
4. Open `SUPABASE_ELO_RATING_SYSTEM_UPDATE.sql` from the deployment folder.
5. Copy the entire file and paste it into Supabase.
6. Click **Run** once.
7. Wait for the green success message.

The result includes a `rebuild_summary`. Check `matches_rebuilt` to see how many historical matches were recalculated.

## Step 2: Deploy the website

Upload everything inside the ready-to-upload folder to the root of your GitHub repository. Replace existing files when GitHub asks.

Netlify will deploy automatically.

No new Netlify environment variable is required.

## Important

Do not clear tournament scores before running this update. The migration needs the saved results to rebuild the ratings.
