import { calculateTeamStats } from "@/lib/scoring";
import type { GroupName, Match, Team, Tournament, TournamentTeam } from "@/lib/types";
import { GroupMatchFilter } from "./GroupMatchFilter";
import { TeamLeaderboard } from "./Leaderboard";

export function TournamentGroups({
  tournament,
  tournamentTeams,
  matches,
  allowScoreEntry = false
}: {
  tournament: Tournament;
  tournamentTeams: TournamentTeam[];
  matches: Match[];
  allowScoreEntry?: boolean;
}) {
  const groupNames: GroupName[] = tournament.group_count === 2 ? ["A", "B"] : ["A"];

  return (
    <>
      {groupNames.map((groupName) => {
        const groupEntries = tournamentTeams.filter((entry) => entry.group_name === groupName);
        const groupTeams = groupEntries.map((entry) => entry.team).filter((team): team is Team => Boolean(team));
        const groupTeamIds = new Set(groupTeams.map((team) => team.id));
        const groupMatches = matches.filter(
          (match) =>
            match.stage === "group" &&
            (
              tournament.group_count === 1 ||
              match.group_name === groupName ||
              (groupTeamIds.has(match.team_1_id) && groupTeamIds.has(match.team_2_id))
            )
        );
        const standings = calculateTeamStats(groupTeams, groupMatches, [tournament]);
        const groupLabel = tournament.group_count === 2 ? `Group ${groupName}` : "Group";

        return (
          <div key={groupName} className="space-y-6">
            <section>
              <h2 className="section-title">{groupLabel} standings</h2>
              <TeamLeaderboard rows={standings} />
            </section>

            {groupMatches.length ? (
              <GroupMatchFilter
                matches={groupMatches}
                teams={groupTeams}
                title={`${groupLabel} matches`}
                allowScoreEntry={allowScoreEntry}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}
