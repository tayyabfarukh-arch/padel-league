import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { TournamentExperience } from "@/components/TournamentExperience";
import { MatchCard } from "@/components/MatchCard";
import { TeamAvatar } from "@/components/Avatar";
import { TournamentGroups } from "@/components/TournamentGroups";
import { getCourtStreams, getMatches, getTournament, getTournamentTeams } from "@/lib/data";
import { courtStreamUrl, stageLabel, teamLabel } from "@/lib/format";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const tournament = await getTournament(params.id);
  if (!tournament) notFound();
  if (tournament.tournament_format !== "regular") {
    return <TournamentExperience tournament={tournament} allowScoreEntry={false} />;
  }
  const [tournamentTeams, matches, courtStreams] = await Promise.all([
    getTournamentTeams(tournament.id),
    getMatches(tournament.id),
    getCourtStreams(tournament.id)
  ]);
  const teams = tournamentTeams.map((item) => item.team).filter((team): team is Team => Boolean(team));
  const completed = matches.filter((match) => match.winner_team_id);
  const placements: Array<[string, Team | null | undefined]> = [
    ["Champion", tournament.champion],
    ["Runner-up", tournament.runner_up],
    ["Third place", tournament.third_place]
  ];

  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg px-4 py-3 text-white">
        <p className="text-[10px] font-black uppercase text-limeball">{tournament.status}</p>
        <h1 className="mt-0.5 text-xl font-black md:text-2xl">{tournament.name}</h1>
        <p className="mt-1.5 text-xs font-bold text-slate-300">
          {new Date(tournament.start_date).toLocaleDateString()} | Group: {tournament.points_scoring_mode === "race_to" ? "race to" : "combined total"} {tournament.group_target_points} | Final: race to {tournament.final_target_games}
        </p>
      </section>

      <section className="sport-card grid grid-cols-3 divide-x divide-slate-200 overflow-hidden">
        {[
          ["Teams", teams.length],
          ["Matches", matches.length],
          ["Completed", completed.length]
        ].map(([label, value]) => (
          <div key={label} className="px-2 py-2 text-center">
            <p className="text-[9px] font-black uppercase text-slate-500">{label}</p>
            <p className="mt-0.5 text-lg font-black leading-none text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-2 md:grid-cols-3">
        {placements.map(([label, team]) => (
          <div key={label} className="sport-card flex min-w-0 items-center gap-2.5 p-2.5">
            <TeamAvatar team={team} size={32} />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-slate-500">{label}</p>
              <p className="truncate text-sm font-black text-slate-950">{teamLabel(team)}</p>
            </div>
          </div>
        ))}
      </section>

      <TournamentGroups
        tournament={tournament}
        tournamentTeams={tournamentTeams}
        matches={matches}
        courtStreams={courtStreams}
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
