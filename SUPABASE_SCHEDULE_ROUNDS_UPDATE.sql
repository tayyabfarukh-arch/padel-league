-- Run this once in Supabase SQL Editor before deploying the schedule-rounds update.
-- Existing players, teams, tournaments, matches, scores, and photos are preserved.

alter table matches
add column if not exists round_number integer check (round_number between 1 and 200);

create index if not exists idx_matches_schedule
on matches(tournament_id, round_number, court_number);
