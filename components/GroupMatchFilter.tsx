"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, MapPin } from "lucide-react";
import { teamLabel } from "@/lib/format";
import type { Match, PointsScoringMode, Team } from "@/lib/types";
import { MatchCard } from "./MatchCard";

export function GroupMatchFilter({
  matches,
  teams,
  title = "Group matches",
  allowScoreEntry = false,
  scoreTarget,
  pointsScoringMode,
  youtubeUrls = {}
}: {
  matches: Match[];
  teams: Team[];
  title?: string;
  allowScoreEntry?: boolean;
  scoreTarget?: number;
  pointsScoringMode?: PointsScoringMode;
  youtubeUrls?: Record<string, string | undefined>;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [selectedCourt, setSelectedCourt] = useState("all");
  const courtNumbers = useMemo(
    () =>
      Array.from(
        new Set(
          matches
            .map((match) => match.court_number)
            .filter((court): court is number => court !== null)
        )
      ).sort((a, b) => a - b),
    [matches]
  );
  const hasUnassignedCourt = matches.some((match) => match.court_number === null);

  const filteredMatches = useMemo(() => {
    const orderedMatches = [...matches].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
        a.id.localeCompare(b.id)
    );
    return orderedMatches.filter((match) => {
      const matchesTeam =
        selectedTeamId === "all" ||
        match.team_1_id === selectedTeamId ||
        match.team_2_id === selectedTeamId;
      const matchesCourt =
        selectedCourt === "all" ||
        (selectedCourt === "unassigned"
          ? match.court_number === null
          : String(match.court_number) === selectedCourt);
      return matchesTeam && matchesCourt;
    });
  }, [matches, selectedCourt, selectedTeamId]);

  const selectedTeamName =
    selectedTeamId === "all"
      ? "all teams"
      : teamLabel(teams.find((team) => team.id === selectedTeamId));
  const selectedCourtName =
    selectedCourt === "all"
      ? "all courts"
      : selectedCourt === "unassigned"
        ? "unassigned courts"
        : `Court ${selectedCourt}`;

  return (
    <details className="group">
      <summary className="section-bar cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-2 text-xs font-black">
          {matches.length} matches
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-3">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
          <p className="text-sm font-semibold text-slate-500">
            Showing {filteredMatches.length} of {matches.length} group matches for {selectedTeamName} on {selectedCourtName}.
          </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 md:w-auto md:min-w-[28rem] lg:min-w-[34rem]">
            <label className="block">
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

            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> Filter by court
              </span>
              <select
                className="field"
                value={selectedCourt}
                onChange={(event) => setSelectedCourt(event.target.value)}
              >
                <option value="all">All courts</option>
                {courtNumbers.map((court) => (
                  <option key={court} value={String(court)}>
                    Court {court}
                  </option>
                ))}
                {hasUnassignedCourt ? <option value="unassigned">Unassigned court</option> : null}
              </select>
            </label>
          </div>
        </div>

        {filteredMatches.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                allowScoreEntry={allowScoreEntry}
                scoreTarget={scoreTarget}
                pointsScoringMode={pointsScoringMode}
                youtubeUrl={youtubeUrls[match.id]}
              />
            ))}
          </div>
        ) : (
          <div className="sport-card p-4 text-sm font-semibold text-slate-500">
            No group matches found for this team.
          </div>
        )}
      </div>
    </details>
  );
}
