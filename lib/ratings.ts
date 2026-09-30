import type { PlayerRating, PlayerStats, TeamStats } from "./types";

function ratingMap(ratings: PlayerRating[]) {
  return new Map(ratings.map((entry) => [entry.player_id, Number(entry.rating)]));
}

function compareStats(
  a: { rating?: number | null; wins: number; points: number },
  b: { rating?: number | null; wins: number; points: number }
) {
  if (a.rating == null && b.rating != null) return 1;
  if (a.rating != null && b.rating == null) return -1;
  if (a.rating != null && b.rating != null && b.rating !== a.rating) return b.rating - a.rating;
  if (b.wins !== a.wins) return b.wins - a.wins;
  return b.points - a.points;
}

export function applyPlayerRatings(rows: PlayerStats[], ratings: PlayerRating[]) {
  const byPlayer = ratingMap(ratings);
  return rows
    .map((row) => ({ ...row, rating: byPlayer.get(row.player.id) ?? null }))
    .sort((a, b) => compareStats(a, b) || a.player.name.localeCompare(b.player.name));
}

export function applyTeamRatings(rows: TeamStats[], ratings: PlayerRating[]) {
  const byPlayer = ratingMap(ratings);
  return rows
    .map((row) => {
      const playerOneRating = byPlayer.get(row.team.player_1_id);
      const playerTwoRating = byPlayer.get(row.team.player_2_id);
      const rating = playerOneRating == null || playerTwoRating == null
        ? null
        : (playerOneRating + playerTwoRating) / 2;
      return { ...row, rating };
    })
    .sort((a, b) => compareStats(a, b) || (a.team.team_name || "").localeCompare(b.team.team_name || ""));
}
