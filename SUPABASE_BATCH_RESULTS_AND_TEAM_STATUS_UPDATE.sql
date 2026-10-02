-- BATCH RESULT SUBMISSION AND REVERSIBLE TEAM STATUS
-- Run once after SUPABASE_MATCH_RATING_ENGINE_UPDATE.sql. Existing data is preserved.

alter table public.teams
add column if not exists is_active boolean not null default true;

create index if not exists idx_teams_is_active on public.teams(is_active);

create or replace function public.submit_match_scores_batch(p_results jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  result_item jsonb;
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
    perform public.submit_match_score(
      (result_item ->> 'match_id')::uuid,
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

revoke all on function public.submit_match_scores_batch(jsonb) from public;
grant execute on function public.submit_match_scores_batch(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
