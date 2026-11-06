# Big Screen Tournament Presentation V53

This update adds a dedicated venue-display mode for televisions, projectors, and large external monitors.

## Big Screen Mode

- A `Big Screen` button appears in the tournament header.
- Selecting it opens the complete tournament experience across the full viewport.
- The browser Fullscreen API is used when available, with a full-viewport fallback when fullscreen is blocked.
- A sticky presentation toolbar keeps the tournament name and exit control visible.
- Pressing `Esc` or selecting `Exit presentation` restores the normal website.

## Readability improvements

- Group standings use larger team names, rankings, statistics, rows, and column labels.
- Road to the Title automatically expands when presentation mode starts.
- Group-stage journey tables use larger team names, wins, points, and qualification markers.
- Knockout stage tabs, bracket cards, team names, scores, court details, headings, and connector map are enlarged.
- Match-card team names are increased slightly for venue viewing.
- Normal mobile and desktop views keep their existing dimensions.

## Database

No Supabase SQL changes are required.
