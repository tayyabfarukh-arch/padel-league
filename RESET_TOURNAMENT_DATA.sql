-- WARNING: This permanently deletes tournaments, matches, and results.
-- It keeps your Supabase project, environment variables, storage buckets,
-- Authentication users, players, teams, and their photos.

truncate table matches, tournament_teams, tournaments cascade;

drop table if exists americano_matches cascade;
drop table if exists tournament_players cascade;
