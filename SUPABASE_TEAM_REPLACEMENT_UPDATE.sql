-- SAFE UPCOMING-TOURNAMENT TEAM REPLACEMENT
-- Run once in Supabase SQL Editor. Existing data is preserved.

create or replace function public.replace_tournament_team(
  p_tournament_id uuid,
  p_outgoing_team_id uuid,
  p_replacement_team_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_tournament public.tournaments%rowtype;
  selected_assignment public.tournament_teams%rowtype;
  updated_match_count integer := 0;
  cleared_prediction_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only an Admin can replace a tournament team.';
  end if;

  if p_outgoing_team_id = p_replacement_team_id then
    raise exception 'Choose a different replacement team.';
  end if;

  select * into selected_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then raise exception 'Tournament not found.'; end if;
  if selected_tournament.status <> 'upcoming' then
    raise exception 'Teams can be replaced only while the tournament is Upcoming.';
  end if;

  select * into selected_assignment
  from public.tournament_teams
  where tournament_id = p_tournament_id
    and team_id = p_outgoing_team_id
  for update;

  if not found then raise exception 'The withdrawn team is not part of this tournament.'; end if;
  if not exists (
    select 1 from public.teams
    where id = p_replacement_team_id and is_active = true
  ) then
    raise exception 'The replacement team does not exist or is inactive.';
  end if;
  if exists (
    select 1 from public.tournament_teams
    where tournament_id = p_tournament_id and team_id = p_replacement_team_id
  ) then
    raise exception 'The replacement team is already participating in this tournament.';
  end if;
  if exists (
    select 1 from public.matches
    where tournament_id = p_tournament_id
      and (team_1_id = p_outgoing_team_id or team_2_id = p_outgoing_team_id)
      and (team_1_games is not null or team_2_games is not null or winner_team_id is not null)
  ) then
    raise exception 'Clear the withdrawn team''s submitted results before replacing it.';
  end if;

  update public.matches
  set team_1_id = case when team_1_id = p_outgoing_team_id then p_replacement_team_id else team_1_id end,
      team_2_id = case when team_2_id = p_outgoing_team_id then p_replacement_team_id else team_2_id end
  where tournament_id = p_tournament_id
    and (team_1_id = p_outgoing_team_id or team_2_id = p_outgoing_team_id);
  get diagnostics updated_match_count = row_count;

  delete from public.predictions
  where tournament_id = p_tournament_id
    and predicted_team_id = p_outgoing_team_id;
  get diagnostics cleared_prediction_count = row_count;

  update public.tournament_teams
  set team_id = p_replacement_team_id
  where id = selected_assignment.id;

  return jsonb_build_object(
    'updated_matches', updated_match_count,
    'cleared_predictions', cleared_prediction_count,
    'group_name', selected_assignment.group_name
  );
end;
$$;

revoke all on function public.replace_tournament_team(uuid, uuid, uuid) from public;
grant execute on function public.replace_tournament_team(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
