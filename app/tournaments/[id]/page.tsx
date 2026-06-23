import { notFound } from "next/navigation";
import { StatCard } from "@/components/StatCard";
import { MatchCard } from "@/components/MatchCard";
import { GroupMatchFilter } from "@/components/GroupMatchFilter";
import { TeamAvatar } from "@/components/Avatar";
import { TeamLeaderboard } from "@/components/Leaderboard";
import { getMatches, getTournament, getTournamentTeams } from "@/lib/data";
import { calculateTeamStats } from "@/lib/scoring";
import { stageLabel, teamLabel } from "@/lib/format";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const tournament = await getTournament(params.id);
  if (!tournament) notFound();
  const [tournamentTeams, matches] = await Promise.all([getTournamentTeams(tournament.id), getMatches(tournament.id)]);
  const teams = tournamentTeams.map((item) => item.team).filter((team): team is Team => Boolean(team));
  const completed = matches.filter((match) => match.winner_team_id);
  const groupMatches = matches.filter((match) => match.stage === "group");
  const standings = calculateTeamStats(teams, groupMatches, [tournament]);
  const placements: Array<[string, Team | null | undefined]> = [
    ["Champion", tournament.champion],
    ["Runner-up", tournament.runner_up],
    ["Third place", tournament.third_place]
  ];

  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">{tournament.status}</p>
        <h1 className="mt-1 text-3xl font-black">{tournament.name}</h1>
        <p className="mt-2 text-sm text-slate-300">{new Date(tournament.start_date).toLocaleDateString()}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Teams" value={teams.length} />
        <StatCard label="Matches" value={matches.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard label="Avg games" value={completed.length ? (completed.reduce((sum, match) => sum + (match.team_1_games ?? 0) + (match.team_2_games ?? 0), 0) / completed.length).toFixed(1) : "0"} />
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

      <section>
        <h2 className="section-title">Full standings</h2>
        <TeamLeaderboard rows={standings} />
      </section>

      {groupMatches.length ? <GroupMatchFilter matches={groupMatches} teams={teams} /> : null}

      {(["semifinal", "final", "third_place"] as const).map((stage) => {
        const stageMatches = matches.filter((match) => match.stage === stage);
        if (!stageMatches.length) return null;
        return (
          <section key={stage}>
            <h2 className="section-title">{stageLabel(stage)}</h2>
            <div className="grid gap-3 md:grid-cols-2">{stageMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
