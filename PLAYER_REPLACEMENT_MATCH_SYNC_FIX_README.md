# Player replacement match sync fix

This update fixes pending match cards that continued showing the outgoing player after a tournament replacement.

- All unplayed group and knockout matches use the current tournament roster.
- Already-generated quarter-finals, semifinals, finals and third-place matches are included.
- Completed match lineups, scores, statistics and rating history remain unchanged.
- The SQL repairs player replacements that were already performed before this fix.

## Deploy

1. Run `SUPABASE_PLAYER_REPLACEMENT_MATCH_SYNC_FIX.sql` once in Supabase SQL Editor.
2. Refresh the website and check the pending matches.
3. Upload this deployment folder to GitHub for the permanent corrected replacement function and the approved-registration visibility update.
