-- Repair pending match lineup snapshots after a tournament player replacement.
-- This includes already-generated quarter-finals, semifinals, finals and third-place matches.
-- Completed matches and their historical player lineups remain unchanged.

update public.matches as match
set team_1_player_1_id = assignment.player_1_id,
    team_1_player_2_id = assignment.player_2_id
from public.tournament_teams as assignment
join public.tournaments as tournament on tournament.id = assignment.tournament_id
where match.tournament_id = assignment.tournament_id
  and match.team_1_id = assignment.team_id
  and tournament.status <> 'completed'
  and match.team_1_games is null
  and match.team_2_games is null
  and match.winner_team_id is null;

update public.matches as match
set team_2_player_1_id = assignment.player_1_id,
    team_2_player_2_id = assignment.player_2_id
from public.tournament_teams as assignment
join public.tournaments as tournament on tournament.id = assignment.tournament_id
where match.tournament_id = assignment.tournament_id
  and match.team_2_id = assignment.team_id
  and tournament.status <> 'completed'
  and match.team_1_games is null
  and match.team_2_games is null
  and match.winner_team_id is null;

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
  updated_unplayed integer := 0;
  preserved_completed integer := 0;
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

  update public.matches
  set team_1_player_1_id = case when team_1_id = p_team_id then selected_assignment.player_1_id else team_1_player_1_id end,
      team_1_player_2_id = case when team_1_id = p_team_id then selected_assignment.player_2_id else team_1_player_2_id end,
      team_2_player_1_id = case when team_2_id = p_team_id then selected_assignment.player_1_id else team_2_player_1_id end,
      team_2_player_2_id = case when team_2_id = p_team_id then selected_assignment.player_2_id else team_2_player_2_id end
  where tournament_id = p_tournament_id
    and (team_1_id = p_team_id or team_2_id = p_team_id)
    and team_1_games is null and team_2_games is null and winner_team_id is null;
  get diagnostics updated_unplayed = row_count;

  select count(*) into preserved_completed from public.matches
  where tournament_id = p_tournament_id
    and (team_1_id = p_team_id or team_2_id = p_team_id)
    and team_1_games is not null and team_2_games is not null;

  insert into public.tournament_player_replacements (
    tournament_id, team_id, outgoing_player_id, replacement_player_id
  ) values (
    p_tournament_id, p_team_id, p_outgoing_player_id, p_replacement_player_id
  );

  return jsonb_build_object(
    'updated_unplayed_matches', updated_unplayed,
    'preserved_completed_matches', preserved_completed
  );
end;
$$;

revoke all on function public.replace_tournament_player(uuid, uuid, uuid, uuid) from public;
grant execute on function public.replace_tournament_player(uuid, uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
