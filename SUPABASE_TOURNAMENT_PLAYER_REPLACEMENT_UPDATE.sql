-- TOURNAMENT-SPECIFIC PLAYER REPLACEMENT
-- Run this complete file once in Supabase SQL Editor before deploying V27.
-- Existing teams, schedules, scores, standings, ratings and player history are preserved.

alter table public.tournament_teams
add column if not exists player_1_id uuid references public.players(id) on delete restrict,
add column if not exists player_2_id uuid references public.players(id) on delete restrict;

update public.tournament_teams as assignment
set player_1_id = coalesce(assignment.player_1_id, team.player_1_id),
    player_2_id = coalesce(assignment.player_2_id, team.player_2_id)
from public.teams as team
where team.id = assignment.team_id
  and (assignment.player_1_id is null or assignment.player_2_id is null);

alter table public.tournament_teams
alter column player_1_id set not null,
alter column player_2_id set not null;

alter table public.matches
add column if not exists team_1_player_1_id uuid references public.players(id) on delete restrict,
add column if not exists team_1_player_2_id uuid references public.players(id) on delete restrict,
add column if not exists team_2_player_1_id uuid references public.players(id) on delete restrict,
add column if not exists team_2_player_2_id uuid references public.players(id) on delete restrict;

update public.matches as match
set team_1_player_1_id = coalesce(match.team_1_player_1_id, team_1.player_1_id),
    team_1_player_2_id = coalesce(match.team_1_player_2_id, team_1.player_2_id),
    team_2_player_1_id = coalesce(match.team_2_player_1_id, team_2.player_1_id),
    team_2_player_2_id = coalesce(match.team_2_player_2_id, team_2.player_2_id)
from public.teams as team_1, public.teams as team_2
where team_1.id = match.team_1_id
  and team_2.id = match.team_2_id
  and (
    match.team_1_player_1_id is null or match.team_1_player_2_id is null
    or match.team_2_player_1_id is null or match.team_2_player_2_id is null
  );

alter table public.matches
alter column team_1_player_1_id set not null,
alter column team_1_player_2_id set not null,
alter column team_2_player_1_id set not null,
alter column team_2_player_2_id set not null;

create or replace function public.populate_tournament_team_roster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_team public.teams%rowtype;
begin
  if tg_op = 'INSERT' or new.team_id is distinct from old.team_id then
    select * into selected_team from public.teams where id = new.team_id;
    if selected_team.id is null then raise exception 'Team not found.'; end if;
    new.player_1_id := selected_team.player_1_id;
    new.player_2_id := selected_team.player_2_id;
  end if;
  if new.player_1_id = new.player_2_id then raise exception 'A tournament team needs two different players.'; end if;
  return new;
end;
$$;

drop trigger if exists tournament_teams_populate_roster on public.tournament_teams;
create trigger tournament_teams_populate_roster
before insert or update of team_id on public.tournament_teams
for each row execute procedure public.populate_tournament_team_roster();

create or replace function public.populate_match_rosters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_assignment public.tournament_teams%rowtype;
  second_assignment public.tournament_teams%rowtype;
begin
  if tg_op = 'INSERT'
    or new.tournament_id is distinct from old.tournament_id
    or new.team_1_id is distinct from old.team_1_id then
    select * into first_assignment from public.tournament_teams
    where tournament_id = new.tournament_id and team_id = new.team_1_id;
    if first_assignment.id is null then raise exception 'Team 1 is not assigned to this tournament.'; end if;
    new.team_1_player_1_id := first_assignment.player_1_id;
    new.team_1_player_2_id := first_assignment.player_2_id;
  end if;

  if tg_op = 'INSERT'
    or new.tournament_id is distinct from old.tournament_id
    or new.team_2_id is distinct from old.team_2_id then
    select * into second_assignment from public.tournament_teams
    where tournament_id = new.tournament_id and team_id = new.team_2_id;
    if second_assignment.id is null then raise exception 'Team 2 is not assigned to this tournament.'; end if;
    new.team_2_player_1_id := second_assignment.player_1_id;
    new.team_2_player_2_id := second_assignment.player_2_id;
  end if;
  return new;
end;
$$;

drop trigger if exists a_matches_populate_rosters on public.matches;
create trigger a_matches_populate_rosters
before insert or update of tournament_id, team_1_id, team_2_id on public.matches
for each row execute procedure public.populate_match_rosters();

create table if not exists public.tournament_player_replacements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  outgoing_player_id uuid not null references public.players(id) on delete restrict,
  replacement_player_id uuid not null references public.players(id) on delete restrict,
  replaced_by uuid references auth.users(id) on delete set null default auth.uid(),
  replaced_at timestamp with time zone not null default now(),
  check (outgoing_player_id <> replacement_player_id)
);

alter table public.tournament_player_replacements enable row level security;
drop policy if exists "Admins manage tournament player replacements" on public.tournament_player_replacements;
create policy "Admins manage tournament player replacements"
on public.tournament_player_replacements for all
using (public.is_admin()) with check (public.is_admin());

alter table public.rating_calibrations
add column if not exists published_at timestamp with time zone;

alter table public.matches
add column if not exists team_1_rating_change numeric(7,3),
add column if not exists team_2_rating_change numeric(7,3);

alter table public.rating_events
add column if not exists rated_matches_before integer not null default 0,
add column if not exists provisional_before boolean not null default false,
add column if not exists reliability_change integer not null default 0;

create unique index if not exists rating_events_one_player_per_match
on public.rating_events(match_id, player_id)
where match_id is not null;

create or replace function public.process_regular_match_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  result_changed boolean := true;
  old_event public.rating_events%rowtype;
  selected_team_1 public.teams%rowtype;
  selected_team_2 public.teams%rowtype;
  current_rating public.player_ratings%rowtype;
  participant record;
  publication_time timestamp with time zone;
  league_average numeric(7,3);
  team_1_before numeric(7,3);
  team_2_before numeric(7,3);
  team_1_actual numeric(3,2);
  team_2_actual numeric(3,2);
  opponent_team_rating numeric(7,3);
  player_expected numeric(10,6);
  player_actual numeric(3,2);
  raw_change numeric(10,6);
  player_change numeric(7,3);
  rating_after numeric(7,3);
  provisional_multiplier numeric(7,3);
  high_rating_gain_multiplier numeric(7,3);
  reliability_after integer;
  actual_reliability_change integer;
  team_1_change_total numeric(7,3) := 0;
  team_2_change_total numeric(7,3) := 0;
begin
  if tg_op = 'UPDATE' then
    result_changed := row(old.team_1_games, old.team_2_games, old.winner_team_id)
      is distinct from row(new.team_1_games, new.team_2_games, new.winner_team_id);
    if not result_changed then
      return new;
    end if;
  end if;

  -- Rating updates are serialized so simultaneous score submissions cannot
  -- overwrite one another's player ratings.
  perform pg_advisory_xact_lock(hashtext('padel_regular_match_rating_v2'));

  if tg_op in ('UPDATE', 'DELETE') and old.winner_team_id is not null then
    for old_event in
      select *
      from public.rating_events
      where match_id = old.id
      order by created_at desc
    loop
      update public.player_ratings
      set rating = greatest(1.000, least(10.000, rating - old_event.rating_change)),
          reliability = greatest(0, reliability - old_event.reliability_change),
          rated_matches = greatest(0, rated_matches - 1),
          provisional = case
            when old_event.provisional_before and greatest(0, rated_matches - 1) < 10 then true
            else provisional
          end,
          updated_at = now()
      where player_id = old_event.player_id;
    end loop;

    delete from public.rating_events where match_id = old.id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.team_1_rating_change := null;
  new.team_2_rating_change := null;

  if new.winner_team_id is null
    or new.team_1_games is null
    or new.team_2_games is null then
    return new;
  end if;

  select max(published_at)
  into publication_time
  from public.rating_calibrations
  where published_at is not null;

  -- Matches before the first published leaderboard remain historical only and
  -- never alter the calibrated baseline.
  if publication_time is null
    or coalesce(new.played_at, new.submitted_at, new.created_at) < publication_time then
    return new;
  end if;

  select * into selected_team_1 from public.teams where id = new.team_1_id;
  select * into selected_team_2 from public.teams where id = new.team_2_id;
  if selected_team_1.id is null or selected_team_2.id is null then
    return new;
  end if;
  selected_team_1.player_1_id := new.team_1_player_1_id;
  selected_team_1.player_2_id := new.team_1_player_2_id;
  selected_team_2.player_1_id := new.team_2_player_1_id;
  selected_team_2.player_2_id := new.team_2_player_2_id;

  select coalesce(avg(rating), 5.000)::numeric(7,3)
  into league_average
  from public.player_ratings as published_rating
  join public.players as active_player on active_player.id = published_rating.player_id
  where active_player.is_active = true;

  insert into public.player_ratings (player_id, rating, reliability, rated_matches, provisional)
  values
    (selected_team_1.player_1_id, league_average, 0, 0, true),
    (selected_team_1.player_2_id, league_average, 0, 0, true),
    (selected_team_2.player_1_id, league_average, 0, 0, true),
    (selected_team_2.player_2_id, league_average, 0, 0, true)
  on conflict (player_id) do nothing;

  select avg(rating)::numeric(7,3) into team_1_before
  from public.player_ratings
  where player_id in (selected_team_1.player_1_id, selected_team_1.player_2_id);

  select avg(rating)::numeric(7,3) into team_2_before
  from public.player_ratings
  where player_id in (selected_team_2.player_1_id, selected_team_2.player_2_id);

  if new.winner_team_id = new.team_1_id then
    team_1_actual := 1.00;
    team_2_actual := 0.00;
  elsif new.winner_team_id = new.team_2_id then
    team_1_actual := 0.00;
    team_2_actual := 1.00;
  else
    raise exception 'The match winner must be one of the two teams.';
  end if;

  for participant in
    select * from (values
      (selected_team_1.player_1_id, 1),
      (selected_team_1.player_2_id, 1),
      (selected_team_2.player_1_id, 2),
      (selected_team_2.player_2_id, 2)
    ) as participants(player_id, team_number)
  loop
    select * into current_rating
    from public.player_ratings
    where player_id = participant.player_id
    for update;

    -- Each player is assessed separately against the opposing team's average.
    -- This gives a weaker and stronger partner different movement from the
    -- same result while preserving the shared win or loss.
    if participant.team_number = 1 then
      opponent_team_rating := team_2_before;
      player_actual := team_1_actual;
    else
      opponent_team_rating := team_1_before;
      player_actual := team_2_actual;
    end if;

    player_expected := (
      1.000000 / (
        1.000000
        + power(10.000000, (opponent_team_rating - current_rating.rating) / 4.000000)
      )
    )::numeric(10,6);

    -- A standard K value of 0.20 is reduced to 75% for every group and
    -- knockout match, giving an effective established-player K of 0.15.
    raw_change := 0.150000 * (player_actual - player_expected);

    provisional_multiplier := case
      when not current_rating.provisional then 1.000
      when current_rating.rated_matches < 3 then 1.500
      when current_rating.rated_matches < 6 then 1.300
      when current_rating.rated_matches < 10 then 1.150
      else 1.000
    end;

    -- Positive movement tapers smoothly above 8.00: 8.50 receives 75%,
    -- 9.00 receives 50%, 9.50 receives 25%, and 9.80+ receives 10%.
    high_rating_gain_multiplier := case
      when current_rating.rating < 8.000 then 1.000
      else greatest(0.100, 1.000 - ((current_rating.rating - 8.000) * 0.500))
    end;

    player_change := raw_change * provisional_multiplier;
    if player_change > 0 then
      player_change := player_change * high_rating_gain_multiplier;
    end if;
    player_change := round(player_change, 3);

    rating_after := greatest(1.000, least(10.000, current_rating.rating + player_change));
    player_change := rating_after - current_rating.rating;
    reliability_after := least(100, current_rating.reliability + case when current_rating.provisional then 10 else 0 end);
    actual_reliability_change := reliability_after - current_rating.reliability;

    insert into public.rating_events (
      player_id,
      match_id,
      rating_before,
      rating_change,
      rating_after,
      reason,
      rated_matches_before,
      provisional_before,
      reliability_change
    ) values (
      participant.player_id,
      new.id,
      current_rating.rating,
      player_change,
      rating_after,
      'Elo v2.1 individual regular tournament match: ' || new.stage::text,
      current_rating.rated_matches,
      current_rating.provisional,
      actual_reliability_change
    );

    update public.player_ratings
    set rating = rating_after,
        reliability = reliability_after,
        rated_matches = current_rating.rated_matches + 1,
        provisional = case
          when current_rating.provisional and current_rating.rated_matches + 1 >= 10 then false
          else current_rating.provisional
        end,
        updated_at = now()
    where player_id = participant.player_id;

    if participant.team_number = 1 then
      team_1_change_total := team_1_change_total + player_change;
    else
      team_2_change_total := team_2_change_total + player_change;
    end if;
  end loop;

  new.team_1_rating_change := round(team_1_change_total / 2.000, 3);
  new.team_2_rating_change := round(team_2_change_total / 2.000, 3);
  return new;
end;
$$;

drop trigger if exists matches_process_rating on public.matches;
create trigger matches_process_rating
before insert or update or delete on public.matches
for each row execute procedure public.process_regular_match_rating();

create or replace function public.rebuild_regular_match_ratings_after_publication()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  publication_time timestamp with time zone;
  saved_match record;
  cleared_count integer := 0;
  replayed_count integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('padel_regular_match_rating_v2'));

  select max(published_at)
  into publication_time
  from public.rating_calibrations
  where published_at is not null;

  if publication_time is null then
    raise exception 'Publish the community rating calibration before rebuilding match ratings.';
  end if;

  drop table if exists pg_temp.rating_rebuild_matches;
  create temporary table rating_rebuild_matches on commit drop as
  select
    match.id,
    match.team_1_games,
    match.team_2_games,
    match.winner_team_id,
    match.deciding_point_winner_team_id,
    match.ended_due_to_time,
    match.played_at,
    match.submitted_at,
    match.created_at
  from public.matches as match
  where match.team_1_games is not null
    and match.team_2_games is not null
    and match.winner_team_id is not null
    and coalesce(match.played_at, match.submitted_at, match.created_at) >= publication_time;

  -- Reverse chronological order precisely unwinds any previous rating limits,
  -- provisional changes and reliability changes.
  for saved_match in
    select *
    from rating_rebuild_matches
    order by coalesce(played_at, submitted_at, created_at) desc, id desc
  loop
    update public.matches
    set team_1_games = null,
        team_2_games = null,
        winner_team_id = null,
        deciding_point_winner_team_id = null,
        ended_due_to_time = false
    where id = saved_match.id;
    cleared_count := cleared_count + 1;
  end loop;

  -- Remove only post-publication provisional starting rows involved in this
  -- replay. They will be recreated at the correct league average when their
  -- first historical match is processed. Published baseline players are not
  -- provisional and are therefore preserved.
  delete from public.player_ratings as player_rating
  where player_rating.provisional = true
    and player_rating.rated_matches = 0
    and exists (
      select 1
      from rating_rebuild_matches as rebuild_match
      join public.matches as match on match.id = rebuild_match.id
      join public.teams as team on team.id in (match.team_1_id, match.team_2_id)
      where player_rating.player_id in (team.player_1_id, team.player_2_id)
    );

  -- Chronological replay makes every later match use the ratings produced by
  -- all earlier matches, exactly as if Elo v2 had been active from publication.
  for saved_match in
    select *
    from rating_rebuild_matches
    order by coalesce(played_at, submitted_at, created_at) asc, id asc
  loop
    update public.matches
    set team_1_games = saved_match.team_1_games,
        team_2_games = saved_match.team_2_games,
        winner_team_id = saved_match.winner_team_id,
        deciding_point_winner_team_id = saved_match.deciding_point_winner_team_id,
        ended_due_to_time = saved_match.ended_due_to_time
    where id = saved_match.id;
    replayed_count := replayed_count + 1;
  end loop;

  return jsonb_build_object(
    'rating_system', 'elo_v2.1_individual',
    'publication_time', publication_time,
    'matches_rebuilt', replayed_count,
    'matches_rewound', cleared_count
  );
end;
$$;

revoke execute on function public.rebuild_regular_match_ratings_after_publication() from public, anon, authenticated;

create or replace function public.replace_tournament_player(
  p_tournament_id uuid,
  p_team_id uuid,
  p_outgoing_player_id uuid,
  p_replacement_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_tournament public.tournaments%rowtype;
  selected_assignment public.tournament_teams%rowtype;
  updated_matches integer := 0;
  recalculated_completed integer := 0;
begin
  if not public.is_admin() then raise exception 'Only an Admin can replace a tournament player.'; end if;
  if p_outgoing_player_id = p_replacement_player_id then raise exception 'Choose a different replacement player.'; end if;

  select * into selected_tournament from public.tournaments where id = p_tournament_id for update;
  if selected_tournament.id is null then raise exception 'Tournament not found.'; end if;
  if selected_tournament.status = 'completed' then raise exception 'A completed tournament roster cannot be changed.'; end if;

  select * into selected_assignment from public.tournament_teams
  where tournament_id = p_tournament_id and team_id = p_team_id for update;
  if selected_assignment.id is null then raise exception 'This team is not participating in the tournament.'; end if;
  if p_outgoing_player_id not in (selected_assignment.player_1_id, selected_assignment.player_2_id) then
    raise exception 'The outgoing player is not in this tournament team.';
  end if;
  if not exists (select 1 from public.players where id = p_replacement_player_id and is_active = true) then
    raise exception 'The replacement player does not exist or is inactive.';
  end if;
  if exists (
    select 1 from public.tournament_teams
    where tournament_id = p_tournament_id
      and id <> selected_assignment.id
      and p_replacement_player_id in (player_1_id, player_2_id)
  ) then
    raise exception 'The replacement player is already assigned to another team in this tournament.';
  end if;

  update public.tournament_teams
  set player_1_id = case when player_1_id = p_outgoing_player_id then p_replacement_player_id else player_1_id end,
      player_2_id = case when player_2_id = p_outgoing_player_id then p_replacement_player_id else player_2_id end
  where id = selected_assignment.id
  returning * into selected_assignment;

  select count(*) into recalculated_completed from public.matches
  where tournament_id = p_tournament_id
    and (team_1_id = p_team_id or team_2_id = p_team_id)
    and team_1_games is not null and team_2_games is not null;

  update public.matches
  set team_1_player_1_id = case when team_1_id = p_team_id then selected_assignment.player_1_id else team_1_player_1_id end,
      team_1_player_2_id = case when team_1_id = p_team_id then selected_assignment.player_2_id else team_1_player_2_id end,
      team_2_player_1_id = case when team_2_id = p_team_id then selected_assignment.player_1_id else team_2_player_1_id end,
      team_2_player_2_id = case when team_2_id = p_team_id then selected_assignment.player_2_id else team_2_player_2_id end
  where tournament_id = p_tournament_id
    and (team_1_id = p_team_id or team_2_id = p_team_id);
  get diagnostics updated_matches = row_count;

  perform public.rebuild_regular_match_ratings_after_publication();

  insert into public.tournament_player_replacements (
    tournament_id, team_id, outgoing_player_id, replacement_player_id
  ) values (
    p_tournament_id, p_team_id, p_outgoing_player_id, p_replacement_player_id
  );

  return jsonb_build_object(
    'updated_matches', updated_matches,
    'recalculated_completed_matches', recalculated_completed
  );
end;
$$;

revoke all on function public.replace_tournament_player(uuid, uuid, uuid, uuid) from public;
grant execute on function public.replace_tournament_player(uuid, uuid, uuid, uuid) to authenticated;
grant select, insert on public.tournament_player_replacements to authenticated;

notify pgrst, 'reload schema';
