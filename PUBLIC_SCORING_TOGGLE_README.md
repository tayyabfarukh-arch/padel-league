# Public Scoring Toggle V56

This update adds a per-tournament switch between public score entry and Admin-only score entry.

## Deployment

1. Open Supabase SQL Editor.
2. Run `SUPABASE_PUBLIC_SCORING_TOGGLE_UPDATE.sql` once.
3. Deploy the website files from the matching V56 folder.

Existing tournaments remain Admin-only after the migration.

## Regular tournaments

Open **Admin > Tournament**, select the tournament, and use **Public score entry** inside the setup form. Save the setup after changing the switch.

## Americano tournaments

Open **Admin > Americano > Manage**, select the event, and use **Public score entry** inside Event status and scoring. Save the settings after changing the switch.

Public score controls appear only when the tournament is Active and the switch is on. Turning it off removes the public controls and blocks public RPC submissions. Admin result entry remains available regardless of the switch.
