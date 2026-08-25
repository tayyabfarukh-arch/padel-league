import type { GroupName, TournamentTeam } from "./types";

export type GeneratedGroupMatch = {
  group_name: GroupName;
  team_1_id: string;
  team_2_id: string;
  round_number: number;
  court_number: number;
};

export type CourtScheduleRule = {
  court_number: number;
  max_matches: number;
  groups: GroupName[];
};

type Pairing = Omit<GeneratedGroupMatch, "round_number" | "court_number">;

export function generateRegularGroupSchedule(
  assignments: TournamentTeam[],
  groupCount: 1 | 2,
  courtCount: number,
  courtRules?: CourtScheduleRule[]
) {
  const groups: GroupName[] = groupCount === 2 ? ["A", "B"] : ["A"];
  const groupRounds = groups.map((groupName) =>
    generateGroupRounds(
      assignments.filter((entry) => entry.group_name === groupName).map((entry) => entry.team_id),
      groupName
    )
  );
  const logicalRoundCount = Math.max(0, ...groupRounds.map((rounds) => rounds.length));
  const courts = Math.max(1, courtCount);
  const activeGroups: GroupName[] = groupCount === 2 ? ["A", "B"] : ["A"];
  const rules = Array.from({ length: courts }, (_, index) => {
    const courtNumber = index + 1;
    const configured = courtRules?.find((rule) => rule.court_number === courtNumber);
    return {
      court_number: courtNumber,
      max_matches: configured?.max_matches ?? Number.MAX_SAFE_INTEGER,
      groups: configured ? configured.groups : activeGroups
    };
  });
  const courtUsage = new Map(rules.map((rule) => [rule.court_number, 0]));
  const schedule: GeneratedGroupMatch[] = [];
  let scheduleRound = 1;

  for (let logicalRound = 0; logicalRound < logicalRoundCount; logicalRound += 1) {
    const pending = groupRounds.flatMap((rounds) => rounds[logicalRound] ?? []);
    while (pending.length) {
      const availableCourts = rules.filter(
        (rule) => (courtUsage.get(rule.court_number) ?? 0) < rule.max_matches
      );
      const assignedCourtNumbers = new Set<number>();
      let assignedThisRound = 0;

      while (assignedCourtNumbers.size < availableCourts.length && pending.length) {
        const candidates = pending
          .map((match, index) => ({
            match,
            index,
            eligibleCourts: availableCourts.filter(
              (rule) => !assignedCourtNumbers.has(rule.court_number) && rule.groups.includes(match.group_name)
            )
          }))
          .filter((candidate) => candidate.eligibleCourts.length)
          .sort((a, b) => a.eligibleCourts.length - b.eligibleCourts.length);
        const candidate = candidates[0];
        if (!candidate) break;
        const court = [...candidate.eligibleCourts].sort((a, b) => {
          const aRemaining = a.max_matches - (courtUsage.get(a.court_number) ?? 0);
          const bRemaining = b.max_matches - (courtUsage.get(b.court_number) ?? 0);
          return bRemaining - aRemaining || a.court_number - b.court_number;
        })[0];
        schedule.push({
          ...candidate.match,
          round_number: scheduleRound,
          court_number: court.court_number
        });
        courtUsage.set(court.court_number, (courtUsage.get(court.court_number) ?? 0) + 1);
        assignedCourtNumbers.add(court.court_number);
        pending.splice(candidate.index, 1);
        assignedThisRound += 1;
      }

      if (!assignedThisRound) {
        const blockedGroups = Array.from(new Set(pending.map((match) => `Group ${match.group_name}`))).join(" and ");
        throw new Error(`${blockedGroups} does not have enough assigned court capacity for the complete schedule.`);
      }
      scheduleRound += 1;
    }
  }

  return schedule;
}

function generateGroupRounds(teamIds: string[], groupName: GroupName) {
  if (teamIds.length < 2) return [] as Pairing[][];
  const rotation: Array<string | null> = [...teamIds];
  if (rotation.length % 2) rotation.push(null);
  const rounds: Pairing[][] = [];

  for (let round = 0; round < rotation.length - 1; round += 1) {
    const pairings: Pairing[] = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const first = rotation[index];
      const second = rotation[rotation.length - 1 - index];
      if (first && second) {
        pairings.push({
          group_name: groupName,
          team_1_id: round % 2 ? second : first,
          team_2_id: round % 2 ? first : second
        });
      }
    }
    rounds.push(pairings);
    rotation.splice(1, 0, rotation.pop()!);
  }

  return rounds;
}

export function matchPairKey(firstTeamId: string, secondTeamId: string) {
  return firstTeamId < secondTeamId
    ? `${firstTeamId}:${secondTeamId}`
    : `${secondTeamId}:${firstTeamId}`;
}
