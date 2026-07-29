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
  group_count integer not null default 1 check (group_count in (1, 2)),
  court_count integer not null default 4 check (court_count between 1 and 20),
  group_target_points integer not null default 15 check (group_target_points between 1 and 100),
  semifinal_target_games integer not null default 6 check (semifinal_target_games between 1 and 10),
  final_target_games integer not null default 6 check (final_target_games between 1 and 10),
  third_place_target_games integer not null default 6 check (third_place_target_games between 1 and 10),
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
add column if not exists group_count integer not null default 1;

alter table tournaments
add column if not exists court_count integer not null default 4;

alter table tournaments
add column if not exists group_target_points integer not null default 15;

alter table tournaments
add column if not exists semifinal_target_games integer not null default 6;

alter table tournaments
add column if not exists final_target_games integer not null default 6;

alter table tournaments
add column if not exists third_place_target_games integer not null default 6;

alter table tournaments
drop column if exists tournament_format;

alter table tournaments
drop column if exists group_target_games;

create table if not exists tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  group_name text not null default 'A' check (group_name in ('A', 'B')),
  created_at timestamp with time zone default now(),
  unique (tournament_id, team_id)
);

alter table tournament_teams
add column if not exists group_name text not null default 'A';

create table if not exists tournament_court_streams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  court_number integer not null check (court_number between 1 and 20),
  youtube_url text not null check (youtube_url ~* '^https?://'),
  created_at timestamp with time zone default now(),
  unique (tournament_id, court_number)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_1_id uuid not null references teams(id) on delete restrict,
  team_2_id uuid not null references teams(id) on delete restrict,
  team_1_games integer,
  team_2_games integer,
  winner_team_id uuid references teams(id),
  deciding_point_winner_team_id uuid references teams(id),
  ended_due_to_time boolean not null default false,
  stage text not null check (stage in ('group', 'semifinal', 'final', 'third_place')),
  group_name text check (group_name in ('A', 'B')),
  court_number integer check (court_number between 1 and 20),
  submitted_by uuid references auth.users(id),
  submitted_at timestamp with time zone,
  played_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint matches_distinct_teams check (team_1_id <> team_2_id),
  constraint matches_valid_scores check (
    (
      team_1_games is null
      and team_2_games is null
      and winner_team_id is null
      and deciding_point_winner_team_id is null
    )
    or (
      team_1_games between 0 and 100
      and team_2_games between 0 and 100
      and (
        (
          team_1_games = team_2_games
          and stage = 'group'
          and (
            (winner_team_id is null and deciding_point_winner_team_id is null)
            or (
              deciding_point_winner_team_id in (team_1_id, team_2_id)
              and winner_team_id = deciding_point_winner_team_id
            )
          )
        )
        or (
          team_1_games <> team_2_games
          and deciding_point_winner_team_id is null
          and winner_team_id = case when team_1_games > team_2_games then team_1_id else team_2_id end
        )
      )
    )
  )
);

alter table matches
add column if not exists group_name text;

alter table matches
add column if not exists court_number integer;

alter table matches
add column if not exists submitted_by uuid references auth.users(id);

alter table matches
add column if not exists submitted_at timestamp with time zone;

alter table matches
add column if not exists deciding_point_winner_team_id uuid references teams(id);

alter table matches
add column if not exists ended_due_to_time boolean not null default false;

drop table if exists americano_matches cascade;
drop table if exists tournament_players cascade;

alter table matches
drop constraint if exists matches_valid_scores;

alter table matches
add constraint matches_valid_scores check (
  (
    team_1_games is null
    and team_2_games is null
    and winner_team_id is null
    and deciding_point_winner_team_id is null
  )
  or (
    team_1_games between 0 and 100
    and team_2_games between 0 and 100
    and (
      (
        team_1_games = team_2_games
        and stage = 'group'
        and (
          (winner_team_id is null and deciding_point_winner_team_id is null)
          or (
            deciding_point_winner_team_id in (team_1_id, team_2_id)
            and winner_team_id = deciding_point_winner_team_id
          )
        )
      )
      or (
        team_1_games <> team_2_games
        and deciding_point_winner_team_id is null
        and winner_team_id = case when team_1_games > team_2_games then team_1_id else team_2_id end
      )
    )
  )
);

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

insert into admin_users (user_id)
select id
from auth.users
where not exists (select 1 from admin_users)
order by created_at asc
limit 1
on conflict (user_id) do nothing;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  voter_token text not null,
  predicted_team_id uuid not null references teams(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (tournament_id, voter_token)
);

alter table predictions
add column if not exists voter_token text;

delete from predictions where voter_token is null;

alter table predictions
alter column voter_token set not null;

alter table predictions
drop column if exists voter_id cascade;

create index if not exists idx_predictions_tournament on predictions(tournament_id);
create unique index if not exists idx_predictions_one_vote_per_browser
on predictions(tournament_id, voter_token);

drop function if exists public.submit_match_score(uuid, integer, integer);
drop function if exists public.submit_match_score(uuid, integer, integer, uuid);
drop function if exists public.submit_match_score(uuid, integer, integer, uuid, boolean);

create or replace function submit_match_score(
  p_match_id uuid,
  p_team_1_score integer,
  p_team_2_score integer,
  p_deciding_point_winner_team_id uuid default null,
  p_ended_due_to_time boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_match matches%rowtype;
  selected_tournament tournaments%rowtype;
  target_score integer;
  winning_team_id uuid;
  deciding_winner_team_id uuid;
begin
  select * into selected_match from matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found.';
  end if;
  if selected_match.team_1_games is not null or selected_match.team_2_games is not null then
    raise exception 'This match already has a result. Ask the Admin to correct it if needed.';
  end if;

  select * into selected_tournament from tournaments where id = selected_match.tournament_id;
  if selected_tournament.status <> 'active' then
    raise exception 'Participant score entry opens when the tournament is active.';
  end if;
  target_score := case selected_match.stage
    when 'group' then selected_tournament.group_target_points
    when 'semifinal' then selected_tournament.semifinal_target_games
    when 'final' then selected_tournament.final_target_games
    else selected_tournament.third_place_target_games
  end;

  if p_team_1_score is null or p_team_2_score is null then
    raise exception 'Enter both team scores.';
  end if;
  if p_team_1_score < 0 or p_team_2_score < 0 then
    raise exception 'Scores cannot be negative.';
  end if;

  if selected_match.stage = 'group' then
    if p_ended_due_to_time then
      raise exception 'Group matches cannot be marked as ended due to court time.';
    end if;
    if p_team_1_score + p_team_2_score <> target_score then
      raise exception 'The two team scores must total % points.', target_score;
    end if;
    if p_team_1_score = p_team_2_score then
      if p_deciding_point_winner_team_id is null
        or p_deciding_point_winner_team_id not in (selected_match.team_1_id, selected_match.team_2_id) then
        raise exception 'Select the team that won the Golden point.';
      end if;
      winning_team_id := p_deciding_point_winner_team_id;
      deciding_winner_team_id := p_deciding_point_winner_team_id;
    else
      winning_team_id := case
        when p_team_1_score > p_team_2_score then selected_match.team_1_id
        else selected_match.team_2_id
      end;
      deciding_winner_team_id := null;
    end if;
  else
    if p_ended_due_to_time and not (
      greatest(p_team_1_score, p_team_2_score) = target_score + 1
      and least(p_team_1_score, p_team_2_score) = target_score
    ) then
      raise exception 'A time-limited finish must end at %-% only.', target_score + 1, target_score;
    end if;
    if not (
      (
        greatest(p_team_1_score, p_team_2_score) = target_score
        and least(p_team_1_score, p_team_2_score) < target_score
      )
      or (
        greatest(p_team_1_score, p_team_2_score) = target_score + 2
        and least(p_team_1_score, p_team_2_score) >= target_score
        and least(p_team_1_score, p_team_2_score) < target_score + 2
      )
      or (
        p_ended_due_to_time
        and greatest(p_team_1_score, p_team_2_score) = target_score + 1
        and least(p_team_1_score, p_team_2_score) = target_score
      )
    ) then
      raise exception 'Finish at %, continue to %, or confirm a time-limited finish at %-% only.', target_score, target_score + 2, target_score + 1, target_score;
    end if;
    winning_team_id := case
      when p_team_1_score > p_team_2_score then selected_match.team_1_id
      else selected_match.team_2_id
    end;
    deciding_winner_team_id := null;
  end if;

  update matches
  set team_1_games = p_team_1_score,
      team_2_games = p_team_2_score,
      winner_team_id = winning_team_id,
      deciding_point_winner_team_id = deciding_winner_team_id,
      ended_due_to_time = p_ended_due_to_time,
      submitted_by = auth.uid(),
      submitted_at = now(),
      played_at = now()
  where id = p_match_id;
end;
$$;

create index if not exists idx_matches_tournament on matches(tournament_id);
create index if not exists idx_matches_teams on matches(team_1_id, team_2_id);
create index if not exists idx_tournament_teams_tournament on tournament_teams(tournament_id);

alter table players enable row level security;
alter table teams enable row level security;
alter table tournaments enable row level security;
alter table tournament_teams enable row level security;
alter table tournament_court_streams enable row level security;
alter table matches enable row level security;
alter table admin_users enable row level security;
alter table predictions enable row level security;

drop policy if exists "Public read players" on players;
drop policy if exists "Public read teams" on teams;
drop policy if exists "Public read tournaments" on tournaments;
drop policy if exists "Public read tournament teams" on tournament_teams;
drop policy if exists "Public read tournament court streams" on tournament_court_streams;
drop policy if exists "Public read matches" on matches;
drop policy if exists "Authenticated admins manage players" on players;
drop policy if exists "Authenticated admins manage teams" on teams;
drop policy if exists "Authenticated admins manage tournaments" on tournaments;
drop policy if exists "Authenticated admins manage tournament teams" on tournament_teams;
drop policy if exists "Authenticated admins manage tournament court streams" on tournament_court_streams;
drop policy if exists "Authenticated admins manage matches" on matches;
drop policy if exists "Users read own admin status" on admin_users;
drop policy if exists "Public read predictions" on predictions;
drop policy if exists "Participants add one prediction" on predictions;
drop policy if exists "Visitors add one prediction" on predictions;
drop policy if exists "Admins manage predictions" on predictions;

create policy "Public read players" on players for select using (true);
create policy "Public read teams" on teams for select using (true);
create policy "Public read tournaments" on tournaments for select using (true);
create policy "Public read tournament teams" on tournament_teams for select using (true);
create policy "Public read tournament court streams" on tournament_court_streams for select using (true);
create policy "Public read matches" on matches for select using (true);
create policy "Public read predictions" on predictions for select using (true);

create policy "Authenticated admins manage players" on players for all using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated admins manage teams" on teams for all using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated admins manage tournaments" on tournaments for all using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated admins manage tournament teams" on tournament_teams for all using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated admins manage tournament court streams" on tournament_court_streams for all using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated admins manage matches" on matches for all using (public.is_admin()) with check (public.is_admin());
create policy "Users read own admin status" on admin_users for select using (user_id = auth.uid());
create policy "Visitors add one prediction" on predictions
for insert
with check (
  char_length(voter_token) between 20 and 100
  and exists (
    select 1 from tournaments as prediction_tournament
    where prediction_tournament.id = predictions.tournament_id
      and prediction_tournament.status = 'upcoming'
  )
  and exists (
    select 1 from tournament_teams as prediction_team
    where prediction_team.tournament_id = predictions.tournament_id
      and prediction_team.team_id = predictions.predicted_team_id
  )
);
create policy "Admins manage predictions" on predictions for all using (public.is_admin()) with check (public.is_admin());

revoke all on function submit_match_score(uuid, integer, integer, uuid, boolean) from public;
grant execute on function public.is_admin() to authenticated;
grant select, insert on predictions to anon, authenticated;
grant select on tournament_court_streams to anon, authenticated;
grant insert, update, delete on tournament_court_streams to authenticated;
grant execute on function public.submit_match_score(uuid, integer, integer, uuid, boolean) to anon;
grant execute on function public.submit_match_score(uuid, integer, integer, uuid, boolean) to authenticated;

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
with check (public.is_admin() and bucket_id in ('player-photos', 'team-photos', 'tournament-photos'));

create policy "Authenticated admins update tournament images"
on storage.objects for update
using (public.is_admin() and bucket_id in ('player-photos', 'team-photos', 'tournament-photos'));

create policy "Authenticated admins delete tournament images"
on storage.objects for delete
using (public.is_admin() and bucket_id in ('player-photos', 'team-photos', 'tournament-photos'));
