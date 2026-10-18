import type { Match, Player, Team, TournamentTeam } from "./types";

export function teamsFromTournamentTeams(tournamentTeams: TournamentTeam[]) {
  const byId = new Map<string, Team>();
  for (const entry of tournamentTeams) {
    if (entry.team) byId.set(entry.team.id, entry.team);
  }
  return [...byId.values()];
}

export function playersFromTeams(players: Player[], teams: Team[], matches: Match[] = []) {
  const playerIds = new Set<string>();
  for (const team of teams) {
    playerIds.add(team.player_1_id);
    playerIds.add(team.player_2_id);
  }
  for (const match of matches) {
    if (match.team_1) {
      playerIds.add(match.team_1.player_1_id);
      playerIds.add(match.team_1.player_2_id);
    }
    if (match.team_2) {
      playerIds.add(match.team_2.player_1_id);
      playerIds.add(match.team_2.player_2_id);
    }
  }
  return players.filter((player) => playerIds.has(player.id));
}
