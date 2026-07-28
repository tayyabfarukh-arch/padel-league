"use client";

import { useState } from "react";
import { courtStreamUrl } from "@/lib/format";
import { calculateGroupStandings } from "@/lib/scoring";
import type { CourtStream, GroupName, Match, Team, Tournament, TournamentTeam } from "@/lib/types";
import { GroupMatchFilter } from "./GroupMatchFilter";
import { TeamLeaderboard } from "./Leaderboard";

export function TournamentGroups({
  tournament,
  tournamentTeams,
  matches,
  courtStreams = [],
  allowScoreEntry = false
}: {
  tournament: Tournament;
  tournamentTeams: TournamentTeam[];
  matches: Match[];
  courtStreams?: CourtStream[];
  allowScoreEntry?: boolean;
}) {
  const groupNames: GroupName[] = tournament.group_count === 2 ? ["A", "B"] : ["A"];
  const [selectedGroup, setSelectedGroup] = useState<GroupName>("A");
  const visibleGroups = tournament.group_count === 2 ? [selectedGroup] : groupNames;

  return (
    <div className="space-y-6">
      {tournament.group_count === 2 ? (
        <section className="sport-card flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Group standings</p>
            <p className="text-sm font-semibold text-slate-700">Choose a group to see its table and matches.</p>
          </div>
          <div className="flex w-full shrink-0 rounded-md border border-slate-200 bg-slate-50 p-1 md:w-auto">
            {groupNames.map((groupName) => (
              <button
                key={groupName}
                type="button"
                className={selectedGroup === groupName ? "btn-primary flex-1 md:min-w-24" : "btn-secondary flex-1 border-0 shadow-none md:min-w-24"}
                onClick={() => setSelectedGroup(groupName)}
              >
                Group {groupName}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {visibleGroups.map((groupName) => {
        const groupEntries = tournamentTeams.filter((entry) => entry.group_name === groupName);
        const groupTeams = groupEntries.map((entry) => entry.team).filter((team): team is Team => Boolean(team));
        const groupTeamIds = new Set(groupTeams.map((team) => team.id));
        const groupMatches = matches.filter(
          (match) =>
            match.stage === "group" &&
            (
              tournament.group_count === 1 ||
              (groupTeamIds.has(match.team_1_id) && groupTeamIds.has(match.team_2_id))
            )
        );
        const standings = calculateGroupStandings(groupTeams, groupMatches, [tournament]);
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
                scoreTarget={tournament.group_target_points}
                youtubeUrls={Object.fromEntries(
                  groupMatches.map((match) => [match.id, courtStreamUrl(match, courtStreams)])
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
