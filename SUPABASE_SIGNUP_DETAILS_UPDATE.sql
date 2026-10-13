-- PROTECTED PLAYER SIGN-UP DETAILS
-- Run this complete file once in Supabase SQL Editor before deploying the website.

create table if not exists public.player_registration_details (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  phone_number text not null check (phone_number ~ '^[+0-9 ()-]{7,30}$'),
  nationality text not null check (char_length(trim(nationality)) between 2 and 80),
  playing_level text not null check (playing_level in ('beginner', 'amateur', 'intermediate', 'advanced', 'professional')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create or replace function public.touch_player_registration_details()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists player_registration_details_touch_updated_at on public.player_registration_details;
create trigger player_registration_details_touch_updated_at
before update on public.player_registration_details
for each row execute procedure public.touch_player_registration_details();

create or replace function public.handle_new_app_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_full_name text;
  requested_phone text;
  requested_nationality text;
  requested_level text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_full_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  requested_phone := trim(coalesce(new.raw_user_meta_data ->> 'phone_number', ''));
  requested_nationality := trim(coalesce(new.raw_user_meta_data ->> 'nationality', ''));
  requested_level := lower(trim(coalesce(new.raw_user_meta_data ->> 'playing_level', '')));

  if requested_username = '' then
    requested_username := 'player_' || replace(substr(new.id::text, 1, 8), '-', '');
  end if;
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must contain 3 to 24 letters, numbers, or underscores.';
  end if;
  if char_length(requested_full_name) not between 2 and 100 then
    raise exception 'Enter your full name.';
  end if;
  if requested_phone !~ '^[+0-9 ()-]{7,30}$' then
    raise exception 'Enter a valid mobile number.';
  end if;
  if char_length(requested_nationality) not between 2 and 80 then
    raise exception 'Enter your nationality.';
  end if;
  if requested_level not in ('beginner', 'amateur', 'intermediate', 'advanced', 'professional') then
    raise exception 'Select a valid playing level.';
  end if;

  insert into public.app_users (id, username)
  values (new.id, requested_username);

  insert into public.player_registration_details (
    user_id, full_name, phone_number, nationality, playing_level
  ) values (
    new.id, requested_full_name, requested_phone, requested_nationality, requested_level
  );
  return new;
end;
$$;

alter table public.player_registration_details enable row level security;

drop policy if exists "Players read own registration details" on public.player_registration_details;
drop policy if exists "Players create own registration details" on public.player_registration_details;
drop policy if exists "Players update own registration details" on public.player_registration_details;
drop policy if exists "Admins read registration details" on public.player_registration_details;

create policy "Players read own registration details"
on public.player_registration_details for select
using (user_id = auth.uid());

create policy "Players create own registration details"
on public.player_registration_details for insert
with check (user_id = auth.uid());

create policy "Players update own registration details"
on public.player_registration_details for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins read registration details"
on public.player_registration_details for select
using (public.is_admin());

grant select, insert, update on public.player_registration_details to authenticated;

notify pgrst, 'reload schema';
