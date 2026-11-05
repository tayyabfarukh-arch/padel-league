# Admin Score Centre Active Layout V52

This update replaces the separate wide scoring table with the same responsive tournament experience used on the Active page.

## What changed

- Admin > Score Centre now uses the existing match schedule cards.
- Player photos, team names, rounds, groups, courts, standings, knockout sections, and mobile sizing match the public tournament view.
- Score inputs appear only inside Admin; the public Active page remains read-only.
- Scores can be entered on several unfinished matches and submitted together from any `Submit all entered results` button.
- The existing saved-result correction, testing reset, and manual tournament-close tools remain below the main scoring view.
- The discarded wide-table Score Centre component has been removed.

## Supabase

Run `SUPABASE_ADMIN_SCORE_CENTRE_UPDATE.sql` only if it was not already run for V51. It protects batch scoring with an Admin check and keeps public scoring disabled.
