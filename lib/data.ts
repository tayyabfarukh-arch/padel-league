import { supabase } from "./supabase";
import type { Match, Player, Team, Tournament, TournamentTeam } from "./types";

const teamSelect = "*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*)";
const matchSelect = `*, team_1:teams!matches_team_1_id_fkey(${teamSelect}), team_2:teams!matches_team_2_id_fkey(${teamSelect})`;
const tournamentSelect =
  "*, champion:teams!tournaments_champion_team_id_fkey(*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*)), runner_up:teams!tournaments_runner_up_team_id_fkey(*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*)), third_place:teams!tournaments_third_place_team_id_fkey(*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*))";

export async function getPlayers() {
  if (!supabase) return [] as Player[];
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) throw error;
  return data as Player[];
}

export async function getTeams() {
  if (!supabase) return [] as Team[];
  const { data, error } = await supabase.from("teams").select(teamSelect).order("created_at", { ascending: false });
  if (error) throw error;
  return data as Team[];
}

export async function getTournaments() {
  if (!supabase) return [] as Tournament[];
  const { data, error } = await supabase
    .from("tournaments")
    .select(tournamentSelect)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data as Tournament[];
}

export async function getMatches(tournamentId?: string) {
  if (!supabase) return [] as Match[];
  let query = supabase.from("matches").select(matchSelect).order("played_at", { ascending: false, nullsFirst: false });
  if (tournamentId) query = query.eq("tournament_id", tournamentId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Match[];
}

export async function getTournamentTeams(tournamentId?: string) {
  if (!supabase) return [] as TournamentTeam[];
  let query = supabase
    .from("tournament_teams")
    .select(`*, team:teams(${teamSelect})`)
    .order("created_at", { ascending: true });
  if (tournamentId) query = query.eq("tournament_id", tournamentId);
  const { data, error } = await query;
  if (error) throw error;
  return data as TournamentTeam[];
}

export async function getTournament(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("tournaments").select(tournamentSelect).eq("id", id).single();
  if (error) throw error;
  return data as Tournament;
}
