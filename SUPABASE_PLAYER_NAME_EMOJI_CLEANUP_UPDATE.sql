-- PLAYER NAME EMOJI CLEANUP AND VALIDATION
-- Run this complete file once in Supabase SQL Editor.
-- It removes emojis from existing player names without deleting profiles or data,
-- then prevents emojis from being saved in player names in the future.

create or replace function public.is_player_name_emoji_codepoint(p_codepoint integer)
returns boolean
language sql
immutable
strict
set search_path = public
as $$
  select
    p_codepoint between 126976 and 129791 -- U+1F000 to U+1FAFF
    or p_codepoint between 9728 and 10175 -- U+2600 to U+27BF
    or p_codepoint between 11008 and 11263 -- U+2B00 to U+2BFF
    or p_codepoint between 65024 and 65039 -- variation selectors
    or p_codepoint in (169, 174, 8205, 8419, 8482);
$$;

create or replace function public.player_name_has_emoji(p_value text)
returns boolean
language sql
immutable
strict
set search_path = public
as $$
  select exists (
    select 1
    from generate_series(1, char_length(p_value)) as character_position
    where public.is_player_name_emoji_codepoint(
      ascii(substring(p_value from character_position for 1))
    )
  );
$$;

create or replace function public.strip_player_name_emojis(p_value text)
returns text
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  cleaned text := '';
  character_position integer;
  current_character text;
begin
  if p_value = '' then
    return p_value;
  end if;

  for character_position in 1..char_length(p_value) loop
    current_character := substring(p_value from character_position for 1);
    if not public.is_player_name_emoji_codepoint(ascii(current_character)) then
      cleaned := cleaned || current_character;
    end if;
  end loop;

  return btrim(regexp_replace(cleaned, '\s+', ' ', 'g'));
end;
$$;

update public.players
set name = case
  when public.strip_player_name_emojis(name) = ''
    then 'Player ' || upper(substr(id::text, 1, 6))
  else public.strip_player_name_emojis(name)
end
where public.player_name_has_emoji(name);

alter table public.players
  drop constraint if exists players_name_no_emoji;

alter table public.players
  add constraint players_name_no_emoji
  check (not public.player_name_has_emoji(name));

notify pgrst, 'reload schema';
