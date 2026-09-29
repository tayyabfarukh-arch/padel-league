# Player Profile Merge and Visibility Setup

This release lets the Admin merge accidental duplicate player profiles and disable profiles that should not appear publicly.

## Deploy in this order

1. Open your Supabase project.
2. Click **SQL Editor**.
3. Click **New query**.
4. Open `SUPABASE_PLAYER_PROFILE_MERGE_UPDATE.sql` from the deployment folder.
5. Copy the complete SQL file into Supabase and click **Run**.
6. Wait for the green success message.
7. Upload the complete deployment folder to GitHub.
8. Wait for Netlify to finish deploying.

No new Netlify environment variables or Storage buckets are required.

## Merge an accidental duplicate

1. Open **Admin** and sign in.
2. Open **Regular Tournament > People**.
3. Find **Player profile management**.
4. Under **Profile to keep**, select the original profile containing the player’s match history.
5. Under **Duplicate to remove**, select the newly created accidental profile.
6. Check both profile previews carefully.
7. Type `MERGE` in the confirmation box.
8. Click **Merge profiles** and confirm the final message.

The original profile keeps its name and historical identity. The duplicate’s linked account, photo when the original has none, teams, tournament participation, Americano appearances, rating votes, and rating records are transferred. The duplicate profile is then removed.

Merging cannot be undone. If both profiles appear together in one team or one Americano match, the merge safely stops without changing anything. Correct that invalid team or match before trying again.

## Disable an unused profile

1. Open **Admin > Regular Tournament > People**.
2. In **Profile visibility**, select the unused profile.
3. Click **Disable** and confirm.

The profile remains in Supabase but disappears from public player leaderboards, player pages, rating choices, claim lists, and registration selections. Its historical database records are not deleted.

To make it visible again, find it in **Disabled profiles** and click **Restore**.
