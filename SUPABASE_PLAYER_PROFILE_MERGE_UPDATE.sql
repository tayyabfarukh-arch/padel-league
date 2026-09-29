-- ADMIN PLAYER PROFILE MERGE AND VISIBILITY
-- Run once in Supabase SQL Editor before deploying the matching website files.
-- Existing players, teams, matches, scores, votes, and accounts are preserved.

alter table public.players
add column if not exists is_active boolean not null default true;

create index if not exists idx_players_is_active
on public.players(is_active);

create table if not exists public.player_profile_merges (
  id uuid primary key default gen_random_uuid(),
  kept_player_id uuid not null,
  kept_player_name text not null,
  removed_player_id uuid not null,
  removed_player_name text not null,
  transferred_user_id uuid,
  merged_by uuid not null references auth.users(id),
  merged_at timestamp with time zone not null default now()
);

alter table public.player_profile_merges enable row level security;

drop policy if exists "Admins read player profile merge history" on public.player_profile_merges;
create policy "Admins read player profile merge history"
on public.player_profile_merges for select
using (public.is_admin());

grant select on public.player_profile_merges to authenticated;

create or replace function public.merge_player_profiles(
  p_keep_player_id uuid,
  p_remove_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  kept_player public.players%rowtype;
  removed_player public.players%rowtype;
  transferred_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an Admin can merge player profiles.';
  end if;
  if p_keep_player_id is null or p_remove_player_id is null or p_keep_player_id = p_remove_player_id then
    raise exception 'Choose two different player profiles.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      least(p_keep_player_id::text, p_remove_player_id::text)
      || greatest(p_keep_player_id::text, p_remove_player_id::text),
      0
    )
  );

  select * into kept_player
  from public.players
  where id = p_keep_player_id
  for update;
  if not found then
    raise exception 'The profile selected to keep was not found.';
  end if;

  select * into removed_player
  from public.players
  where id = p_remove_player_id
  for update;
  if not found then
    raise exception 'The duplicate profile was not found.';
  end if;

  if kept_player.user_id is not null
     and removed_player.user_id is not null
     and kept_player.user_id <> removed_player.user_id then
    raise exception 'Both profiles are linked to different accounts. Disable one profile and review the accounts before merging.';
  end if;

  if exists (
    select 1 from public.teams
    where p_keep_player_id in (player_1_id, player_2_id)
      and p_remove_player_id in (player_1_id, player_2_id)
  ) then
    raise exception 'These profiles appear together in a team. Remove or correct that invalid team before merging.';
  end if;

  if exists (
    select 1 from public.americano_matches
    where p_keep_player_id in (side_1_player_1_id, side_1_player_2_id, side_2_player_1_id, side_2_player_2_id)
      and p_remove_player_id in (side_1_player_1_id, side_1_player_2_id, side_2_player_1_id, side_2_player_2_id)
  ) then
    raise exception 'These profiles appear together in an Americano match. Correct that match before merging.';
  end if;

  transferred_user_id := coalesce(kept_player.user_id, removed_player.user_id);

  delete from public.tournament_players duplicate_entry
  using public.tournament_players kept_entry
  where duplicate_entry.player_id = p_remove_player_id
    and kept_entry.player_id = p_keep_player_id
    and duplicate_entry.tournament_id = kept_entry.tournament_id;

  update public.tournament_players
  set player_id = p_keep_player_id
  where player_id = p_remove_player_id;

  delete from public.player_claims removed_claim
  using public.player_claims kept_claim
  where removed_claim.player_id = p_remove_player_id
    and kept_claim.player_id = p_keep_player_id
    and removed_claim.user_id = kept_claim.user_id;

  update public.player_claims
  set player_id = p_keep_player_id
  where player_id = p_remove_player_id;

  delete from public.player_rating_votes
  where (voter_player_id = p_keep_player_id and rated_player_id = p_remove_player_id)
     or (voter_player_id = p_remove_player_id and rated_player_id = p_keep_player_id)
     or (voter_player_id = p_remove_player_id and rated_player_id = p_remove_player_id);

  update public.player_rating_votes kept_vote
  set rating = coalesce(kept_vote.rating, removed_vote.rating),
      updated_at = greatest(kept_vote.updated_at, removed_vote.updated_at)
  from public.player_rating_votes removed_vote
  where removed_vote.rated_player_id = p_remove_player_id
    and kept_vote.rated_player_id = p_keep_player_id
    and kept_vote.calibration_id = removed_vote.calibration_id
    and kept_vote.voter_user_id = removed_vote.voter_user_id;

  delete from public.player_rating_votes removed_vote
  using public.player_rating_votes kept_vote
  where removed_vote.rated_player_id = p_remove_player_id
    and kept_vote.rated_player_id = p_keep_player_id
    and kept_vote.calibration_id = removed_vote.calibration_id
    and kept_vote.voter_user_id = removed_vote.voter_user_id;

  update public.player_rating_votes
  set rated_player_id = p_keep_player_id
  where rated_player_id = p_remove_player_id;

  update public.player_rating_votes
  set voter_player_id = p_keep_player_id
  where voter_player_id = p_remove_player_id;

  update public.teams
  set player_1_id = p_keep_player_id
  where player_1_id = p_remove_player_id;

  update public.teams
  set player_2_id = p_keep_player_id
  where player_2_id = p_remove_player_id;

  update public.americano_matches
  set side_1_player_1_id = p_keep_player_id
  where side_1_player_1_id = p_remove_player_id;

  update public.americano_matches
  set side_1_player_2_id = p_keep_player_id
  where side_1_player_2_id = p_remove_player_id;

  update public.americano_matches
  set side_2_player_1_id = p_keep_player_id
  where side_2_player_1_id = p_remove_player_id;

  update public.americano_matches
  set side_2_player_2_id = p_keep_player_id
  where side_2_player_2_id = p_remove_player_id;

  if exists (select 1 from public.player_ratings where player_id = p_keep_player_id)
     and exists (select 1 from public.player_ratings where player_id = p_remove_player_id) then
    update public.player_ratings kept_rating
    set rating = case
          when kept_rating.rated_matches + removed_rating.rated_matches > 0 then
            (
              kept_rating.rating * kept_rating.rated_matches
              + removed_rating.rating * removed_rating.rated_matches
            ) / (kept_rating.rated_matches + removed_rating.rated_matches)
          else kept_rating.rating
        end,
        reliability = greatest(kept_rating.reliability, removed_rating.reliability),
        rated_matches = kept_rating.rated_matches + removed_rating.rated_matches,
        provisional = (kept_rating.rated_matches + removed_rating.rated_matches) < 10,
        updated_at = now()
    from public.player_ratings removed_rating
    where kept_rating.player_id = p_keep_player_id
      and removed_rating.player_id = p_remove_player_id;

    delete from public.player_ratings where player_id = p_remove_player_id;
  elsif exists (select 1 from public.player_ratings where player_id = p_remove_player_id) then
    update public.player_ratings
    set player_id = p_keep_player_id,
        updated_at = now()
    where player_id = p_remove_player_id;
  end if;

  update public.rating_events
  set player_id = p_keep_player_id
  where player_id = p_remove_player_id;

  update public.players
  set user_id = null
  where id = p_remove_player_id;

  update public.players
  set user_id = transferred_user_id,
      photo_url = coalesce(photo_url, removed_player.photo_url),
      is_active = true
  where id = p_keep_player_id;

  insert into public.player_profile_merges (
    kept_player_id,
    kept_player_name,
    removed_player_id,
    removed_player_name,
    transferred_user_id,
    merged_by
  ) values (
    kept_player.id,
    kept_player.name,
    removed_player.id,
    removed_player.name,
    transferred_user_id,
    auth.uid()
  );

  delete from public.players
  where id = p_remove_player_id;

  return jsonb_build_object(
    'kept_player_id', kept_player.id,
    'kept_player_name', kept_player.name,
    'removed_player_id', removed_player.id,
    'removed_player_name', removed_player.name,
    'transferred_user_id', transferred_user_id
  );
end;
$$;

revoke all on function public.merge_player_profiles(uuid, uuid) from public;
grant execute on function public.merge_player_profiles(uuid, uuid) to authenticated;

drop policy if exists "Users request own claims" on public.player_claims;
create policy "Users request own claims" on public.player_claims for insert with check (
  user_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.players p
    where p.id = player_id
      and p.user_id is null
      and p.is_active
  )
);

drop policy if exists "Participants add account prediction" on public.predictions;
drop policy if exists "Participants update account prediction" on public.predictions;
create policy "Participants add account prediction" on public.predictions for insert with check (
  voter_user_id = auth.uid()
  and voter_token is null
  and exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_active)
  and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status = 'upcoming')
  and exists (select 1 from public.tournament_teams tt where tt.tournament_id = tournament_id and tt.team_id = predicted_team_id)
);
create policy "Participants update account prediction" on public.predictions for update
using (voter_user_id = auth.uid())
with check (
  voter_user_id = auth.uid()
  and exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_active)
  and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status = 'upcoming')
);

drop policy if exists "Players add own rating choices" on public.player_rating_votes;
drop policy if exists "Players update own rating choices" on public.player_rating_votes;
create policy "Players add own rating choices"
on public.player_rating_votes for insert
with check (
  voter_user_id = auth.uid()
  and voter_player_id <> rated_player_id
  and exists (
    select 1 from public.players voter
    where voter.id = voter_player_id
      and voter.user_id = auth.uid()
      and voter.is_active
  )
  and exists (
    select 1 from public.players rated
    where rated.id = rated_player_id
      and rated.is_active
  )
  and exists (
    select 1 from public.rating_calibrations calibration
    where calibration.id = calibration_id
      and calibration.status = 'open'
  )
);
create policy "Players update own rating choices"
on public.player_rating_votes for update
using (voter_user_id = auth.uid())
with check (
  voter_user_id = auth.uid()
  and voter_player_id <> rated_player_id
  and exists (
    select 1 from public.players voter
    where voter.id = voter_player_id
      and voter.user_id = auth.uid()
      and voter.is_active
  )
  and exists (
    select 1 from public.players rated
    where rated.id = rated_player_id
      and rated.is_active
  )
  and exists (
    select 1 from public.rating_calibrations calibration
    where calibration.id = calibration_id
      and calibration.status = 'open'
  )
);

notify pgrst, 'reload schema';
