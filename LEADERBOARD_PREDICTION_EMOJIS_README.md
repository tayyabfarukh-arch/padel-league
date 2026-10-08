# Prediction emojis on the Players leaderboard

The Players leaderboard and Home page Top Players list now show the latest completed tournament prediction result beside each voter:

- Correct prediction: 😎
- Wrong prediction: 🐒
- No prediction: 🐀
- Players who won the latest completed tournament: 👑

The leaderboard always uses the most recently completed tournament that has a confirmed champion. When the next tournament is completed, the emojis change automatically to that tournament's prediction outcome.

Run `SUPABASE_PLAYER_NAME_EMOJI_CLEANUP_UPDATE.sql` once. It removes emojis from stored player names and prevents players or Admin from saving new player names containing emojis. It does not delete any profile, account, rating, match, vote, or statistic.
