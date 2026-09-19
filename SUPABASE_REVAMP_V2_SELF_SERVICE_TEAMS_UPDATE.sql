-- REVAMP V2: SELF-CREATED PLAYER PROFILES AND PARTNER-BASED REGISTRATION
-- Run after SUPABASE_REVAMP_V2_REGISTRATION_UPDATE.sql.
-- Existing players, teams, registrations, tournaments, matches, and history are preserved.

create or replace function public.create_new_player_profile(p_name text, p_photo_url text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_name text := trim(p_name);
  new_player_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before creating a player profile.';
  end if;
  if exists (select 1 from public.players where user_id = current_user_id) then
    raise exception 'This account already has a player profile.';
  end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 80 then
    raise exception 'Player name must contain 2 to 80 characters.';
  end if;
  if exists (select 1 from public.players where lower(name) = lower(clean_name)) then
    raise exception 'A player with this name already exists. Claim that profile or use a more complete name.';
  end if;

  insert into public.players (user_id, name, photo_url)
  values (current_user_id, clean_name, nullif(trim(coalesce(p_photo_url, '')), ''))
  returning id into new_player_id;

  return new_player_id;
end;
$$;

create or replace function public.register_tournament_pair(
  p_tournament_id uuid,
  p_partner_player_id uuid,
  p_team_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_player public.players%rowtype;
  partner_player public.players%rowtype;
  selected_tournament public.tournaments%rowtype;
  selected_team public.teams%rowtype;
  clean_team_name text := trim(coalesce(p_team_name, ''));
  new_registration_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before registering a team.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));

  select * into current_player from public.players where user_id = current_user_id;
  if not found then
    raise exception 'Create or claim your player profile before registering.';
  end if;

  select * into partner_player from public.players where id = p_partner_player_id;
  if not found then
    raise exception 'The selected partner was not found.';
  end if;
  if current_player.id = partner_player.id then
    raise exception 'Select a different player as your partner.';
  end if;

  select * into selected_tournament from public.tournaments where id = p_tournament_id;
  if not found or selected_tournament.status <> 'upcoming' or not selected_tournament.registration_open then
    raise exception 'Registration is not open for this tournament.';
  end if;
  if selected_tournament.tournament_format = 'singles_americano' then
    raise exception 'This registration form is for team tournaments.';
  end if;

  if exists (
    select 1
    from public.tournament_registrations r
    join public.teams registered_team on registered_team.id = r.team_id
    where r.tournament_id = p_tournament_id
      and r.status not in ('withdrawn', 'rejected')
      and (
        current_player.id in (registered_team.player_1_id, registered_team.player_2_id)
        or partner_player.id in (registered_team.player_1_id, registered_team.player_2_id)
      )
  ) then
    raise exception 'One of these players is already registered in another team for this tournament.';
  end if;

  select * into selected_team
  from public.teams
  where (player_1_id = current_player.id and player_2_id = partner_player.id)
     or (player_1_id = partner_player.id and player_2_id = current_player.id)
  order by created_at asc
  limit 1;

  if not found then
    if clean_team_name = '' then
      raise exception 'Enter a team name for this new player pairing.';
    end if;
    if char_length(clean_team_name) > 100 then
      raise exception 'Team name must contain no more than 100 characters.';
    end if;

    insert into public.teams (player_1_id, player_2_id, team_name)
    values (current_player.id, partner_player.id, clean_team_name)
    returning * into selected_team;
  end if;

  insert into public.tournament_registrations (
    tournament_id, team_id, captain_user_id, status, payment_status, fee_amount, amount_paid
  ) values (
    p_tournament_id, selected_team.id, current_user_id, 'pending', 'unpaid', selected_tournament.team_fee, 0
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

grant execute on function public.create_new_player_profile(text, text) to authenticated;
grant execute on function public.register_tournament_pair(uuid, uuid, text) to authenticated;
