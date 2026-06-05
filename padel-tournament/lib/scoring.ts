import type { Match, Player, PlayerStats, Team, TeamStats, Tournament } from "./types";

export function validateScore(team1: number, team2: number) {
  const valid =
    Number.isInteger(team1) &&
    Number.isInteger(team2) &&
    team1 >= 0 &&
    team2 >= 0 &&
    team1 <= 3 &&
    team2 <= 3 &&
    team1 !== team2 &&
    Math.max(team1, team2) === 3 &&
    Math.min(team1, team2) <= 2;

  return {
    valid,
    winnerSide: valid ? (team1 === 3 ? "team_1" : "team_2") : null
  } as const;
}

export function completedMatches(matches: Match[]) {
  return matches.filter(
    (match) => match.team_1_games !== null && match.team_2_games !== null && match.winner_team_id
  );
}

function baseTeamStats(team: Team): TeamStats {
  return {
    team,
    played: 0,
    wins: 0,
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

    const winner = match.winner_team_id === team1.team.id ? team1 : team2;
    const loser = winner === team1 ? team2 : team1;
    winner.wins += 1;
    loser.losses += 1;

    if (match.stage === "semifinal") {
      team1.semifinalsPlayed += 1;
      team2.semifinalsPlayed += 1;
      winner.semifinalsWon += 1;
      team1.bestFinish = betterFinish(team1.bestFinish, "Semifinal");
      team2.bestFinish = betterFinish(team2.bestFinish, "Semifinal");
    }

    if (match.stage === "final") {
      team1.finalsPlayed += 1;
      team2.finalsPlayed += 1;
      winner.finalsWon += 1;
      team1.bestFinish = betterFinish(team1.bestFinish, "Runner-up");
      team2.bestFinish = betterFinish(team2.bestFinish, "Runner-up");
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

export function compareTeamStats(a: TeamStats, b: TeamStats) {
  return (
    b.points - a.points ||
    b.wins - a.wins ||
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
  const teamStats = calculateTeamStats(teams, matches, tournaments);
  const stats = new Map<string, PlayerStats>(
    players.map((player) => [player.id, basePlayerStats(player)])
  );

  for (const teamStat of teamStats) {
    for (const playerId of [teamStat.team.player_1_id, teamStat.team.player_2_id]) {
      const playerStat = stats.get(playerId);
      if (!playerStat) continue;
      playerStat.played += teamStat.played;
      playerStat.wins += teamStat.wins;
      playerStat.losses += teamStat.losses;
      playerStat.gamesWon += teamStat.gamesWon;
      playerStat.gamesLost += teamStat.gamesLost;
      playerStat.gameDiff += teamStat.gameDiff;
      playerStat.points += teamStat.points;
      playerStat.semifinalsPlayed += teamStat.semifinalsPlayed;
      playerStat.semifinalsWon += teamStat.semifinalsWon;
      playerStat.finalsPlayed += teamStat.finalsPlayed;
      playerStat.finalsWon += teamStat.finalsWon;
      playerStat.titles += teamStat.titles;
      playerStat.bestFinish = betterFinish(playerStat.bestFinish, teamStat.bestFinish);
    }
  }

  for (const stat of stats.values()) {
    const partnerships = teams.filter(
      (team) => team.player_1_id === stat.player.id || team.player_2_id === stat.player.id
    );
    const partnerScores = partnerships
      .map((team) => {
        const partnerId = team.player_1_id === stat.player.id ? team.player_2_id : team.player_1_id;
        const partner = players.find((player) => player.id === partnerId);
        const aggregate = teamStats.find((teamStat) => teamStat.team.id === team.id);
        return { partner, aggregate };
      })
      .filter((item) => item.partner && item.aggregate);

    stat.bestPartner = [...partnerScores].sort(
      (a, b) => b.aggregate!.points - a.aggregate!.points
    )[0]?.partner;
    stat.mostPlayedPartner = [...partnerScores].sort(
      (a, b) => b.aggregate!.played - a.aggregate!.played
    )[0]?.partner;
    stat.mostSuccessfulPartner = [...partnerScores].sort(
      (a, b) => b.aggregate!.wins - a.aggregate!.wins
    )[0]?.partner;
  }

  return [...stats.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.gameDiff - a.gameDiff ||
      b.gamesWon - a.gamesWon ||
      a.player.name.localeCompare(b.player.name)
  );
}

function betterFinish(current: string, candidate: string) {
  const order = ["Group", "Semifinal", "Third place", "Runner-up", "Champion"];
  return order.indexOf(candidate) > order.indexOf(current) ? candidate : current;
}
