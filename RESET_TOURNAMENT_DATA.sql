-- WARNING: This permanently deletes tournaments, matches, and results.
-- It keeps your Supabase project, environment variables, storage buckets,
-- Authentication users, players, teams, and their photos.

truncate table americano_matches, tournament_players, matches, tournament_teams, tournaments cascade;
