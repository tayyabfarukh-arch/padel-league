-- QUARTER-FINALS AND EDITABLE TOURNAMENT SCORING UPDATE
-- Safe to run on an existing project. No players, teams, tournaments, schedules,
-- scores, registrations, or history are deleted.

alter table public.tournaments
add column if not exists knockout_format text not null default 'direct_semifinal';

alter table public.tournaments
add column if not exists quarterfinal_target_games integer not null default 6;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tournaments_knockout_format_check') then
    alter table public.tournaments add constraint tournaments_knockout_format_check
    check (knockout_format in ('direct_semifinal', 'quarterfinal'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tournaments_quarterfinal_target_check') then
    alter table public.tournaments add constraint tournaments_quarterfinal_target_check
    check (quarterfinal_target_games between 1 and 10);
  end if;
end $$;

alter table public.matches drop constraint if exists matches_stage_check;
alter table public.matches add constraint matches_stage_check
check (stage in ('group', 'quarterfinal', 'semifinal', 'final', 'third_place'));

drop function if exists public.submit_match_score(uuid, integer, integer);
drop function if exists public.submit_match_score(uuid, integer, integer, uuid);
drop function if exists public.submit_match_score(uuid, integer, integer, uuid, boolean);

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
    when 'quarterfinal' then selected_tournament.quarterfinal_target_games
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
      winning_team_id := case
        when p_team_1_score > p_team_2_score then selected_match.team_1_id
        else selected_match.team_2_id
      end;
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
      (
        greatest(p_team_1_score, p_team_2_score) = target_score
        and least(p_team_1_score, p_team_2_score) < target_score - 1
      )
      or (
        greatest(p_team_1_score, p_team_2_score) = target_score + 1
        and least(p_team_1_score, p_team_2_score) >= target_score - 1
        and least(p_team_1_score, p_team_2_score) < target_score + 1
      )
      or (
        p_ended_due_to_time
        and greatest(p_team_1_score, p_team_2_score) = target_score
        and least(p_team_1_score, p_team_2_score) = target_score - 1
      )
    ) then
      raise exception 'Finish at %, continue to % after %-% or confirm a time-limited finish at %-% only.', target_score, target_score + 1, target_score - 1, target_score - 1, target_score, target_score - 1;
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

grant execute on function public.submit_match_score(uuid, integer, integer, uuid, boolean) to anon, authenticated;

notify pgrst, 'reload schema';
