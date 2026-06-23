import type { Player, Team, TournamentPlayer, TournamentTeam } from "./types";

export function teamsFromTournamentTeams(tournamentTeams: TournamentTeam[]) {
  const byId = new Map<string, Team>();
  for (const entry of tournamentTeams) {
    if (entry.team) byId.set(entry.team.id, entry.team);
  }
  return [...byId.values()];
}

export function playersFromTeams(players: Player[], teams: Team[]) {
  const playerIds = new Set<string>();
  for (const team of teams) {
    playerIds.add(team.player_1_id);
    playerIds.add(team.player_2_id);
  }
  return players.filter((player) => playerIds.has(player.id));
}

export function playersFromTournamentPlayers(players: Player[], tournamentPlayers: TournamentPlayer[]) {
  const playerIds = new Set(tournamentPlayers.map((entry) => entry.player_id));
  return players.filter((player) => playerIds.has(player.id));
}
