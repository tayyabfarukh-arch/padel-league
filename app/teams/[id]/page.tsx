import { notFound } from "next/navigation";
import { TeamAvatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { StatsGrid } from "@/components/StatsGrid";
import { getMatches, getTeams, getTournaments } from "@/lib/data";
import { headToHead, calculateTeamStats } from "@/lib/scoring";
import { teamLabel } from "@/lib/format";

export default async function TeamProfilePage({ params }: { params: { id: string } }) {
  const [teams, matches, tournaments] = await Promise.all([getTeams(), getMatches(), getTournaments()]);
  const team = teams.find((item) => item.id === params.id);
  if (!team) notFound();
  const stats = calculateTeamStats(teams, matches, tournaments).find((item) => item.team.id === team.id)!;
  const recentMatches = matches.filter((match) => match.team_1_id === team.id || match.team_2_id === team.id).slice(0, 8);
  const records = teams
    .filter((other) => other.id !== team.id)
    .map((other) => ({ other, ...headToHead(team.id, other.id, matches) }))
    .filter((record) => record.played > 0);

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <TeamAvatar team={team} size={76} />
        <h1 className="mt-3 text-3xl font-black text-slate-950">{teamLabel(team)}</h1>
        <p className="text-sm text-slate-500">{team.player_1?.name} / {team.player_2?.name}</p>
      </section>
      <StatsGrid stats={stats} />
      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">Recent matches</h2>
        <div className="grid gap-3 md:grid-cols-2">{recentMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">Head-to-head</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {records.map((record) => (
            <div key={record.other.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-black text-slate-950">{teamLabel(record.other)}</p>
              <p className="text-sm text-slate-600">{record.winsA}-{record.winsB} over {record.played} matches</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
