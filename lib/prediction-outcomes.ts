import type { PlayerStats, Prediction, Tournament } from "./types";

export function applyLatestPredictionOutcomes(
  rows: PlayerStats[],
  predictions: Prediction[],
  tournaments: Tournament[]
) {
  const latestCompleted = tournaments.find(
    (tournament) => tournament.status === "completed" && Boolean(tournament.champion_team_id)
  );
  if (!latestCompleted?.champion_team_id) return rows;

  const byUser = new Map(
    predictions
      .filter((prediction) => prediction.tournament_id === latestCompleted.id && prediction.voter_user_id)
      .map((prediction) => [prediction.voter_user_id!, prediction.predicted_team_id])
  );

  return rows.map((row) => {
    const predictedTeamId = row.player.user_id ? byUser.get(row.player.user_id) : undefined;
    return {
      ...row,
      predictionOutcome: predictedTeamId
        ? predictedTeamId === latestCompleted.champion_team_id ? "correct" as const : "wrong" as const
        : null
    };
  });
}
