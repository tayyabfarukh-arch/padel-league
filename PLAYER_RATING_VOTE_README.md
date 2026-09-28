# Player Rating Vote Setup

This update collects a private 1–10 baseline rating from verified player accounts. It does **not** change the current Players leaderboard, tournament standings, or match scoring.

## Step 1: Update Supabase

1. Open [Supabase](https://supabase.com/dashboard) and select your Padel League project.
2. Click **SQL Editor** in the left menu.
3. Click **New query**.
4. Open `SUPABASE_PLAYER_RATING_VOTE_UPDATE.sql` from this deployment folder.
5. Copy everything in that file and paste it into the Supabase query box.
6. Click **Run**.
7. Wait for the green success message.

This script keeps all players, teams, tournaments, matches, accounts, registrations, and scores. It only adds the rating-vote tables and their security rules.

## Step 2: Upload the Website

Upload the complete contents of this deployment folder to GitHub in the same way as your previous updates. Netlify will build the new version automatically.

No new Netlify environment variables are required.

## Step 3: Test the Voting Page

1. Open the website.
2. Click **Players** in the bottom menu.
3. Click **Rate players** near the top.
4. Sign in with a player account that is linked to a player profile.
5. Choose a rating from **1 to 10** for players you know.
6. Choose **I don't know this player well enough** for unfamiliar players.
7. Change one rating to confirm that editing works.

Every choice saves immediately. Players cannot rate themselves and cannot see anyone else's individual choices.

## Step 4: Review as Admin

1. Open **Admin**.
2. Sign in with the Admin account.
3. Keep **Regular Tournament** selected.
4. Click **Ratings**.
5. Review participating voters, total numeric ratings, skipped players, and each calculated baseline.
6. Click **Close voting** when management is ready to review the final result.
7. Click **Reopen voting** if players need more time or corrections.

A player needs at least three numeric ratings before a baseline appears. When a player receives five or more ratings, the system removes one highest and one lowest rating before calculating the displayed average.

## Important

- The averages are visible only inside the Admin panel.
- This release does not publish a rating leaderboard.
- This release does not copy the baseline into the live rating table.
- This release does not change ratings after matches.
- Those steps can be added after management approves the complete rating system.
