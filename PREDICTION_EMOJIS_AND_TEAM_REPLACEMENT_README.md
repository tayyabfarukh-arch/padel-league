# Prediction results and tournament team replacement

## Deploy

1. If you have not already run `SUPABASE_BATCH_RESULTS_AND_TEAM_STATUS_UPDATE.sql`, run it first in the Supabase SQL Editor.
2. Run `SUPABASE_TEAM_REPLACEMENT_UPDATE.sql` in the Supabase SQL Editor.
3. Upload this complete folder to GitHub.
4. Wait for Netlify to finish the production deployment.

No new environment variables are required.

## Replace a withdrawn team

1. Keep the tournament status as **Upcoming**.
2. Open **Admin > Regular Tournament > Tournament**.
3. Select the tournament inside **Add team to tournament**.
4. Find **Replace a withdrawn team**.
5. Select the withdrawn team and its replacement.
6. Click **Replace team in schedule** and confirm.

The replacement receives the same group, rounds and courts. Every pending scheduled match is updated. Predictions for the withdrawn team are cleared so those players can vote again.

Replacement is blocked if:

- the tournament is Active or Completed;
- the replacement team is inactive;
- the replacement is already participating;
- the withdrawn team has a submitted result that has not been cleared.

## Prediction results

- Upcoming tournaments remain the default prediction view.
- Active tournaments show locked predictions waiting for the champion.
- Completed tournaments remain selectable as prediction history.
- A correct prediction shows 😎 beside the player's name.
- A wrong prediction shows 🐒 beside the player's name.
