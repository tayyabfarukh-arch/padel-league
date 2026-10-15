-- PUBLISHED MONTHLY AWARD RESULTS
-- Run this complete file once in Supabase SQL Editor before deploying the website.
-- It exposes anonymous aggregate totals only after a monthly award cycle is closed.

create or replace function public.get_published_award_vote_totals()
returns table (
  cycle_id uuid,
  category_id uuid,
  nominee_player_id uuid,
  vote_count bigint,
  participant_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with published_votes as (
    select
      category.cycle_id,
      vote.category_id,
      vote.nominee_player_id,
      vote.voter_user_id
    from public.award_votes as vote
    join public.award_categories as category on category.id = vote.category_id
    join public.award_cycles as cycle on cycle.id = category.cycle_id
    where cycle.period_type = 'monthly'
      and cycle.status = 'closed'
  ),
  participants as (
    select
      published_votes.cycle_id,
      count(distinct published_votes.voter_user_id) as participant_count
    from published_votes
    group by published_votes.cycle_id
  )
  select
    published_votes.cycle_id,
    published_votes.category_id,
    published_votes.nominee_player_id,
    count(*) as vote_count,
    participants.participant_count
  from published_votes
  join participants on participants.cycle_id = published_votes.cycle_id
  group by
    published_votes.cycle_id,
    published_votes.category_id,
    published_votes.nominee_player_id,
    participants.participant_count
  order by published_votes.cycle_id, published_votes.category_id, vote_count desc;
$$;

revoke execute on function public.get_published_award_vote_totals() from public;
grant execute on function public.get_published_award_vote_totals() to anon, authenticated;
