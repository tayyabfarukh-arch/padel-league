-- PUBLISH PLAYER RATINGS TO THE PUBLIC LEADERBOARDS
-- Run this once in Supabase SQL Editor. It preserves all players, votes, matches and statistics.

alter table public.rating_calibrations
add column if not exists published_at timestamp with time zone,
add column if not exists published_by uuid references auth.users(id) on delete set null;

create or replace function public.publish_rating_calibration(p_calibration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_calibration public.rating_calibrations%rowtype;
  published_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only an Admin can publish player ratings.';
  end if;

  select * into selected_calibration
  from public.rating_calibrations
  where id = p_calibration_id
  for update;

  if not found then
    raise exception 'Rating calibration not found.';
  end if;

  if selected_calibration.status <> 'closed' then
    raise exception 'Close voting before publishing player ratings.';
  end if;

  with eligible_votes as (
    select vote.id, vote.rated_player_id, vote.rating
    from public.player_rating_votes as vote
    join public.players as voter on voter.id = vote.voter_player_id and voter.is_active = true
    join public.players as rated on rated.id = vote.rated_player_id and rated.is_active = true
    where vote.calibration_id = p_calibration_id
      and vote.rating is not null
  ), ranked_votes as (
    select
      id,
      rated_player_id,
      rating,
      count(*) over (partition by rated_player_id) as vote_count,
      row_number() over (partition by rated_player_id order by rating asc, id asc) as low_rank,
      row_number() over (partition by rated_player_id order by rating desc, id desc) as high_rank
    from eligible_votes
  ), baselines as (
    select
      rated_player_id as player_id,
      max(vote_count)::integer as vote_count,
      avg(rating) filter (
        where vote_count < 5 or (low_rank > 1 and high_rank > 1)
      )::numeric(7,3) as baseline_rating
    from ranked_votes
    group by rated_player_id
    having max(vote_count) >= selected_calibration.min_votes
  ), published as (
    insert into public.player_ratings (
      player_id, rating, reliability, rated_matches, provisional, updated_at
    )
    select
      player_id,
      baseline_rating,
      least(100, vote_count * 10),
      0,
      false,
      now()
    from baselines
    on conflict (player_id) do update set
      rating = excluded.rating,
      reliability = excluded.reliability,
      provisional = false,
      updated_at = now()
    returning player_id
  )
  select count(*)::integer into published_count from published;

  update public.rating_calibrations
  set published_at = now(), published_by = auth.uid()
  where id = p_calibration_id;

  return jsonb_build_object('published_players', published_count);
end;
$$;

revoke all on function public.publish_rating_calibration(uuid) from public;
grant execute on function public.publish_rating_calibration(uuid) to authenticated;

notify pgrst, 'reload schema';
