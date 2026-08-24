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
  showGroupFilter = false,
  youtubeUrls = {}
}: {
  matches: Match[];
  teams: Team[];
  title?: string;
  allowScoreEntry?: boolean;
  scoreTarget?: number;
  pointsScoringMode?: PointsScoringMode;
  showGroupFilter?: boolean;
  youtubeUrls?: Record<string, string | undefined>;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [selectedCourt, setSelectedCourt] = useState("all");
  const [selectedRound, setSelectedRound] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
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
  const roundNumbers = useMemo(
    () => Array.from(new Set(matches.map((match) => match.round_number).filter((round): round is number => Boolean(round)))).sort((a, b) => a - b),
    [matches]
  );
  const hasUnscheduledRound = matches.some((match) => !match.round_number);

  const filteredMatches = useMemo(() => {
    const orderedMatches = [...matches].sort(
      (a, b) =>
        (a.round_number ?? Number.MAX_SAFE_INTEGER) - (b.round_number ?? Number.MAX_SAFE_INTEGER) ||
        (a.court_number ?? Number.MAX_SAFE_INTEGER) - (b.court_number ?? Number.MAX_SAFE_INTEGER) ||
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
      const matchesRound =
        selectedRound === "all" ||
        (selectedRound === "unscheduled" ? !match.round_number : String(match.round_number) === selectedRound);
      const matchesGroup = selectedGroup === "all" || match.group_name === selectedGroup;
      return matchesTeam && matchesCourt && matchesRound && matchesGroup;
    });
  }, [matches, selectedCourt, selectedGroup, selectedRound, selectedTeamId]);

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
  const selectedRoundName = selectedRound === "all" ? "all rounds" : selectedRound === "unscheduled" ? "unscheduled matches" : `Round ${selectedRound}`;
  const selectedGroupName = selectedGroup === "all" ? "all groups" : `Group ${selectedGroup}`;
  const matchesByRound = useMemo(() => {
    const grouped = new Map<string, Match[]>();
    filteredMatches.forEach((match) => {
      const key = match.round_number ? String(match.round_number) : "unscheduled";
      grouped.set(key, [...(grouped.get(key) ?? []), match]);
    });
    return Array.from(grouped.entries());
  }, [filteredMatches]);

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
            Showing {filteredMatches.length} of {matches.length} matches for {selectedTeamName}, {selectedGroupName}, {selectedRoundName}, on {selectedCourtName}.
          </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500">
                <Filter className="h-3.5 w-3.5" /> Round
              </span>
              <select className="field" value={selectedRound} onChange={(event) => setSelectedRound(event.target.value)}>
                <option value="all">All rounds</option>
                {roundNumbers.map((round) => <option key={round} value={String(round)}>Round {round}</option>)}
                {hasUnscheduledRound ? <option value="unscheduled">Unscheduled</option> : null}
              </select>
            </label>

            {showGroupFilter ? (
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500">
                  <Filter className="h-3.5 w-3.5" /> Group
                </span>
                <select className="field" value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
                  <option value="all">All groups</option>
                  <option value="A">Group A</option>
                  <option value="B">Group B</option>
                </select>
              </label>
            ) : null}

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
          <div className="space-y-5">
            {matchesByRound.map(([round, roundMatches]) => {
              const courts = Array.from(
                new Set(roundMatches.map((match) => match.court_number).filter((court): court is number => court !== null))
              ).sort((a, b) => a - b);
              return (
                <section key={round}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border-l-4 border-limeball bg-ink px-3 py-2 text-white">
                    <h3 className="font-black">{round === "unscheduled" ? "Round not assigned" : `Round ${round}`}</h3>
                    <p className="text-xs font-bold text-slate-200">
                      {roundMatches.length} {roundMatches.length === 1 ? "match" : "matches"}
                      {courts.length ? ` | Courts ${courts.join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {roundMatches.map((match) => (
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
                </section>
              );
            })}
          </div>
        ) : (
          <div className="sport-card p-4 text-sm font-semibold text-slate-500">
            No matches found for the selected filters.
          </div>
        )}
      </div>
    </details>
  );
}
