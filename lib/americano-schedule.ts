export type TeamScheduleMatch = {
  round_number: number;
  court_number: number;
  side_1_team_id: string;
  side_2_team_id: string;
};

export type SinglesScheduleMatch = {
  round_number: number;
  court_number: number;
  side_1_player_1_id: string;
  side_1_player_2_id: string;
  side_2_player_1_id: string;
  side_2_player_2_id: string;
};

export function generateTeamAmericanoSchedule(teamIds: string[], courtCount: number) {
  if (teamIds.length < 2) throw new Error("Select at least two teams.");
  const courts = Math.max(1, courtCount);
  const rotation: Array<string | null> = [...teamIds];
  if (rotation.length % 2) rotation.push(null);
  const schedule: TeamScheduleMatch[] = [];
  let scheduleRound = 1;

  for (let round = 0; round < rotation.length - 1; round += 1) {
    const pairings: Array<[string, string]> = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const first = rotation[index];
      const second = rotation[rotation.length - 1 - index];
      if (first && second) pairings.push(round % 2 ? [second, first] : [first, second]);
    }

    for (let offset = 0; offset < pairings.length; offset += courts) {
      pairings.slice(offset, offset + courts).forEach(([side1, side2], courtIndex) => {
        schedule.push({
          round_number: scheduleRound,
          court_number: courtIndex + 1,
          side_1_team_id: side1,
          side_2_team_id: side2
        });
      });
      scheduleRound += 1;
    }

    rotation.splice(1, 0, rotation.pop()!);
  }

  return schedule;
}

export function generateSinglesAmericanoSchedule(
  playerIds: string[],
  courtCount: number,
  roundCount: number
) {
  if (playerIds.length < 4) throw new Error("Select at least four players.");
  const courts = Math.min(Math.max(1, courtCount), Math.floor(playerIds.length / 4));
  const rounds = Math.max(1, roundCount);
  const appearances = new Map(playerIds.map((id) => [id, 0]));
  const partnerships = new Map<string, number>();
  const opponents = new Map<string, number>();
  const schedule: SinglesScheduleMatch[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const active = [...playerIds]
      .sort((a, b) =>
        (appearances.get(a) ?? 0) - (appearances.get(b) ?? 0) ||
        seededValue(a, round) - seededValue(b, round)
      )
      .slice(0, courts * 4);

    const candidate = bestRoundCandidate(active, partnerships, opponents, round);
    candidate.forEach((match, courtIndex) => {
      const [a, b, c, d] = match;
      schedule.push({
        round_number: round,
        court_number: courtIndex + 1,
        side_1_player_1_id: a,
        side_1_player_2_id: b,
        side_2_player_1_id: c,
        side_2_player_2_id: d
      });
      [a, b, c, d].forEach((id) => appearances.set(id, (appearances.get(id) ?? 0) + 1));
      increment(partnerships, pairKey(a, b));
      increment(partnerships, pairKey(c, d));
      for (const left of [a, b]) {
        for (const right of [c, d]) increment(opponents, pairKey(left, right));
      }
    });
  }

  return schedule;
}

function bestRoundCandidate(
  players: string[],
  partnerships: Map<string, number>,
  opponents: Map<string, number>,
  round: number
) {
  let best: string[][] = [];
  let bestScore = Number.POSITIVE_INFINITY;
  const attempts = Math.max(120, players.length * 24);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const shuffled = deterministicShuffle(players, round * 1009 + attempt * 9176);
    const matches: string[][] = [];
    let score = 0;
    for (let index = 0; index < shuffled.length; index += 4) {
      const quartet = shuffled.slice(index, index + 4);
      const pairing = bestPairing(quartet, partnerships, opponents);
      matches.push(pairing.players);
      score += pairing.score;
    }
    if (score < bestScore) {
      best = matches;
      bestScore = score;
    }
  }

  return best;
}

function bestPairing(
  quartet: string[],
  partnerships: Map<string, number>,
  opponents: Map<string, number>
) {
  const [a, b, c, d] = quartet;
  const options = [
    [a, b, c, d],
    [a, c, b, d],
    [a, d, b, c]
  ];
  return options
    .map((players) => {
      const [p1, p2, p3, p4] = players;
      const partnerPenalty =
        ((partnerships.get(pairKey(p1, p2)) ?? 0) +
          (partnerships.get(pairKey(p3, p4)) ?? 0)) * 100;
      const opponentPenalty = [p1, p2].reduce(
        (total, left) => total + [p3, p4].reduce(
          (sum, right) => sum + (opponents.get(pairKey(left, right)) ?? 0),
          0
        ),
        0
      ) * 8;
      return { players, score: partnerPenalty + opponentPenalty };
    })
    .sort((left, right) => left.score - right.score)[0];
}

function deterministicShuffle(values: string[], seed: number) {
  const result = [...values];
  let state = seed >>> 0;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const target = state % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function seededValue(value: string, round: number) {
  let hash = round * 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pairKey(first: string, second: string) {
  return first < second ? `${first}:${second}` : `${second}:${first}`;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}
