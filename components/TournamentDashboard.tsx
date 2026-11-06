"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Minimize2, MonitorUp } from "lucide-react";
import { courtStreamUrl, stageLabel } from "@/lib/format";
import { getTargetGamesForStage } from "@/lib/scoring";
import type { CourtStream, Match, Tournament, TournamentTeam } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { TournamentGroups } from "./TournamentGroups";
import { TournamentJourney } from "./TournamentJourney";

export function TournamentDashboard({
  tournament,
  tournamentTeams,
  matches,
  courtStreams,
  allowScoreEntry,
  registrationContent,
  registrationOnly = false
}: {
  tournament: Tournament;
  tournamentTeams: TournamentTeam[];
  matches: Match[];
  courtStreams: CourtStream[];
  allowScoreEntry: boolean;
  registrationContent?: ReactNode;
  registrationOnly?: boolean;
}) {
  const presentationRef = useRef<HTMLDivElement>(null);
  const [isPresenting, setIsPresenting] = useState(false);

  useEffect(() => {
    function syncFullscreenState() {
      if (!document.fullscreenElement) setIsPresenting(false);
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!isPresenting) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPresenting]);

  async function togglePresentation() {
    if (isPresenting) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setIsPresenting(false);
      return;
    }

    setIsPresenting(true);
    await presentationRef.current?.requestFullscreen().catch(() => undefined);
  }

  return (
    <div ref={presentationRef} className={`tournament-presentation-shell ${isPresenting ? "is-presenting" : ""}`}>
      {isPresenting ? (
        <div className="presentation-toolbar">
          <div>
            <p>Big Screen Mode</p>
            <strong>{tournament.name}</strong>
          </div>
          <button type="button" onClick={() => void togglePresentation()} title="Exit Big Screen Mode">
            <Minimize2 className="h-5 w-5" /> Exit presentation
          </button>
        </div>
      ) : null}

      <div className="presentation-canvas space-y-6">
        <section className="court-panel rounded-lg px-4 py-3 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-limeball">{tournament.status}</p>
              <h1 className="mt-0.5 text-xl font-black md:text-2xl">{tournament.name}</h1>
              <p className="mt-1.5 text-xs font-bold text-slate-300">
                Group: {tournament.points_scoring_mode === "race_to" ? "race to" : "combined total"} {tournament.group_target_points} | {tournament.knockout_format === "prequarterfinal" ? `Pre-quarter-final: race to ${tournament.prequarterfinal_target_games} | ` : ""}{tournament.knockout_format !== "direct_semifinal" ? `Quarter-final: race to ${tournament.quarterfinal_target_games} | ` : ""}Final: race to {tournament.final_target_games}
              </p>
            </div>
            <button type="button" className="presentation-toggle" onClick={() => void togglePresentation()} title="Open Big Screen Mode">
              <MonitorUp className="h-5 w-5" /> Big Screen
            </button>
          </div>
        </section>

        {registrationContent}

        {!registrationOnly ? (
          <>
            <TournamentJourney tournament={tournament} tournamentTeams={tournamentTeams} matches={matches} presentationMode={isPresenting} />

            <TournamentGroups
              tournament={tournament}
              tournamentTeams={tournamentTeams}
              matches={matches}
              courtStreams={courtStreams}
              allowScoreEntry={allowScoreEntry}
            />

            {(["prequarterfinal", "quarterfinal", "semifinal", "final", "third_place"] as const).map((stage) => {
              const stageMatches = matches
                .filter((match) => match.stage === stage)
                .sort((a, b) => (a.round_number ?? 99) - (b.round_number ?? 99) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              if (!stageMatches.length) return null;
              return (
                <details key={stage} className="group">
                  <summary className="section-bar cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span>{stageLabel(stage)}</span>
                    <span className="flex items-center gap-2 text-xs font-black">
                      {stageMatches.length} {stageMatches.length === 1 ? "match" : "matches"}
                      <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {stageMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        allowScoreEntry={allowScoreEntry}
                        scoreTarget={getTargetGamesForStage(tournament, stage)}
                        youtubeUrl={courtStreamUrl(match, courtStreams)}
                      />
                    ))}
                  </div>
                </details>
              );
            })}
          </>
        ) : null}
      </div>
    </div>
  );
}
