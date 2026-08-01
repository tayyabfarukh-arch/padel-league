import { ChevronDown } from "lucide-react";
import { courtStreamUrl, stageLabel } from "@/lib/format";
import { getTargetGamesForStage } from "@/lib/scoring";
import type { CourtStream, Match, Tournament, TournamentTeam } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { TournamentGroups } from "./TournamentGroups";

export function TournamentDashboard({
  tournament,
  tournamentTeams,
  matches,
  courtStreams,
  allowScoreEntry
}: {
  tournament: Tournament;
  tournamentTeams: TournamentTeam[];
  matches: Match[];
  courtStreams: CourtStream[];
  allowScoreEntry: boolean;
}) {
  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg px-4 py-3 text-white">
        <p className="text-[10px] font-black uppercase text-limeball">{tournament.status}</p>
        <h1 className="mt-0.5 text-xl font-black md:text-2xl">{tournament.name}</h1>
        <p className="mt-1.5 text-xs font-bold text-slate-300">
          Group: {tournament.points_scoring_mode === "race_to" ? "race to" : "combined total"} {tournament.group_target_points} | Final: race to {tournament.final_target_games}
        </p>
      </section>

      <TournamentGroups
        tournament={tournament}
        tournamentTeams={tournamentTeams}
        matches={matches}
        courtStreams={courtStreams}
        allowScoreEntry={allowScoreEntry}
      />

      {(["semifinal", "final", "third_place"] as const).map((stage) => {
        const stageMatches = matches.filter((match) => match.stage === stage);
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
    </div>
  );
}
