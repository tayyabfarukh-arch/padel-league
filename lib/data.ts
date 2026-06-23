import { unstable_noStore as noStore } from "next/cache";
import { getSelectedFriendCircle } from "./friend-circle-server";
import { supabase } from "./supabase";
import type { Match, Player, Team, Tournament, TournamentTeam } from "./types";

const teamSelect = "*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*)";
const matchSelect = `*, team_1:teams!matches_team_1_id_fkey(${teamSelect}), team_2:teams!matches_team_2_id_fkey(${teamSelect})`;
const tournamentSelect =
  "*, champion:teams!tournaments_champion_team_id_fkey(*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*)), runner_up:teams!tournaments_runner_up_team_id_fkey(*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*)), third_place:teams!tournaments_third_place_team_id_fkey(*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*))";

export async function getPlayers() {
  noStore();
  if (!supabase) return [] as Player[];
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) throw error;
  return data as Player[];
}

export async function getTeams() {
  noStore();
  if (!supabase) return [] as Team[];
  const { data, error } = await supabase.from("teams").select(teamSelect).order("created_at", { ascending: false });
  if (error) throw error;
  return data as Team[];
}

export async function getTournaments() {
  noStore();
  if (!supabase) return [] as Tournament[];
  let query = supabase
    .from("tournaments")
    .select(tournamentSelect)
    .order("start_date", { ascending: false });

  const circle = getSelectedFriendCircle();
  if (circle !== "overall") query = query.eq("friend_circle", circle);

  const { data, error } = await query;
  if (error) throw error;
  return data as Tournament[];
}

export async function getMatches(tournamentId?: string) {
  noStore();
  if (!supabase) return [] as Match[];
  let query = supabase.from("matches").select(matchSelect).order("played_at", { ascending: false, nullsFirst: false });
  if (tournamentId) query = query.eq("tournament_id", tournamentId);
  if (!tournamentId) {
    const tournamentIds = await getSelectedTournamentIds();
    if (tournamentIds) {
      if (!tournamentIds.length) return [] as Match[];
      query = query.in("tournament_id", tournamentIds);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as Match[];
}

export async function getTournamentTeams(tournamentId?: string) {
  noStore();
  if (!supabase) return [] as TournamentTeam[];
  let query = supabase
    .from("tournament_teams")
    .select(`*, team:teams(${teamSelect})`)
    .order("created_at", { ascending: true });
  if (tournamentId) query = query.eq("tournament_id", tournamentId);
  if (!tournamentId) {
    const tournamentIds = await getSelectedTournamentIds();
    if (tournamentIds) {
      if (!tournamentIds.length) return [] as TournamentTeam[];
      query = query.in("tournament_id", tournamentIds);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as TournamentTeam[];
}

export async function getTournament(id: string) {
  noStore();
  if (!supabase) return null;
  let query = supabase.from("tournaments").select(tournamentSelect).eq("id", id);
  const circle = getSelectedFriendCircle();
  if (circle !== "overall") query = query.eq("friend_circle", circle);
  const { data, error } = await query.single();
  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  return data as Tournament;
}

async function getSelectedTournamentIds() {
  const circle = getSelectedFriendCircle();
  if (circle === "overall") return null;
  if (!supabase) return [] as string[];

  const { data, error } = await supabase
    .from("tournaments")
    .select("id")
    .eq("friend_circle", circle);

  if (error) throw error;
  return data.map((row) => row.id as string);
}
