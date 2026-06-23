create extension if not exists "pgcrypto";

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  created_at timestamp with time zone default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  player_1_id uuid not null references players(id) on delete restrict,
  player_2_id uuid not null references players(id) on delete restrict,
  team_name text not null,
  team_photo_url text,
  created_at timestamp with time zone default now(),
  constraint teams_distinct_players check (player_1_id <> player_2_id)
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  friend_circle text not null default 'circle_1' check (friend_circle in ('circle_1', 'circle_2', 'circle_3')),
  group_target_games integer not null default 3 check (group_target_games between 1 and 10),
  semifinal_target_games integer not null default 3 check (semifinal_target_games between 1 and 10),
  final_target_games integer not null default 3 check (final_target_games between 1 and 10),
  third_place_target_games integer not null default 3 check (third_place_target_games between 1 and 10),
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'completed')),
  start_date date not null default current_date,
  end_date date,
  champion_team_id uuid references teams(id),
  runner_up_team_id uuid references teams(id),
  third_place_team_id uuid references teams(id),
  cover_image_url text,
  created_at timestamp with time zone default now()
);

alter table tournaments
add column if not exists friend_circle text not null default 'circle_1';

alter table tournaments
add column if not exists group_target_games integer not null default 3;

alter table tournaments
add column if not exists semifinal_target_games integer not null default 3;

alter table tournaments
add column if not exists final_target_games integer not null default 3;

alter table tournaments
add column if not exists third_place_target_games integer not null default 3;

create table if not exists tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (tournament_id, team_id)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_1_id uuid not null references teams(id) on delete restrict,
  team_2_id uuid not null references teams(id) on delete restrict,
  team_1_games integer,
  team_2_games integer,
  winner_team_id uuid references teams(id),
  stage text not null check (stage in ('group', 'semifinal', 'final', 'third_place')),
  played_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint matches_distinct_teams check (team_1_id <> team_2_id),
  constraint matches_valid_scores check (
    (team_1_games is null and team_2_games is null and winner_team_id is null)
    or (
      team_1_games between 0 and 10
      and team_2_games between 0 and 10
      and team_1_games <> team_2_games
      and greatest(team_1_games, team_2_games) between 1 and 10
      and least(team_1_games, team_2_games) < greatest(team_1_games, team_2_games)
      and winner_team_id = case when team_1_games > team_2_games then team_1_id else team_2_id end
    )
  )
);

alter table matches
drop constraint if exists matches_valid_scores;

alter table matches
add constraint matches_valid_scores check (
  (team_1_games is null and team_2_games is null and winner_team_id is null)
  or (
    team_1_games between 0 and 10
    and team_2_games between 0 and 10
    and team_1_games <> team_2_games
    and greatest(team_1_games, team_2_games) between 1 and 10
    and least(team_1_games, team_2_games) < greatest(team_1_games, team_2_games)
    and winner_team_id = case when team_1_games > team_2_games then team_1_id else team_2_id end
  )
);

create index if not exists idx_matches_tournament on matches(tournament_id);
create index if not exists idx_matches_teams on matches(team_1_id, team_2_id);
create index if not exists idx_tournament_teams_tournament on tournament_teams(tournament_id);

alter table players enable row level security;
alter table teams enable row level security;
alter table tournaments enable row level security;
alter table tournament_teams enable row level security;
alter table matches enable row level security;

drop policy if exists "Public read players" on players;
drop policy if exists "Public read teams" on teams;
drop policy if exists "Public read tournaments" on tournaments;
drop policy if exists "Public read tournament teams" on tournament_teams;
drop policy if exists "Public read matches" on matches;
drop policy if exists "Authenticated admins manage players" on players;
drop policy if exists "Authenticated admins manage teams" on teams;
drop policy if exists "Authenticated admins manage tournaments" on tournaments;
drop policy if exists "Authenticated admins manage tournament teams" on tournament_teams;
drop policy if exists "Authenticated admins manage matches" on matches;

create policy "Public read players" on players for select using (true);
create policy "Public read teams" on teams for select using (true);
create policy "Public read tournaments" on tournaments for select using (true);
create policy "Public read tournament teams" on tournament_teams for select using (true);
create policy "Public read matches" on matches for select using (true);

create policy "Authenticated admins manage players" on players for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated admins manage teams" on teams for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated admins manage tournaments" on tournaments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated admins manage tournament teams" on tournament_teams for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated admins manage matches" on matches for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values
  ('player-photos', 'player-photos', true),
  ('team-photos', 'team-photos', true),
  ('tournament-photos', 'tournament-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read tournament images" on storage.objects;
drop policy if exists "Authenticated admins upload tournament images" on storage.objects;
drop policy if exists "Authenticated admins update tournament images" on storage.objects;
drop policy if exists "Authenticated admins delete tournament images" on storage.objects;

create policy "Public read tournament images"
on storage.objects for select
using (bucket_id in ('player-photos', 'team-photos', 'tournament-photos'));

create policy "Authenticated admins upload tournament images"
on storage.objects for insert
with check (auth.role() = 'authenticated' and bucket_id in ('player-photos', 'team-photos', 'tournament-photos'));

create policy "Authenticated admins update tournament images"
on storage.objects for update
using (auth.role() = 'authenticated' and bucket_id in ('player-photos', 'team-photos', 'tournament-photos'));

create policy "Authenticated admins delete tournament images"
on storage.objects for delete
using (auth.role() = 'authenticated' and bucket_id in ('player-photos', 'team-photos', 'tournament-photos'));
