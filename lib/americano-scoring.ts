import { teamLabel } from "./format";
import type { AmericanoMatch, AmericanoStanding, Player, Team } from "./types";

export function calculateSinglesAmericanoStandings(players: Player[], matches: AmericanoMatch[]) {
  const standings = new Map<string, AmericanoStanding>(players.map((player) => [
    player.id,
    emptyStanding(player.id, player.name, { player })
  ]));

  for (const match of completedAmericanoMatches(matches)) {
    const side1 = [match.side_1_player_1_id, match.side_1_player_2_id];
    const side2 = [match.side_2_player_1_id, match.side_2_player_2_id];
    applySideResult(standings, side1, side2, match.side_1_points!, match.side_2_points!, match.winner_side);
  }

  return sortAmericanoStandings([...standings.values()]);
}

export function calculateTeamAmericanoStandings(teams: Team[], matches: AmericanoMatch[]) {
  const standings = new Map<string, AmericanoStanding>(teams.map((team) => [
    team.id,
    emptyStanding(team.id, teamLabel(team), { team })
  ]));

  for (const match of completedAmericanoMatches(matches)) {
    if (!match.side_1_team_id || !match.side_2_team_id) continue;
    applySideResult(
      standings,
      [match.side_1_team_id],
      [match.side_2_team_id],
      match.side_1_points!,
      match.side_2_points!,
      match.winner_side
    );
  }

  return sortAmericanoStandings([...standings.values()]);
}

export function completedAmericanoMatches(matches: AmericanoMatch[]) {
  return matches.filter((match) => match.side_1_points !== null && match.side_2_points !== null);
}

function applySideResult(
  standings: Map<string, AmericanoStanding>,
  side1Ids: Array<string | null>,
  side2Ids: Array<string | null>,
  side1Points: number,
  side2Points: number,
  winnerSide: 1 | 2 | null
) {
  for (const [ids, pointsFor, pointsAgainst, side] of [
    [side1Ids, side1Points, side2Points, 1],
    [side2Ids, side2Points, side1Points, 2]
  ] as const) {
    for (const id of ids) {
      if (!id) continue;
      const row = standings.get(id);
      if (!row) continue;
      row.played += 1;
      row.pointsFor += pointsFor;
      row.pointsAgainst += pointsAgainst;
      row.pointDiff = row.pointsFor - row.pointsAgainst;
      if (winnerSide === null) row.draws += 1;
      else if (winnerSide === side) row.wins += 1;
      else row.losses += 1;
    }
  }
}

function emptyStanding(
  id: string,
  name: string,
  relation: Pick<AmericanoStanding, "player" | "team">
): AmericanoStanding {
  return {
    id,
    name,
    ...relation,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDiff: 0
  };
}

function sortAmericanoStandings(rows: AmericanoStanding[]) {
  return rows.sort((a, b) =>
    b.pointsFor - a.pointsFor ||
    b.wins - a.wins ||
    b.pointDiff - a.pointDiff ||
    a.pointsAgainst - b.pointsAgainst ||
    a.name.localeCompare(b.name)
  );
}
