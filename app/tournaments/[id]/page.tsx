import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { StatCard } from "@/components/StatCard";
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
    <div className="space-y-6">
      <section className="court-panel rounded-lg px-4 py-3 text-white">
        <p className="text-[10px] font-black uppercase text-limeball">{tournament.status}</p>
        <h1 className="mt-0.5 text-xl font-black md:text-2xl">{tournament.name}</h1>
        <p className="mt-1.5 text-xs font-bold text-slate-300">
          {new Date(tournament.start_date).toLocaleDateString()} | Group: {tournament.group_target_points} total points | Final: race to {tournament.final_target_games}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Teams" value={teams.length} />
        <StatCard label="Matches" value={matches.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard label="Avg score" value={completed.length ? (completed.reduce((sum, match) => sum + (match.team_1_games ?? 0) + (match.team_2_games ?? 0), 0) / completed.length).toFixed(1) : "0"} />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {placements.map(([label, team]) => (
          <div key={label} className="sport-card p-4">
            <p className="text-xs font-black uppercase text-slate-500">{label}</p>
            <div className="mt-3 flex items-center gap-3">
              <TeamAvatar team={team} size={50} />
              <p className="font-black text-slate-950">{teamLabel(team)}</p>
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
