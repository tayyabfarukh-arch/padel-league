-- MATCH-BASED PLAYER RATING ENGINE
-- Run once after SUPABASE_PUBLISH_RATINGS_UPDATE.sql.
-- This preserves all existing players, matches, scores, votes and published ratings.

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
  league_average numeric(7,3);
  team_1_before numeric(7,3);
  team_2_before numeric(7,3);
  winning_rating numeric(7,3);
  losing_rating numeric(7,3);
  base_change numeric(7,3);
  player_change numeric(7,3);
  rating_after numeric(7,3);
  rating_multiplier numeric(7,3);
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

  if tg_op in ('UPDATE', 'DELETE') and old.winner_team_id is not null then
    for old_event in
      select * from public.rating_events where match_id = old.id order by created_at desc
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

  select * into selected_team_1 from public.teams where id = new.team_1_id;
  select * into selected_team_2 from public.teams where id = new.team_2_id;
  if selected_team_1.id is null or selected_team_2.id is null then
    return new;
  end if;

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
    winning_rating := team_1_before;
    losing_rating := team_2_before;
  elsif new.winner_team_id = new.team_2_id then
    winning_rating := team_2_before;
    losing_rating := team_1_before;
  else
    raise exception 'The match winner must be one of the two teams.';
  end if;

  base_change := greatest(0.050, least(0.300, 0.150 + ((losing_rating - winning_rating) * 0.030)));

  for participant in
    select * from (values
      (selected_team_1.player_1_id, new.team_1_id, 1),
      (selected_team_1.player_2_id, new.team_1_id, 1),
      (selected_team_2.player_1_id, new.team_2_id, 2),
      (selected_team_2.player_2_id, new.team_2_id, 2)
    ) as participants(player_id, team_id, team_number)
  loop
    select * into current_rating
    from public.player_ratings
    where player_id = participant.player_id
    for update;

    rating_multiplier := case
      when not current_rating.provisional then 1.000
      when current_rating.rated_matches < 3 then 1.500
      when current_rating.rated_matches < 6 then 1.300
      when current_rating.rated_matches < 10 then 1.150
      else 1.000
    end;

    player_change := round(
      (case when participant.team_id = new.winner_team_id then base_change else -base_change end)
      * rating_multiplier,
      3
    );
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
      'Regular tournament match: ' || new.stage::text,
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

notify pgrst, 'reload schema';
