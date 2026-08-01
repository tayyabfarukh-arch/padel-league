"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, MapPin } from "lucide-react";
import { calculateSinglesAmericanoStandings, calculateTeamAmericanoStandings } from "@/lib/americano-scoring";
import { courtStreamUrl } from "@/lib/format";
import type { AmericanoMatch, CourtStream, Team, Tournament, TournamentPlayer, TournamentTeam } from "@/lib/types";
import { AmericanoLeaderboard } from "./AmericanoLeaderboard";
import { AmericanoMatchCard } from "./AmericanoMatchCard";

export function AmericanoDashboard({
  tournament,
  tournamentPlayers,
  tournamentTeams,
  matches,
  courtStreams,
  allowScoreEntry
}: {
  tournament: Tournament;
  tournamentPlayers: TournamentPlayer[];
  tournamentTeams: TournamentTeam[];
  matches: AmericanoMatch[];
  courtStreams: CourtStream[];
  allowScoreEntry: boolean;
}) {
  const [participantFilter, setParticipantFilter] = useState("all");
  const [courtFilter, setCourtFilter] = useState("all");
  const players = tournamentPlayers.map((entry) => entry.player).filter(Boolean) as NonNullable<TournamentPlayer["player"]>[];
  const teams = tournamentTeams.map((entry) => entry.team).filter(Boolean) as Team[];
  const standings = tournament.tournament_format === "singles_americano"
    ? calculateSinglesAmericanoStandings(players, matches)
    : calculateTeamAmericanoStandings(teams, matches);
  const participants = tournament.tournament_format === "singles_americano"
    ? players.map((player) => [player.id, player.name])
    : teams.map((team) => [team.id, team.team_name]);
  const courts = [...new Set(matches.map((match) => match.court_number).filter((court): court is number => court !== null))].sort((a, b) => a - b);
  const filteredMatches = useMemo(() => matches.filter((match) => {
    const participantIds = tournament.tournament_format === "singles_americano"
      ? [match.side_1_player_1_id, match.side_1_player_2_id, match.side_2_player_1_id, match.side_2_player_2_id]
      : [match.side_1_team_id, match.side_2_team_id];
    return (participantFilter === "all" || participantIds.includes(participantFilter)) &&
      (courtFilter === "all" || String(match.court_number) === courtFilter);
  }), [courtFilter, matches, participantFilter, tournament.tournament_format]);
  const roundNumbers = [...new Set(filteredMatches.map((match) => match.round_number))].sort((a, b) => a - b);
  const formatLabel = tournament.tournament_format === "singles_americano" ? "Singles Americano" : "Team Americano";

  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg px-4 py-3 text-white">
        <p className="text-[10px] font-black uppercase text-limeball">{tournament.status} | {formatLabel}</p>
        <h1 className="mt-0.5 text-xl font-black md:text-2xl">{tournament.name}</h1>
        <p className="mt-1.5 text-xs font-bold text-slate-300">{tournament.points_scoring_mode === "race_to" ? "Race to" : "Combined total"} {tournament.americano_target_points} points | {tournament.americano_round_count} rounds | {tournament.court_count} courts</p>
      </section>

      <section>
        <h2 className="section-bar">Americano standings</h2>
        <AmericanoLeaderboard rows={standings} />
      </section>

      <section className="sport-card grid gap-3 p-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500"><Filter className="h-3.5 w-3.5" /> Participant</span>
          <select className="field" value={participantFilter} onChange={(event) => setParticipantFilter(event.target.value)}>
            <option value="all">All participants</option>
            {participants.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500"><MapPin className="h-3.5 w-3.5" /> Court</span>
          <select className="field" value={courtFilter} onChange={(event) => setCourtFilter(event.target.value)}>
            <option value="all">All courts</option>
            {courts.map((court) => <option key={court} value={String(court)}>Court {court}</option>)}
          </select>
        </label>
      </section>

      {roundNumbers.map((roundNumber) => {
        const roundMatches = filteredMatches.filter((match) => match.round_number === roundNumber);
        return (
          <details key={roundNumber} className="group">
            <summary className="section-bar cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span>Round {roundNumber}</span>
              <span className="flex items-center gap-2 text-xs">{roundMatches.length} matches <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></span>
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {roundMatches.map((match) => <AmericanoMatchCard key={match.id} match={match} format={tournament.tournament_format} targetPoints={tournament.americano_target_points} pointsScoringMode={tournament.points_scoring_mode} allowScoreEntry={allowScoreEntry} youtubeUrl={courtStreamUrl(match, courtStreams)} />)}
            </div>
          </details>
        );
      })}
      {!matches.length ? <div className="sport-card p-5 text-center text-sm font-bold text-slate-500">The Admin has not generated the Americano schedule yet.</div> : null}
    </div>
  );
}
