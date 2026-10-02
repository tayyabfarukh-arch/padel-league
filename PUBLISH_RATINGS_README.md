# Publish the player ratings

## 1. Update Supabase

1. Open your Supabase project.
2. Click **SQL Editor** in the left menu.
3. Click **New query**.
4. Open `SUPABASE_PUBLISH_RATINGS_UPDATE.sql` from this deployment folder.
5. Copy all of it and paste it into the Supabase query box.
6. Click **Run**.

This does not delete players, votes, teams, matches or tournament history.

## 2. Publish from the website

1. Deploy this full folder to GitHub/Netlify as usual.
2. Open **Admin** on the website and sign in.
3. Open the **Ratings** section.
4. Click **Refresh totals** and review the averages.
5. Click **Close voting** if voting is still open.
6. Click **Publish ratings**.

The Players leaderboard will then rank players by their published rating. The Teams leaderboard uses the average published rating of both players. A team stays unrated until both players have a published rating.

Publish or republish the baseline only before the first rated tournament result. Supabase blocks republishing after match-based rating changes have started.

No new Netlify environment variables are needed.
