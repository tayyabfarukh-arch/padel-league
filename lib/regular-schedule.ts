import type { GroupName, TournamentTeam } from "./types";

export type GeneratedGroupMatch = {
  group_name: GroupName;
  team_1_id: string;
  team_2_id: string;
  round_number: number;
  court_number: number;
};

type Pairing = Omit<GeneratedGroupMatch, "round_number" | "court_number">;

export function generateRegularGroupSchedule(
  assignments: TournamentTeam[],
  groupCount: 1 | 2,
  courtCount: number
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
  const schedule: GeneratedGroupMatch[] = [];
  let scheduleRound = 1;

  for (let logicalRound = 0; logicalRound < logicalRoundCount; logicalRound += 1) {
    const simultaneousPairings = groupRounds.flatMap((rounds) => rounds[logicalRound] ?? []);
    for (let offset = 0; offset < simultaneousPairings.length; offset += courts) {
      const courtOffset = (scheduleRound - 1) % courts;
      simultaneousPairings.slice(offset, offset + courts).forEach((match, index) => {
        schedule.push({
          ...match,
          round_number: scheduleRound,
          court_number: ((courtOffset + index) % courts) + 1
        });
      });
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
