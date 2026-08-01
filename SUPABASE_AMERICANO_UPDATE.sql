-- Run this once in Supabase SQL Editor before deploying the Americano website update.
-- Existing tournaments remain Regular Team Tournaments and all historical data is preserved.

alter table tournaments
add column if not exists tournament_format text not null default 'regular';

alter table tournaments
add column if not exists americano_target_points integer not null default 24;

alter table tournaments
add column if not exists americano_round_count integer not null default 5;

alter table tournaments
add column if not exists points_scoring_mode text not null default 'fixed_total';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tournaments_format_check') then
    alter table tournaments
    add constraint tournaments_format_check
    check (tournament_format in ('regular', 'singles_americano', 'team_americano'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tournaments_americano_target_check') then
    alter table tournaments
    add constraint tournaments_americano_target_check
    check (americano_target_points between 1 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tournaments_americano_rounds_check') then
    alter table tournaments
    add constraint tournaments_americano_rounds_check
    check (americano_round_count between 1 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tournaments_points_scoring_mode_check') then
    alter table tournaments
    add constraint tournaments_points_scoring_mode_check
    check (points_scoring_mode in ('fixed_total', 'race_to'));
  end if;
end $$;

update tournaments
set tournament_format = 'regular'
where tournament_format is null;

create table if not exists tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (tournament_id, player_id)
);

create table if not exists americano_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number integer not null check (round_number between 1 and 200),
  court_number integer check (court_number between 1 and 20),
  side_1_team_id uuid references teams(id) on delete restrict,
  side_2_team_id uuid references teams(id) on delete restrict,
  side_1_player_1_id uuid references players(id) on delete restrict,
  side_1_player_2_id uuid references players(id) on delete restrict,
  side_2_player_1_id uuid references players(id) on delete restrict,
  side_2_player_2_id uuid references players(id) on delete restrict,
  side_1_points integer check (side_1_points between 0 and 100),
  side_2_points integer check (side_2_points between 0 and 100),
  winner_side smallint check (winner_side in (1, 2)),
  submitted_at timestamp with time zone,
  played_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint americano_match_participants check (
    (
      side_1_team_id is not null
      and side_2_team_id is not null
      and side_1_team_id <> side_2_team_id
      and side_1_player_1_id is null
      and side_1_player_2_id is null
      and side_2_player_1_id is null
      and side_2_player_2_id is null
    )
    or
    (
      side_1_team_id is null
      and side_2_team_id is null
      and side_1_player_1_id is not null
      and side_1_player_2_id is not null
      and side_2_player_1_id is not null
      and side_2_player_2_id is not null
      and side_1_player_1_id <> side_1_player_2_id
      and side_1_player_1_id <> side_2_player_1_id
      and side_1_player_1_id <> side_2_player_2_id
      and side_1_player_2_id <> side_2_player_1_id
      and side_1_player_2_id <> side_2_player_2_id
      and side_2_player_1_id <> side_2_player_2_id
    )
  ),
  constraint americano_match_scores check (
    (side_1_points is null and side_2_points is null and winner_side is null)
    or
    (
      side_1_points is not null
      and side_2_points is not null
      and (
        (side_1_points = side_2_points and winner_side is null)
        or
        (side_1_points > side_2_points and winner_side = 1)
        or
        (side_2_points > side_1_points and winner_side = 2)
      )
    )
  )
);

create index if not exists idx_tournament_players_tournament on tournament_players(tournament_id);
create index if not exists idx_americano_matches_tournament on americano_matches(tournament_id);
create index if not exists idx_americano_matches_round on americano_matches(tournament_id, round_number, court_number);

alter table tournament_players enable row level security;
alter table americano_matches enable row level security;

drop policy if exists "Public read tournament players" on tournament_players;
drop policy if exists "Authenticated admins manage tournament players" on tournament_players;
drop policy if exists "Public read americano matches" on americano_matches;
drop policy if exists "Authenticated admins manage americano matches" on americano_matches;

create policy "Public read tournament players"
on tournament_players for select using (true);

create policy "Authenticated admins manage tournament players"
on tournament_players for all using (public.is_admin()) with check (public.is_admin());

create policy "Public read americano matches"
on americano_matches for select using (true);

create policy "Authenticated admins manage americano matches"
on americano_matches for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_match_score(
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
  if not found then raise exception 'Match not found.'; end if;
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

  if p_team_1_score is null or p_team_2_score is null then raise exception 'Enter both team scores.'; end if;
  if p_team_1_score < 0 or p_team_2_score < 0 then raise exception 'Scores cannot be negative.'; end if;

  if selected_match.stage = 'group' then
    if p_ended_due_to_time then raise exception 'Group matches cannot be marked as ended due to court time.'; end if;
    if selected_tournament.points_scoring_mode = 'race_to' then
      if greatest(p_team_1_score, p_team_2_score) <> target_score
        or least(p_team_1_score, p_team_2_score) >= target_score
        or p_team_1_score = p_team_2_score then
        raise exception 'One team must reach % points and the other score must be lower.', target_score;
      end if;
    elsif p_team_1_score + p_team_2_score <> target_score then
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
      winning_team_id := case when p_team_1_score > p_team_2_score then selected_match.team_1_id else selected_match.team_2_id end;
      deciding_winner_team_id := null;
    end if;
  else
    if p_ended_due_to_time and not (
      greatest(p_team_1_score, p_team_2_score) = target_score
      and least(p_team_1_score, p_team_2_score) = target_score - 1
    ) then
      raise exception 'A time-limited finish must end at %-% only.', target_score, target_score - 1;
    end if;
    if not (
      (greatest(p_team_1_score, p_team_2_score) = target_score and least(p_team_1_score, p_team_2_score) < target_score - 1)
      or (greatest(p_team_1_score, p_team_2_score) = target_score + 1 and least(p_team_1_score, p_team_2_score) >= target_score - 1 and least(p_team_1_score, p_team_2_score) < target_score + 1)
      or (p_ended_due_to_time and greatest(p_team_1_score, p_team_2_score) = target_score and least(p_team_1_score, p_team_2_score) = target_score - 1)
    ) then
      raise exception 'Finish at %, continue to % after %-% or confirm a time-limited finish at %-% only.', target_score, target_score + 1, target_score - 1, target_score - 1, target_score, target_score - 1;
    end if;
    winning_team_id := case when p_team_1_score > p_team_2_score then selected_match.team_1_id else selected_match.team_2_id end;
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

drop function if exists public.submit_americano_score(uuid, integer, integer);

create or replace function public.submit_americano_score(
  p_match_id uuid,
  p_side_1_points integer,
  p_side_2_points integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_match americano_matches%rowtype;
  selected_tournament tournaments%rowtype;
  winning_side smallint;
begin
  select * into selected_match
  from americano_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Americano match not found.';
  end if;
  if selected_match.side_1_points is not null or selected_match.side_2_points is not null then
    raise exception 'This match already has a result. Ask the Admin to reset it if needed.';
  end if;

  select * into selected_tournament
  from tournaments
  where id = selected_match.tournament_id;

  if selected_tournament.status <> 'active' then
    raise exception 'Participant score entry opens when the tournament is active.';
  end if;
  if selected_tournament.tournament_format not in ('singles_americano', 'team_americano') then
    raise exception 'This is not an Americano tournament.';
  end if;
  if p_side_1_points is null or p_side_2_points is null then
    raise exception 'Enter both scores.';
  end if;
  if p_side_1_points < 0 or p_side_2_points < 0 then
    raise exception 'Scores cannot be negative.';
  end if;
  if selected_tournament.points_scoring_mode = 'race_to' then
    if greatest(p_side_1_points, p_side_2_points) <> selected_tournament.americano_target_points
      or least(p_side_1_points, p_side_2_points) >= selected_tournament.americano_target_points
      or p_side_1_points = p_side_2_points then
      raise exception 'One side must reach % points and the other score must be lower.', selected_tournament.americano_target_points;
    end if;
  elsif p_side_1_points + p_side_2_points <> selected_tournament.americano_target_points then
    raise exception 'The two scores must total % points.', selected_tournament.americano_target_points;
  end if;

  winning_side := case
    when p_side_1_points > p_side_2_points then 1
    when p_side_2_points > p_side_1_points then 2
    else null
  end;

  update americano_matches
  set side_1_points = p_side_1_points,
      side_2_points = p_side_2_points,
      winner_side = winning_side,
      submitted_at = now(),
      played_at = now()
  where id = p_match_id;
end;
$$;

revoke all on function public.submit_americano_score(uuid, integer, integer) from public;
grant execute on function public.submit_americano_score(uuid, integer, integer) to anon;
grant execute on function public.submit_americano_score(uuid, integer, integer) to authenticated;
grant select on tournament_players, americano_matches to anon, authenticated;
grant insert, update, delete on tournament_players, americano_matches to authenticated;
