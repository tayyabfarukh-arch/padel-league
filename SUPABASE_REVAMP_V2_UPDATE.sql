-- PADEL LEAGUE REVAMP V2
-- Run this once in Supabase SQL Editor. It preserves all existing data.

create extension if not exists "citext";

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.players
add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create table if not exists public.player_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  unique (user_id, player_id)
);

create unique index if not exists player_claims_one_open_user
on public.player_claims(user_id)
where status in ('pending', 'approved');

create or replace function public.handle_new_app_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if requested_username = '' then
    requested_username := 'player_' || replace(substr(new.id::text, 1, 8), '-', '');
  end if;
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must contain 3 to 24 letters, numbers, or underscores.';
  end if;

  insert into public.app_users (id, username)
  values (new.id, requested_username);
  return new;
end;
$$;

insert into public.app_users (id, username)
select id, 'player_' || replace(substr(id::text, 1, 8), '-', '')
from auth.users
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created_app_profile on auth.users;
create trigger on_auth_user_created_app_profile
after insert on auth.users
for each row execute procedure public.handle_new_app_user();

create or replace function public.approve_player_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_claim public.player_claims%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only an Admin can approve player accounts.';
  end if;

  select * into selected_claim
  from public.player_claims
  where id = p_claim_id and status = 'pending'
  for update;

  if not found then
    raise exception 'This claim is no longer pending.';
  end if;

  if exists (select 1 from public.players where id = selected_claim.player_id and user_id is not null) then
    raise exception 'This player profile is already linked to an account.';
  end if;

  update public.players
  set user_id = selected_claim.user_id
  where id = selected_claim.player_id;

  update public.player_claims
  set status = 'approved', reviewed_at = now()
  where id = selected_claim.id;

  update public.player_claims
  set status = 'rejected', reviewed_at = now()
  where player_id = selected_claim.player_id
    and id <> selected_claim.id
    and status = 'pending';
end;
$$;

create or replace function public.reject_player_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an Admin can reject player accounts.';
  end if;

  update public.player_claims
  set status = 'rejected', reviewed_at = now()
  where id = p_claim_id and status = 'pending';
end;
$$;

alter table public.predictions
add column if not exists voter_user_id uuid references auth.users(id) on delete cascade;

alter table public.predictions
alter column voter_token drop not null;

alter table public.predictions
drop constraint if exists predictions_voter_identity_check;

alter table public.predictions
add constraint predictions_voter_identity_check
check (voter_user_id is not null or voter_token is not null);

create unique index if not exists predictions_one_vote_per_account
on public.predictions(tournament_id, voter_user_id)
where voter_user_id is not null;

-- Registration and payment foundation. The UI for this arrives in the next revamp stage.
create table if not exists public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  captain_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'waitlisted', 'withdrawn', 'rejected')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'advance_paid', 'fully_paid', 'refunded')),
  fee_amount numeric(10,2) not null default 0 check (fee_amount >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  admin_notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (tournament_id, team_id)
);

create table if not exists public.tournament_expenses (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamp with time zone not null default now()
);

-- Ratings are stored separately from tournament standings.
create table if not exists public.player_ratings (
  player_id uuid primary key references public.players(id) on delete cascade,
  rating numeric(7,3) not null default 5.000,
  reliability integer not null default 0 check (reliability between 0 and 100),
  rated_matches integer not null default 0 check (rated_matches >= 0),
  provisional boolean not null default true,
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.rating_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid references public.matches(id) on delete restrict,
  americano_match_id uuid references public.americano_matches(id) on delete restrict,
  rating_before numeric(7,3) not null,
  rating_change numeric(7,3) not null,
  rating_after numeric(7,3) not null,
  reason text not null,
  created_at timestamp with time zone not null default now(),
  check ((match_id is not null)::integer + (americano_match_id is not null)::integer <= 1)
);

alter table public.app_users enable row level security;
alter table public.player_claims enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.tournament_expenses enable row level security;
alter table public.player_ratings enable row level security;
alter table public.rating_events enable row level security;

drop policy if exists "Public read usernames" on public.app_users;
drop policy if exists "Users create own account profile" on public.app_users;
drop policy if exists "Users update own account profile" on public.app_users;
create policy "Public read usernames" on public.app_users for select using (true);
create policy "Users create own account profile" on public.app_users for insert with check (id = auth.uid());
create policy "Users update own account profile" on public.app_users for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Users read own claims" on public.player_claims;
drop policy if exists "Users request own claims" on public.player_claims;
drop policy if exists "Admins manage claims" on public.player_claims;
create policy "Users read own claims" on public.player_claims for select using (user_id = auth.uid() or public.is_admin());
create policy "Users request own claims" on public.player_claims for insert with check (
  user_id = auth.uid()
  and status = 'pending'
  and exists (select 1 from public.players p where p.id = player_id and p.user_id is null)
);
create policy "Admins manage claims" on public.player_claims for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Players update own profile" on public.players;
create policy "Players update own profile" on public.players for update
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Visitors add one prediction" on public.predictions;
drop policy if exists "Participants add account prediction" on public.predictions;
drop policy if exists "Participants update account prediction" on public.predictions;
create policy "Participants add account prediction" on public.predictions for insert with check (
  voter_user_id = auth.uid()
  and voter_token is null
  and exists (select 1 from public.players p where p.user_id = auth.uid())
  and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status = 'upcoming')
  and exists (select 1 from public.tournament_teams tt where tt.tournament_id = tournament_id and tt.team_id = predicted_team_id)
);
create policy "Participants update account prediction" on public.predictions for update
using (voter_user_id = auth.uid())
with check (
  voter_user_id = auth.uid()
  and exists (select 1 from public.players p where p.user_id = auth.uid())
  and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status = 'upcoming')
);

drop policy if exists "Public read registrations" on public.tournament_registrations;
drop policy if exists "Captains create registrations" on public.tournament_registrations;
drop policy if exists "Captains withdraw registrations" on public.tournament_registrations;
drop policy if exists "Admins manage registrations" on public.tournament_registrations;
drop policy if exists "Admins manage expenses" on public.tournament_expenses;
drop policy if exists "Public read ratings" on public.player_ratings;
drop policy if exists "Public read rating history" on public.rating_events;
drop policy if exists "Admins manage ratings" on public.player_ratings;
drop policy if exists "Admins manage rating history" on public.rating_events;
create policy "Public read registrations" on public.tournament_registrations for select using (true);
create policy "Captains create registrations" on public.tournament_registrations for insert with check (captain_user_id = auth.uid());
create policy "Captains withdraw registrations" on public.tournament_registrations for update
using (captain_user_id = auth.uid()) with check (captain_user_id = auth.uid() and status = 'withdrawn');
create policy "Admins manage registrations" on public.tournament_registrations for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage expenses" on public.tournament_expenses for all using (public.is_admin()) with check (public.is_admin());
create policy "Public read ratings" on public.player_ratings for select using (true);
create policy "Public read rating history" on public.rating_events for select using (true);
create policy "Admins manage ratings" on public.player_ratings for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage rating history" on public.rating_events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Players upload own profile images" on storage.objects;
drop policy if exists "Players update own profile images" on storage.objects;
drop policy if exists "Players delete own profile images" on storage.objects;
create policy "Players upload own profile images" on storage.objects for insert to authenticated
with check (bucket_id = 'player-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Players update own profile images" on storage.objects for update to authenticated
using (bucket_id = 'player-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Players delete own profile images" on storage.objects for delete to authenticated
using (bucket_id = 'player-photos' and (storage.foldername(name))[1] = auth.uid()::text);

grant select, insert, update on public.app_users to authenticated;
grant select, insert on public.player_claims to authenticated;
grant select, insert, update on public.predictions to authenticated;
grant select on public.tournament_registrations, public.player_ratings, public.rating_events to anon, authenticated;
grant insert, update on public.tournament_registrations to authenticated;
grant execute on function public.approve_player_claim(uuid) to authenticated;
grant execute on function public.reject_player_claim(uuid) to authenticated;
