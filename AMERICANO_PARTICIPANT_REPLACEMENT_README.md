# Americano Participant Replacement V55

This update adds participant replacement after an Americano schedule has already been generated.

## Admin workflow

Open `Admin > Americano > Manage event`, select the tournament, and use the new replacement section.

- Singles Americano: replace one assigned player with another active player.
- Team Americano: replace one assigned fixed team with another active team.
- Every occurrence in the generated schedule is updated transactionally.
- Match rounds, courts, submitted scores, winners, and timestamps remain unchanged.
- The participant roster and schedule update together, preventing partial replacements.
- Replacement is available for Upcoming and Active events.
- Completed events remain locked to protect historical results.

## Supabase

Run `SUPABASE_AMERICANO_PARTICIPANT_REPLACEMENT_UPDATE.sql` once before deploying the website files.
