"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { teamLabel } from "@/lib/format";
import type { Match, Team } from "@/lib/types";
import { MatchCard } from "./MatchCard";

export function GroupMatchFilter({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const [selectedTeamId, setSelectedTeamId] = useState("all");

  const filteredMatches = useMemo(() => {
    if (selectedTeamId === "all") return matches;
    return matches.filter(
      (match) => match.team_1_id === selectedTeamId || match.team_2_id === selectedTeamId
    );
  }, [matches, selectedTeamId]);

  const selectedTeamName =
    selectedTeamId === "all"
      ? "all teams"
      : teamLabel(teams.find((team) => team.id === selectedTeamId));

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title mb-1">Group</h2>
          <p className="text-sm font-semibold text-slate-500">
            Showing {filteredMatches.length} of {matches.length} group matches for {selectedTeamName}.
          </p>
        </div>
        <label className="block md:min-w-72">
          <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500">
            <Filter className="h-3.5 w-3.5" /> Filter by team
          </span>
          <select
            className="field"
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
          >
            <option value="all">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {teamLabel(team)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredMatches.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="sport-card p-4 text-sm font-semibold text-slate-500">
          No group matches found for this team.
        </div>
      )}
    </section>
  );
}
