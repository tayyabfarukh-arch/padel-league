# Full tournament player replacement

Player replacement now applies to every match in an active tournament, including matches with submitted results.

- Scores, rounds, courts, opponents and schedule remain unchanged.
- Group and knockout match cards show the replacement player.
- Player statistics and Elo rating history are recalculated using the corrected lineup.
- Completed/closed tournaments remain locked.
- The update repairs a replacement already performed before this release.

## Deploy

1. Run `SUPABASE_FULL_TOURNAMENT_PLAYER_REPLACEMENT_UPDATE.sql` once in Supabase SQL Editor.
2. Refresh the website and verify the submitted match cards.
3. Upload this complete deployment folder to GitHub.
