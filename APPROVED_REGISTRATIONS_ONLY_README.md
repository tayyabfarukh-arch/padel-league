# Approved registrations only

The public tournament registration list now shows only teams confirmed by an Admin.

- Pending and waitlisted teams remain hidden from the public list.
- Admin can still see and manage every registration in the Admin panel.
- A signed-in player can still see the status of their own pending registration.
- No registrations, teams, players, schedules, or scores are deleted.

## Deploy

1. In Supabase, open **SQL Editor**.
2. Run `SUPABASE_APPROVED_REGISTRATIONS_ONLY_UPDATE.sql` once.
3. Upload the contents of this deployment folder to GitHub.
4. Wait for Netlify to finish deploying.
