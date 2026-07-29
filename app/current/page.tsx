import { ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MatchCard } from "@/components/MatchCard";
import { TournamentGroups } from "@/components/TournamentGroups";
import { getCourtStreams, getMatches, getTournamentTeams, getTournaments } from "@/lib/data";
import { courtStreamUrl, stageLabel } from "@/lib/format";
import { getTargetGamesForStage } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CurrentTournamentPage() {
  const tournaments = await getTournaments();
  const tournament = tournaments.find((item) => item.status === "active");
  if (!tournament) return <EmptyState title="No active tournament" body="Open Admin, select a tournament, and change its status to Active." />;

  const [tournamentTeams, matches, courtStreams] = await Promise.all([
    getTournamentTeams(tournament.id),
    getMatches(tournament.id),
    getCourtStreams(tournament.id)
  ]);
  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg px-4 py-3 text-white">
        <p className="text-[10px] font-black uppercase text-limeball">{tournament.status}</p>
        <h1 className="mt-0.5 text-xl font-black md:text-2xl">{tournament.name}</h1>
        <p className="mt-1.5 text-xs font-bold text-slate-300">
          Group: {tournament.group_target_points} total points | Final: race to {tournament.final_target_games}
        </p>
      </section>

      <TournamentGroups
        tournament={tournament}
        tournamentTeams={tournamentTeams}
        matches={matches}
        courtStreams={courtStreams}
        allowScoreEntry={tournament.status === "active"}
      />

      {(["semifinal", "final", "third_place"] as const).map((stage) => {
        const stageMatches = matches.filter((match) => match.stage === stage);
        if (!stageMatches.length) return null;
        return (
          <details key={stage} open className="group">
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
                  allowScoreEntry={tournament.status === "active"}
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
