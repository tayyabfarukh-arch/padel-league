-- PLAYER RATING CALIBRATION VOTING
-- Run this once in Supabase SQL Editor. It preserves all existing data.

create table if not exists public.rating_calibrations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Player Rating Baseline',
  status text not null default 'open' check (status in ('draft', 'open', 'closed')),
  min_votes integer not null default 3 check (min_votes between 1 and 20),
  created_at timestamp with time zone not null default now(),
  opened_at timestamp with time zone,
  closed_at timestamp with time zone
);

create table if not exists public.player_rating_votes (
  id uuid primary key default gen_random_uuid(),
  calibration_id uuid not null references public.rating_calibrations(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade,
  voter_player_id uuid not null references public.players(id) on delete cascade,
  rated_player_id uuid not null references public.players(id) on delete cascade,
  rating smallint check (rating between 1 and 10),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint player_rating_votes_no_self_vote check (voter_player_id <> rated_player_id),
  constraint player_rating_votes_one_choice unique (calibration_id, voter_user_id, rated_player_id)
);

create index if not exists idx_player_rating_votes_calibration
on public.player_rating_votes(calibration_id);

create index if not exists idx_player_rating_votes_rated_player
on public.player_rating_votes(rated_player_id);

insert into public.rating_calibrations (name, status, min_votes, opened_at)
select 'Player Rating Baseline', 'open', 3, now()
where not exists (select 1 from public.rating_calibrations);

create or replace function public.touch_player_rating_vote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists player_rating_votes_touch_updated_at on public.player_rating_votes;
create trigger player_rating_votes_touch_updated_at
before update on public.player_rating_votes
for each row execute procedure public.touch_player_rating_vote();

alter table public.rating_calibrations enable row level security;
alter table public.player_rating_votes enable row level security;

drop policy if exists "Everyone reads rating calibration status" on public.rating_calibrations;
drop policy if exists "Admins manage rating calibrations" on public.rating_calibrations;
create policy "Everyone reads rating calibration status"
on public.rating_calibrations for select
using (true);
create policy "Admins manage rating calibrations"
on public.rating_calibrations for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Players read own rating choices" on public.player_rating_votes;
drop policy if exists "Players add own rating choices" on public.player_rating_votes;
drop policy if exists "Players update own rating choices" on public.player_rating_votes;
drop policy if exists "Admins read all rating choices" on public.player_rating_votes;
create policy "Players read own rating choices"
on public.player_rating_votes for select
using (voter_user_id = auth.uid());
create policy "Players add own rating choices"
on public.player_rating_votes for insert
with check (
  voter_user_id = auth.uid()
  and voter_player_id <> rated_player_id
  and exists (
    select 1 from public.players as voter
    where voter.id = voter_player_id
      and voter.user_id = auth.uid()
  )
  and exists (
    select 1 from public.rating_calibrations as calibration
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
    select 1 from public.players as voter
    where voter.id = voter_player_id
      and voter.user_id = auth.uid()
  )
  and exists (
    select 1 from public.rating_calibrations as calibration
    where calibration.id = calibration_id
      and calibration.status = 'open'
  )
);
create policy "Admins read all rating choices"
on public.player_rating_votes for select
using (public.is_admin());

grant select on public.rating_calibrations to anon, authenticated;
grant update on public.rating_calibrations to authenticated;
grant select, insert, update on public.player_rating_votes to authenticated;

notify pgrst, 'reload schema';
