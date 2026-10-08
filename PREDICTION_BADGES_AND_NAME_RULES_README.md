# Prediction badges and player-name rules

This update applies the latest completed tournament result in both the Players leaderboard and the completed prediction list:

- 😎 means the player predicted the champion correctly.
- 🐒 means the player predicted a different team.
- 🐀 means the player did not submit a prediction.
- 👑 means the player was part of the champion team.

These badges are calculated by the website and are not stored inside player names. When another tournament is completed, the prediction badges and champion crown automatically move to the new tournament's results.

## One Supabase step

1. Open Supabase.
2. Click **SQL Editor**.
3. Click **New query**.
4. Open `SUPABASE_PLAYER_NAME_EMOJI_CLEANUP_UPDATE.sql` from this deployment folder.
5. Copy the complete contents into Supabase.
6. Click **Run**.

The script removes emojis from existing player names and blocks them in future. It does not delete profiles, login accounts, matches, ratings, predictions, or statistics.

Usernames were already restricted to lowercase letters, numbers, and underscores. The website now also checks player display names before saving them, while the Supabase rule protects names changed from any source.
