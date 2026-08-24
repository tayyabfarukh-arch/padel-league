import type { GroupName, TournamentTeam } from "./types";

export type GeneratedGroupMatch = {
  group_name: GroupName;
  team_1_id: string;
  team_2_id: string;
  court_number: number;
};

export function generateRegularGroupSchedule(
  assignments: TournamentTeam[],
  groupCount: 1 | 2,
  courtCount: number
) {
  const groups: GroupName[] = groupCount === 2 ? ["A", "B"] : ["A"];
  return groups.flatMap((groupName) =>
    generateGroupRoundRobin(
      assignments.filter((entry) => entry.group_name === groupName).map((entry) => entry.team_id),
      groupName,
      courtCount
    )
  );
}

function generateGroupRoundRobin(teamIds: string[], groupName: GroupName, courtCount: number) {
  if (teamIds.length < 2) return [];
  const rotation: Array<string | null> = [...teamIds];
  if (rotation.length % 2) rotation.push(null);
  const courts = Math.max(1, courtCount);
  const schedule: GeneratedGroupMatch[] = [];

  for (let round = 0; round < rotation.length - 1; round += 1) {
    const pairings: Array<[string, string]> = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const first = rotation[index];
      const second = rotation[rotation.length - 1 - index];
      if (first && second) pairings.push(round % 2 ? [second, first] : [first, second]);
    }

    pairings.forEach(([team1, team2], index) => {
      schedule.push({
        group_name: groupName,
        team_1_id: team1,
        team_2_id: team2,
        court_number: (index % courts) + 1
      });
    });

    rotation.splice(1, 0, rotation.pop()!);
  }

  return schedule;
}

export function matchPairKey(firstTeamId: string, secondTeamId: string) {
  return firstTeamId < secondTeamId
    ? `${firstTeamId}:${secondTeamId}`
    : `${secondTeamId}:${firstTeamId}`;
}
