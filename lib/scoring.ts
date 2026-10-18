import type { Match, Player, PlayerStats, PointsScoringMode, Stage, Team, TeamStats, Tournament } from "./types";

export function getTargetGamesForStage(tournament: Tournament | undefined, stage: Stage) {
  if (!tournament) return 3;
  const targets: Record<Stage, number> = {
    group: tournament.group_target_points,
    quarterfinal: tournament.quarterfinal_target_games,
    semifinal: tournament.semifinal_target_games,
    final: tournament.final_target_games,
    third_place: tournament.third_place_target_games
  };
  return targets[stage] || 3;
}

export function validateScore(
  team1: number,
  team2: number,
  targetScore = 3,
  stage: Stage = "group",
  endedDueToTime = false,
  pointsScoringMode: PointsScoringMode = "fixed_total"
) {
  const validNumbers =
    Number.isInteger(team1) &&
    Number.isInteger(team2) &&
    team1 >= 0 &&
    team2 >= 0;
  const higherScore = Math.max(team1, team2);
  const lowerScore = Math.min(team1, team2);
  const normalKnockoutFinish =
    higherScore === targetScore &&
    lowerScore < targetScore - 1;
  const extendedKnockoutFinish =
    higherScore === targetScore + 1 &&
    lowerScore >= targetScore - 1 &&
    lowerScore < targetScore + 1;
  const timedKnockoutFinish =
    endedDueToTime &&
    higherScore === targetScore &&
    lowerScore === targetScore - 1;
  const validGroupScore = pointsScoringMode === "race_to"
    ? validNumbers && team1 !== team2 && higherScore === targetScore && lowerScore < targetScore
    : validNumbers && team1 + team2 === targetScore;
  const valid = stage === "group"
    ? validGroupScore
    : validNumbers &&
      team1 !== team2 &&
      (normalKnockoutFinish || extendedKnockoutFinish || timedKnockoutFinish) &&
      (!endedDueToTime || timedKnockoutFinish);

  return {
    valid,
    winnerSide: valid && team1 !== team2 ? (team1 > team2 ? "team_1" : "team_2") : null
  } as const;
}

export function completedMatches(matches: Match[]) {
  return matches.filter(
    (match) => match.team_1_games !== null && match.team_2_games !== null
  );
}

function baseTeamStats(team: Team): TeamStats {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameDiff: 0,
    points: 0,
    semifinalsPlayed: 0,
    semifinalsWon: 0,
    finalsPlayed: 0,
    finalsWon: 0,
    titles: 0,
    bestFinish: "Group"
  };
}

function basePlayerStats(player: Player): PlayerStats {
  return {
    player,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameDiff: 0,
    points: 0,
    semifinalsPlayed: 0,
    semifinalsWon: 0,
    finalsPlayed: 0,
    finalsWon: 0,
    titles: 0,
    bestFinish: "Group",
    bestPartner: undefined,
    mostPlayedPartner: undefined,
    mostSuccessfulPartner: undefined
  };
}

export function calculateTeamStats(teams: Team[], matches: Match[], tournaments: Tournament[] = []) {
  const stats = new Map(teams.map((team) => [team.id, baseTeamStats(team)]));

  for (const match of completedMatches(matches)) {
    const team1 = stats.get(match.team_1_id);
    const team2 = stats.get(match.team_2_id);
    if (!team1 || !team2 || match.team_1_games === null || match.team_2_games === null) continue;

    team1.played += 1;
    team2.played += 1;
    team1.gamesWon += match.team_1_games;
    team1.gamesLost += match.team_2_games;
    team2.gamesWon += match.team_2_games;
    team2.gamesLost += match.team_1_games;
    team1.gameDiff = team1.gamesWon - team1.gamesLost;
    team2.gameDiff = team2.gamesWon - team2.gamesLost;
    team1.points = team1.gameDiff;
    team2.points = team2.gameDiff;

    const winner = match.winner_team_id === team1.team.id
      ? team1
      : match.winner_team_id === team2.team.id
        ? team2
        : null;
    const loser = winner ? (winner === team1 ? team2 : team1) : null;
    if (winner && loser) {
      winner.wins += 1;
      loser.losses += 1;
    } else {
      team1.draws += 1;
      team2.draws += 1;
    }

    if (match.stage === "semifinal" && winner) {
      team1.semifinalsPlayed += 1;
      team2.semifinalsPlayed += 1;
      winner.semifinalsWon += 1;
      team1.bestFinish = betterFinish(team1.bestFinish, "Semifinal");
      team2.bestFinish = betterFinish(team2.bestFinish, "Semifinal");
    }

    if (match.stage === "quarterfinal" && winner) {
      team1.bestFinish = betterFinish(team1.bestFinish, "Quarter-final");
      team2.bestFinish = betterFinish(team2.bestFinish, "Quarter-final");
    }

    if (match.stage === "final" && winner) {
      team1.finalsPlayed += 1;
      team2.finalsPlayed += 1;
      winner.finalsWon += 1;
      team1.bestFinish = betterFinish(team1.bestFinish, "Runner-up");
      team2.bestFinish = betterFinish(team2.bestFinish, "Runner-up");
    }

    if (match.stage === "third_place" && winner && loser) {
      winner.bestFinish = betterFinish(winner.bestFinish, "Third place");
      loser.bestFinish = betterFinish(loser.bestFinish, "Semifinal");
    }
  }

  for (const tournament of tournaments) {
    if (tournament.champion_team_id && stats.has(tournament.champion_team_id)) {
      const stat = stats.get(tournament.champion_team_id)!;
      stat.titles += 1;
      stat.bestFinish = "Champion";
    }
    if (tournament.runner_up_team_id && stats.has(tournament.runner_up_team_id)) {
      const stat = stats.get(tournament.runner_up_team_id)!;
      stat.bestFinish = betterFinish(stat.bestFinish, "Runner-up");
    }
  }

  return [...stats.values()].sort(compareTeamStats);
}

export function calculateGroupStandings(
  teams: Team[],
  matches: Match[],
  tournaments: Tournament[] = []
) {
  return calculateTeamStats(teams, matches, tournaments).sort((a, b) => {
    const primaryOrder =
      b.wins - a.wins ||
      b.gameDiff - a.gameDiff;
    if (primaryOrder) return primaryOrder;

    const directResult = headToHead(a.team.id, b.team.id, matches);
    if (directResult.winsA !== directResult.winsB) {
      return directResult.winsA > directResult.winsB ? -1 : 1;
    }

    return (
      b.gamesWon - a.gamesWon ||
      a.team.team_name.localeCompare(b.team.team_name)
    );
  });
}

export function compareTeamStats(a: TeamStats, b: TeamStats) {
  return (
    b.wins - a.wins ||
    b.points - a.points ||
    b.draws - a.draws ||
    b.gameDiff - a.gameDiff ||
    b.gamesWon - a.gamesWon ||
    a.team.team_name.localeCompare(b.team.team_name)
  );
}

export function headToHead(teamA: string, teamB: string, matches: Match[]) {
  const relevant = completedMatches(matches).filter(
    (match) =>
      (match.team_1_id === teamA && match.team_2_id === teamB) ||
      (match.team_1_id === teamB && match.team_2_id === teamA)
  );
  const winsA = relevant.filter((match) => match.winner_team_id === teamA).length;
  const winsB = relevant.filter((match) => match.winner_team_id === teamB).length;
  return { played: relevant.length, winsA, winsB };
}

export function calculatePlayerStats(
  players: Player[],
  teams: Team[],
  matches: Match[],
  tournaments: Tournament[] = []
): PlayerStats[] {
  const stats = new Map<string, PlayerStats>(
    players.map((player) => [player.id, basePlayerStats(player)])
  );
  const partnerships = new Map<string, Map<string, { played: number; wins: number; points: number }>>();

  for (const match of completedMatches(matches)) {
    if (!match.team_1 || !match.team_2 || match.team_1_games === null || match.team_2_games === null) continue;
    const sides = [
      {
        teamId: match.team_1_id,
        playerIds: [match.team_1.player_1_id, match.team_1.player_2_id],
        gamesWon: match.team_1_games,
        gamesLost: match.team_2_games
      },
      {
        teamId: match.team_2_id,
        playerIds: [match.team_2.player_1_id, match.team_2.player_2_id],
        gamesWon: match.team_2_games,
        gamesLost: match.team_1_games
      }
    ];

    for (const side of sides) {
      const won = match.winner_team_id === side.teamId;
      const drawn = match.winner_team_id === null;
      for (const playerId of side.playerIds) {
        const playerStat = stats.get(playerId);
        if (!playerStat) continue;
        playerStat.played += 1;
        playerStat.wins += won ? 1 : 0;
        playerStat.draws += drawn ? 1 : 0;
        playerStat.losses += !won && !drawn ? 1 : 0;
        playerStat.gamesWon += side.gamesWon;
        playerStat.gamesLost += side.gamesLost;
        playerStat.gameDiff = playerStat.gamesWon - playerStat.gamesLost;
        playerStat.points = playerStat.gameDiff;

        if (match.stage === "quarterfinal") playerStat.bestFinish = betterFinish(playerStat.bestFinish, "Quarter-final");
        if (match.stage === "semifinal") {
          playerStat.semifinalsPlayed += 1;
          playerStat.semifinalsWon += won ? 1 : 0;
          playerStat.bestFinish = betterFinish(playerStat.bestFinish, "Semifinal");
        }
        if (match.stage === "final") {
          playerStat.finalsPlayed += 1;
          playerStat.finalsWon += won ? 1 : 0;
          playerStat.bestFinish = betterFinish(playerStat.bestFinish, won ? "Champion" : "Runner-up");
        }
        if (match.stage === "third_place") {
          playerStat.bestFinish = betterFinish(playerStat.bestFinish, won ? "Third place" : "Semifinal");
        }

        const partnerId = side.playerIds.find((id) => id !== playerId);
        if (partnerId) {
          const playerPartners = partnerships.get(playerId) ?? new Map();
          const partner = playerPartners.get(partnerId) ?? { played: 0, wins: 0, points: 0 };
          partner.played += 1;
          partner.wins += won ? 1 : 0;
          partner.points += side.gamesWon - side.gamesLost;
          playerPartners.set(partnerId, partner);
          partnerships.set(playerId, playerPartners);
        }
      }
    }
  }

  for (const tournament of tournaments) {
    if (!tournament.champion_team_id) continue;
    const championPlayers = playersForTournamentTeam(tournament.id, tournament.champion_team_id, matches, teams);
    championPlayers.forEach((playerId) => {
      const playerStat = stats.get(playerId);
      if (!playerStat) return;
      playerStat.titles += 1;
      playerStat.bestFinish = "Champion";
    });
  }

  for (const stat of stats.values()) {
    const partnerScores = [...(partnerships.get(stat.player.id) ?? new Map()).entries()]
      .map(([partnerId, aggregate]) => ({ partner: players.find((player) => player.id === partnerId), aggregate }))
      .filter((item): item is { partner: Player; aggregate: { played: number; wins: number; points: number } } => Boolean(item.partner));
    stat.bestPartner = [...partnerScores].sort((a, b) => b.aggregate.points - a.aggregate.points)[0]?.partner;
    stat.mostPlayedPartner = [...partnerScores].sort((a, b) => b.aggregate.played - a.aggregate.played)[0]?.partner;
    stat.mostSuccessfulPartner = [...partnerScores].sort((a, b) => b.aggregate.wins - a.aggregate.wins)[0]?.partner;
  }

  return [...stats.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.points - a.points ||
      b.draws - a.draws ||
      b.gameDiff - a.gameDiff ||
      b.gamesWon - a.gamesWon ||
      a.player.name.localeCompare(b.player.name)
  );
}

function playersForTournamentTeam(tournamentId: string, teamId: string, matches: Match[], teams: Team[]) {
  const playerIds = new Set<string>();
  for (const match of completedMatches(matches)) {
    if (match.tournament_id !== tournamentId) continue;
    if (match.team_1_id === teamId && match.team_1) {
      playerIds.add(match.team_1.player_1_id);
      playerIds.add(match.team_1.player_2_id);
    }
    if (match.team_2_id === teamId && match.team_2) {
      playerIds.add(match.team_2.player_1_id);
      playerIds.add(match.team_2.player_2_id);
    }
  }
  if (!playerIds.size) {
    const team = teams.find((item) => item.id === teamId);
    if (team) {
      playerIds.add(team.player_1_id);
      playerIds.add(team.player_2_id);
    }
  }
  return playerIds;
}

function betterFinish(current: string, candidate: string) {
  const order = ["Group", "Quarter-final", "Semifinal", "Third place", "Runner-up", "Champion"];
  return order.indexOf(candidate) > order.indexOf(current) ? candidate : current;
}
