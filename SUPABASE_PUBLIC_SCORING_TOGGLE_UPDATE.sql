-- PER-TOURNAMENT PUBLIC SCORING TOGGLE
-- Run once in Supabase SQL Editor before deploying the matching website files.
-- Existing tournaments remain Admin-only because the new switch defaults to false.

begin;

alter table public.tournaments
add column if not exists public_scoring_enabled boolean not null default false;

-- Regular tournaments use the same batch endpoint in the public Active page and
-- the Admin Score Centre. Every public result is checked against its tournament.
create or replace function public.submit_match_scores_batch(p_results jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  result_item jsonb;
  selected_match public.matches%rowtype;
  selected_tournament public.tournaments%rowtype;
  caller_is_admin boolean := public.is_admin();
  saved_count integer := 0;
begin
  if p_results is null or jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) = 0 then
    raise exception 'Enter at least one complete result.';
  end if;

  if jsonb_array_length(p_results) > 100 then
    raise exception 'A maximum of 100 results can be submitted together.';
  end if;

  for result_item in
    select value
    from jsonb_array_elements(p_results) with ordinality as entered(value, position)
    order by position
  loop
    select * into selected_match
    from public.matches
    where id = (result_item ->> 'match_id')::uuid;

    if selected_match.id is null then
      raise exception 'One of the selected matches no longer exists.';
    end if;

    select * into selected_tournament
    from public.tournaments
    where id = selected_match.tournament_id;

    if not caller_is_admin and not (
      selected_tournament.status = 'active'
      and selected_tournament.public_scoring_enabled = true
    ) then
      raise exception 'Public score entry is closed. Ask the Admin to enter the result.';
    end if;

    perform public.submit_match_score(
      selected_match.id,
      (result_item ->> 'team_1_score')::integer,
      (result_item ->> 'team_2_score')::integer,
      nullif(result_item ->> 'deciding_point_winner_team_id', '')::uuid,
      coalesce((result_item ->> 'ended_due_to_time')::boolean, false)
    );
    saved_count := saved_count + 1;
  end loop;

  return saved_count;
end;
$$;

revoke all on function public.submit_match_scores_batch(jsonb)
from public, anon, authenticated;
grant execute on function public.submit_match_scores_batch(jsonb) to anon, authenticated;

-- Americano keeps its existing validated score function private. This wrapper
-- opens it only for active tournaments whose public switch is enabled.
create or replace function public.submit_public_americano_score(
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
  selected_tournament public.tournaments%rowtype;
begin
  select tournament.* into selected_tournament
  from public.americano_matches as match
  join public.tournaments as tournament on tournament.id = match.tournament_id
  where match.id = p_match_id;

  if selected_tournament.id is null then
    raise exception 'Americano match not found.';
  end if;

  if selected_tournament.status <> 'active'
    or selected_tournament.public_scoring_enabled <> true then
    raise exception 'Public score entry is closed. Ask the Admin to enter the result.';
  end if;

  perform public.submit_americano_score(
    p_match_id,
    p_side_1_points,
    p_side_2_points
  );
end;
$$;

revoke all on function public.submit_public_americano_score(uuid, integer, integer)
from public, anon, authenticated;
grant execute on function public.submit_public_americano_score(uuid, integer, integer)
to anon, authenticated;

-- Direct score functions and table writes remain closed to public callers.
revoke all on function public.submit_match_score(uuid, integer, integer, uuid, boolean)
from public, anon, authenticated;
revoke all on function public.submit_americano_score(uuid, integer, integer)
from public, anon, authenticated;
revoke insert, update, delete on table public.matches from anon;
revoke insert, update, delete on table public.americano_matches from anon;

commit;

notify pgrst, 'reload schema';
