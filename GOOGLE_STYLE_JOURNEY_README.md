# Google-style Tournament Journey V38

The expanded Road to the Title now uses the same interaction pattern as Google's World Cup bracket while retaining the PPC visual identity.

- `Group Stage` and `Knockout Stage` remain visible at the top.
- Knockout rounds appear as a horizontally scrollable selector.
- Each selected round is shown beside the next round it feeds into.
- Moving between rounds uses directional slide animation.
- Match cards retain PPC match numbers, dates, courts, scores, winner highlighting, third place and champion details.
- The available round tabs automatically adapt to direct-semifinal, quarter-final and pre-quarter-final tournaments.

This visual update requires no additional SQL beyond `SUPABASE_PREQUARTERFINAL_UPDATE.sql` from V37.
