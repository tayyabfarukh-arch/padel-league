-- REVAMP V2: TOURNAMENT REGISTRATION AND PAYMENT MANAGEMENT
-- Run SUPABASE_REVAMP_V2_UPDATE.sql first, then run this file once.
-- Existing players, teams, tournaments, matches, scores, and history are preserved.

alter table public.tournaments
add column if not exists registration_open boolean not null default true;

alter table public.tournaments
add column if not exists team_fee numeric(10,2) not null default 0 check (team_fee >= 0);

alter table public.tournaments
add column if not exists advance_amount numeric(10,2) not null default 0 check (advance_amount >= 0);

alter table public.tournament_registrations
add column if not exists advance_paid_at timestamp with time zone;

alter table public.tournament_registrations
add column if not exists fully_paid_at timestamp with time zone;

create or replace function public.register_tournament_team(p_tournament_id uuid, p_team_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_player_id uuid;
  selected_team public.teams%rowtype;
  selected_tournament public.tournaments%rowtype;
  new_registration_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before registering a team.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));

  select id into current_player_id from public.players where user_id = current_user_id;
  if current_player_id is null then
    raise exception 'Your player profile must be approved before registering.';
  end if;

  select * into selected_tournament from public.tournaments where id = p_tournament_id;
  if not found or selected_tournament.status <> 'upcoming' or not selected_tournament.registration_open then
    raise exception 'Registration is not open for this tournament.';
  end if;
  if selected_tournament.tournament_format = 'singles_americano' then
    raise exception 'This registration form is for team tournaments.';
  end if;

  select * into selected_team from public.teams where id = p_team_id;
  if not found or current_player_id not in (selected_team.player_1_id, selected_team.player_2_id) then
    raise exception 'You can register only a team that includes your player profile.';
  end if;

  if exists (
    select 1
    from public.tournament_registrations r
    join public.teams registered_team on registered_team.id = r.team_id
    where r.tournament_id = p_tournament_id
      and r.status not in ('withdrawn', 'rejected')
      and (
        selected_team.player_1_id in (registered_team.player_1_id, registered_team.player_2_id)
        or selected_team.player_2_id in (registered_team.player_1_id, registered_team.player_2_id)
      )
  ) then
    raise exception 'One of these players is already registered in another team for this tournament.';
  end if;

  insert into public.tournament_registrations (
    tournament_id, team_id, captain_user_id, status, payment_status, fee_amount, amount_paid
  ) values (
    p_tournament_id, p_team_id, current_user_id, 'pending', 'unpaid', selected_tournament.team_fee, 0
  )
  on conflict (tournament_id, team_id) do update
  set captain_user_id = excluded.captain_user_id,
      status = 'pending',
      payment_status = 'unpaid',
      fee_amount = excluded.fee_amount,
      amount_paid = 0,
      admin_notes = null,
      advance_paid_at = null,
      fully_paid_at = null,
      updated_at = now()
  where tournament_registrations.status in ('withdrawn', 'rejected')
  returning id into new_registration_id;

  if new_registration_id is null then
    raise exception 'This team already has an active registration.';
  end if;

  return new_registration_id;
end;
$$;

create or replace function public.withdraw_tournament_registration(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tournament_registrations
  set status = 'withdrawn', updated_at = now()
  where id = p_registration_id
    and captain_user_id = auth.uid()
    and status in ('pending', 'waitlisted');

  if not found then
    raise exception 'This registration cannot be withdrawn from your account.';
  end if;
end;
$$;

create or replace function public.get_public_tournament_registrations(p_tournament_id uuid)
returns table (
  id uuid,
  tournament_id uuid,
  team_id uuid,
  status text,
  payment_status text,
  created_at timestamp with time zone
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.tournament_id, r.team_id, r.status, r.payment_status, r.created_at
  from public.tournament_registrations r
  where r.tournament_id = p_tournament_id
    and r.status not in ('withdrawn', 'rejected')
  order by r.created_at asc;
$$;

drop policy if exists "Public read registrations" on public.tournament_registrations;
drop policy if exists "Captains create registrations" on public.tournament_registrations;
drop policy if exists "Captains withdraw registrations" on public.tournament_registrations;
drop policy if exists "Users read own registrations" on public.tournament_registrations;

create policy "Users read own registrations" on public.tournament_registrations for select
using (
  public.is_admin()
  or captain_user_id = auth.uid()
  or exists (
    select 1
    from public.players p
    join public.teams t on p.id in (t.player_1_id, t.player_2_id)
    where p.user_id = auth.uid() and t.id = tournament_registrations.team_id
  )
);

revoke insert, update on public.tournament_registrations from anon;
grant select, insert, update, delete on public.tournament_registrations to authenticated;
grant select, insert, update, delete on public.tournament_expenses to authenticated;
grant execute on function public.register_tournament_team(uuid, uuid) to authenticated;
grant execute on function public.withdraw_tournament_registration(uuid) to authenticated;
grant execute on function public.get_public_tournament_registrations(uuid) to anon, authenticated;
