# Player Performance Dashboard V25

## What changed

The Players page now has a **Performance** button beside **Awards**.

The new page lets anyone:

1. Choose any active player, with their profile photo visible in the selector.
2. Choose one of that player's rated tournaments.
3. See the rating before and after the tournament.
4. See the total rating gained or lost and the tournament win/draw/loss record.
5. Follow the rating journey on a graph.
6. Review every match, opponent, score, stage, and exact rating impact.

Each individual player profile also has a **Performance analysis** button.

## Supabase

There is no new SQL file to run. The dashboard reads the rating history already saved in `rating_events` by the current rating system.

## Deploy

Upload the complete V25 folder to GitHub in the same way as the previous deployment. Netlify will build it automatically.

No Netlify environment variables need to be added or changed.
