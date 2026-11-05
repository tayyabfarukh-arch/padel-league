# Admin-only scoring

This is the small security update prepared for the upcoming tournament.

## What changes

- The public Active Tournament page remains live and read-only.
- Score inputs no longer appear to visitors or players.
- Regular, batch and Americano score-submission RPCs are no longer executable by public or ordinary authenticated accounts.
- The administrator continues entering and correcting regular scores under **Admin > Results**.
- Americano scores continue to be managed from the Americano Admin **Manage** section.

## Deployment order

1. Run `SUPABASE_ADMIN_ONLY_SCORING_UPDATE.sql` in Supabase SQL Editor.
2. Upload the complete V50 deployment folder to GitHub.
3. Sign in to Admin and submit one test result before tournament day.

No existing schedule, score, standing, rating or tournament record is changed by the SQL update.
