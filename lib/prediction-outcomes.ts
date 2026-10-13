import type { PlayerStats, Prediction, Tournament, TournamentTeam } from "./types";

export function applyLatestPredictionOutcomes(
  rows: PlayerStats[],
  predictions: Prediction[],
  tournaments: Tournament[],
  tournamentTeams: TournamentTeam[]
) {
  const completedTournaments = tournaments.filter(
    (tournament) => tournament.status === "completed" && Boolean(tournament.champion_team_id)
  );
  const latestCompleted = completedTournaments[0];
  if (!latestCompleted?.champion_team_id) return rows;

  const championPlayerIds = new Set([
    latestCompleted.champion?.player_1_id,
    latestCompleted.champion?.player_2_id
  ].filter((playerId): playerId is string => Boolean(playerId)));
  const participantTournamentIdsByPlayer = new Map<string, Set<string>>();
  tournamentTeams.forEach((entry) => {
    const playerIds = [entry.team?.player_1_id, entry.team?.player_2_id].filter((playerId): playerId is string => Boolean(playerId));
    playerIds.forEach((playerId) => {
      const tournamentIds = participantTournamentIdsByPlayer.get(playerId) ?? new Set<string>();
      tournamentIds.add(entry.tournament_id);
      participantTournamentIdsByPlayer.set(playerId, tournamentIds);
    });
  });

  return rows.map((row) => {
    const participantTournamentIds = participantTournamentIdsByPlayer.get(row.player.id);
    const relevantTournament = completedTournaments.find((tournament) => participantTournamentIds?.has(tournament.id));
    const prediction = relevantTournament && row.player.user_id
      ? predictions.find((item) => item.tournament_id === relevantTournament.id && item.voter_user_id === row.player.user_id)
      : undefined;
    return {
      ...row,
      predictionOutcome: relevantTournament
        ? prediction?.predicted_team_id
          ? prediction.predicted_team_id === relevantTournament.champion_team_id ? "correct" as const : "wrong" as const
          : "no_vote" as const
        : null,
      latestTournamentChampion: championPlayerIds.has(row.player.id)
    };
  });
}
