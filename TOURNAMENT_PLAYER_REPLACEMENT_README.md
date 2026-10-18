# Tournament Player Replacement V27

This update lets the Admin replace one player during an Upcoming or Active tournament without rebuilding the schedule.

## What remains unchanged

- The tournament team
- Group assignment
- Match rounds and courts
- Opponents
- Submitted scores
- Team standings
- Completed-match ratings and player statistics

Completed matches continue to show the original player. Only matches without a submitted score are changed to the replacement player.

## Step 1: Update Supabase

1. Open Supabase.
2. Open your project.
3. Click **SQL Editor** on the left.
4. Click **New query**.
5. Open `SUPABASE_TOURNAMENT_PLAYER_REPLACEMENT_UPDATE.sql` from this folder.
6. Copy the complete file and paste it into Supabase.
7. Click **Run**.
8. Wait for the green success message.

This SQL preserves all current data and does not recalculate or reset existing ratings.

## Step 2: Deploy the website

Upload the complete contents of the V27 deployment folder to GitHub. Netlify will deploy it automatically. No environment variables need to change.

## How to replace a player

1. Open **Admin** and sign in.
2. Open **Tournament**.
3. Select the tournament.
4. Find **Replace one player during a tournament**.
5. Choose the tournament team.
6. Choose the player leaving.
7. Choose the replacement player.
8. Click **Replace player in remaining matches**.
9. Confirm the message.

The replacement player cannot already belong to another team in the same tournament. Completed tournaments are locked.
