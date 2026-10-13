-- WEEKLY AND MONTHLY PLAYER AWARDS
-- Run this complete file once in Supabase SQL Editor before deploying the website.

create table if not exists public.award_cycles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  published_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  check (period_end >= period_start)
);

create table if not exists public.award_categories (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.award_cycles(id) on delete cascade,
  award_key text not null,
  name text not null,
  description text not null,
  selection_method text not null check (selection_method in ('admin', 'vote')),
  display_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  unique (cycle_id, award_key)
);

create table if not exists public.award_votes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.award_categories(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade,
  voter_player_id uuid not null references public.players(id) on delete cascade,
  nominee_player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint award_votes_no_self_vote check (voter_player_id <> nominee_player_id),
  constraint award_votes_one_choice unique (category_id, voter_user_id)
);

create table if not exists public.award_winners (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.award_categories(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  awarded_at timestamp with time zone not null default now(),
  unique (category_id, player_id)
);

create index if not exists award_categories_cycle_idx on public.award_categories(cycle_id);
create index if not exists award_votes_category_idx on public.award_votes(category_id);
create index if not exists award_votes_nominee_idx on public.award_votes(nominee_player_id);
create index if not exists award_winners_player_idx on public.award_winners(player_id);

create or replace function public.touch_award_vote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists award_votes_touch_updated_at on public.award_votes;
create trigger award_votes_touch_updated_at
before update on public.award_votes
for each row execute procedure public.touch_award_vote();

create or replace function public.create_award_cycle(
  p_period_type text,
  p_title text,
  p_period_start date,
  p_period_end date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_cycle_id uuid;
begin
  if not public.is_admin() then raise exception 'Only the Admin can create award periods.'; end if;
  if p_period_type not in ('weekly', 'monthly') then raise exception 'Invalid award period type.'; end if;
  if p_period_end < p_period_start then raise exception 'End date must be after the start date.'; end if;
  if p_period_type = 'weekly' and exists (select 1 from public.award_cycles where period_type = 'weekly' and status = 'draft') then
    raise exception 'Publish the existing weekly awards before creating another week.';
  end if;
  if p_period_type = 'monthly' and exists (select 1 from public.award_cycles where period_type = 'monthly' and status = 'open') then
    raise exception 'Close the existing monthly vote before creating another month.';
  end if;

  insert into public.award_cycles (title, period_type, period_start, period_end, status)
  values (
    coalesce(nullif(trim(p_title), ''), case when p_period_type = 'weekly' then 'Weekly Awards' else 'Monthly Awards' end),
    p_period_type,
    p_period_start,
    p_period_end,
    case when p_period_type = 'monthly' then 'open' else 'draft' end
  ) returning id into new_cycle_id;

  if p_period_type = 'weekly' then
    insert into public.award_categories (cycle_id, award_key, name, description, selection_method, display_order) values
      (new_cycle_id, 'player_of_week', 'Player of the Week', 'The strongest overall performer during the week.', 'admin', 1),
      (new_cycle_id, 'most_improved_week', 'Most Improved Player', 'The player who showed the clearest improvement during the week.', 'admin', 2),
      (new_cycle_id, 'moment_of_week', 'Moment of the Week', 'A memorable performance, comeback, shot, or entertaining moment.', 'admin', 3);
  else
    insert into public.award_categories (cycle_id, award_key, name, description, selection_method, display_order) values
      (new_cycle_id, 'mvp_month', 'MVP of the Month', 'The most valuable and influential player of the month.', 'vote', 1),
      (new_cycle_id, 'most_improved_month', 'Most Improved Player', 'The player who demonstrated the greatest improvement.', 'vote', 2),
      (new_cycle_id, 'sportsmanship_month', 'Sportsmanship Award', 'Recognises fairness, respect, honesty, and positive behaviour.', 'vote', 3),
      (new_cycle_id, 'team_player_month', 'Best Team Player', 'Recognises excellent communication, support, and teamwork.', 'vote', 4),
      (new_cycle_id, 'clutch_month', 'Clutch Player', 'The player who performed best in important high-pressure moments.', 'vote', 5),
      (new_cycle_id, 'chaos_month', 'Chaos Creator', 'The month''s most entertaining and unpredictable player.', 'vote', 6);
  end if;

  return new_cycle_id;
end;
$$;

create or replace function public.publish_weekly_awards(p_cycle_id uuid, p_winners jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  category_record record;
  winner_id uuid;
begin
  if not public.is_admin() then raise exception 'Only the Admin can publish weekly awards.'; end if;
  if not exists (select 1 from public.award_cycles where id = p_cycle_id and period_type = 'weekly') then
    raise exception 'Weekly award period not found.';
  end if;

  delete from public.award_winners where category_id in (select id from public.award_categories where cycle_id = p_cycle_id);
  for category_record in select id, award_key from public.award_categories where cycle_id = p_cycle_id loop
    winner_id := nullif(p_winners ->> category_record.award_key, '')::uuid;
    if winner_id is null or not exists (select 1 from public.players where id = winner_id and is_active = true) then
      raise exception 'Select an active winner for every weekly award.';
    end if;
    insert into public.award_winners (category_id, player_id) values (category_record.id, winner_id);
  end loop;
  update public.award_cycles set status = 'closed', published_at = now() where id = p_cycle_id;
end;
$$;

create or replace function public.finalize_monthly_awards(p_cycle_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  winner_count integer;
begin
  if not public.is_admin() then raise exception 'Only the Admin can finalize monthly awards.'; end if;
  if not exists (select 1 from public.award_cycles where id = p_cycle_id and period_type = 'monthly' and status = 'open') then
    raise exception 'An open monthly voting period was not found.';
  end if;

  delete from public.award_winners where category_id in (select id from public.award_categories where cycle_id = p_cycle_id);
  with totals as (
    select v.category_id, v.nominee_player_id, count(*) as votes,
      dense_rank() over (partition by v.category_id order by count(*) desc) as place
    from public.award_votes v
    join public.award_categories c on c.id = v.category_id
    where c.cycle_id = p_cycle_id
    group by v.category_id, v.nominee_player_id
  )
  insert into public.award_winners (category_id, player_id)
  select category_id, nominee_player_id from totals where place = 1 and votes > 0;

  get diagnostics winner_count = row_count;
  update public.award_cycles set status = 'closed', published_at = now() where id = p_cycle_id;
  return winner_count;
end;
$$;

alter table public.award_cycles enable row level security;
alter table public.award_categories enable row level security;
alter table public.award_votes enable row level security;
alter table public.award_winners enable row level security;

drop policy if exists "Everyone reads award cycles" on public.award_cycles;
drop policy if exists "Admins manage award cycles" on public.award_cycles;
create policy "Everyone reads award cycles" on public.award_cycles for select using (true);
create policy "Admins manage award cycles" on public.award_cycles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Everyone reads award categories" on public.award_categories;
drop policy if exists "Admins manage award categories" on public.award_categories;
create policy "Everyone reads award categories" on public.award_categories for select using (true);
create policy "Admins manage award categories" on public.award_categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Players read own award votes" on public.award_votes;
drop policy if exists "Players add own award votes" on public.award_votes;
drop policy if exists "Players update own award votes" on public.award_votes;
drop policy if exists "Admins read all award votes" on public.award_votes;
create policy "Players read own award votes" on public.award_votes for select using (voter_user_id = auth.uid() or public.is_admin());
create policy "Players add own award votes" on public.award_votes for insert with check (
  voter_user_id = auth.uid()
  and voter_player_id <> nominee_player_id
  and exists (select 1 from public.players where id = voter_player_id and user_id = auth.uid() and is_active = true)
  and exists (select 1 from public.players where id = nominee_player_id and is_active = true)
  and exists (
    select 1 from public.award_categories c join public.award_cycles a on a.id = c.cycle_id
    where c.id = category_id and c.selection_method = 'vote' and a.period_type = 'monthly' and a.status = 'open'
  )
);
create policy "Players update own award votes" on public.award_votes for update using (voter_user_id = auth.uid()) with check (
  voter_user_id = auth.uid()
  and voter_player_id <> nominee_player_id
  and exists (select 1 from public.players where id = voter_player_id and user_id = auth.uid() and is_active = true)
  and exists (select 1 from public.players where id = nominee_player_id and is_active = true)
  and exists (
    select 1 from public.award_categories c join public.award_cycles a on a.id = c.cycle_id
    where c.id = category_id and c.selection_method = 'vote' and a.period_type = 'monthly' and a.status = 'open'
  )
);
create policy "Admins read all award votes" on public.award_votes for select using (public.is_admin());

drop policy if exists "Everyone reads award winners" on public.award_winners;
drop policy if exists "Admins manage award winners" on public.award_winners;
create policy "Everyone reads award winners" on public.award_winners for select using (true);
create policy "Admins manage award winners" on public.award_winners for all using (public.is_admin()) with check (public.is_admin());

grant select on public.award_cycles, public.award_categories, public.award_winners to anon, authenticated;
grant select, insert, update on public.award_votes to authenticated;
revoke execute on function public.create_award_cycle(text, text, date, date) from public, anon;
revoke execute on function public.publish_weekly_awards(uuid, jsonb) from public, anon;
revoke execute on function public.finalize_monthly_awards(uuid) from public, anon;
grant execute on function public.create_award_cycle(text, text, date, date) to authenticated;
grant execute on function public.publish_weekly_awards(uuid, jsonb) to authenticated;
grant execute on function public.finalize_monthly_awards(uuid) to authenticated;

notify pgrst, 'reload schema';
