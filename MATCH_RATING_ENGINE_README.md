# Match rating engine deployment

Complete these steps today before entering tournament results.

## 1. Publish the voting baseline

If you have not already done so:

1. Run `SUPABASE_PUBLISH_RATINGS_UPDATE.sql` in the Supabase SQL Editor.
2. Deploy the website.
3. Open **Admin > Ratings**.
4. Close voting and click **Publish ratings**.

Do this before the first tournament score is entered. After match-based ratings begin, the baseline is locked and cannot be republished over live results.

## 2. Install the match rating engine

1. Open Supabase.
2. Click **SQL Editor**.
3. Click **New query**.
4. Open `SUPABASE_MATCH_RATING_ENGINE_UPDATE.sql` from this folder.
5. Copy everything and paste it into the Supabase query box.
6. Click **Run**.
7. Upload this complete deployment folder to GitHub and wait for Netlify.

No new Netlify environment variables are required.

## How ratings change

- An even match starts at `0.15`.
- Beating a team rated 1.00 higher gives established players `+0.18`.
- Beating a team rated 1.00 lower gives established players `+0.12`.
- The loser receives the matching negative change.
- Changes are limited to a minimum of `0.05` and maximum of `0.30` before provisional adjustment.
- Published voting-baseline players are established immediately.
- A completely new, unrated player starts at the active league average and moves faster for their first 10 matches.
- Matches 1-3 use 1.50x, matches 4-6 use 1.30x, and matches 7-10 use 1.15x.
- Ratings stay between 1.00 and 10.00.

The small green/red number shown on a match is the average rating movement of that team's two players. Each player's exact movement is stored separately.

## Corrections and test scores

- Correcting a score in Admin automatically removes the old rating effect before applying the corrected result.
- Clearing a score automatically reverses its rating effect.
- Deleting a completed match automatically reverses its rating effect.
- Submitting the same match cannot create duplicate rating entries.
