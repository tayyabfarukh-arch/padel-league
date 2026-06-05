import { notFound } from "next/navigation";
import { TeamAvatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { StatsGrid } from "@/components/StatsGrid";
import { getMatches, getTeams, getTournaments } from "@/lib/data";
import { headToHead, calculateTeamStats } from "@/lib/scoring";
import { teamLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      <section className="court-panel rounded-lg p-5 text-white">
        <TeamAvatar team={team} size={76} />
        <p className="mt-4 text-sm font-bold uppercase text-limeball">Team profile</p>
        <h1 className="mt-1 text-3xl font-black">{teamLabel(team)}</h1>
        <p className="text-sm text-slate-300">{team.player_1?.name} / {team.player_2?.name}</p>
      </section>
      <StatsGrid stats={stats} />
      <section>
        <h2 className="section-title">Recent matches</h2>
        <div className="grid gap-3 md:grid-cols-2">{recentMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
      </section>
      <section>
        <h2 className="section-title">Head-to-head</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {records.map((record) => (
            <div key={record.other.id} className="sport-card p-4">
              <p className="font-black text-slate-950">{teamLabel(record.other)}</p>
              <p className="text-sm text-slate-600">{record.winsA}-{record.winsB} over {record.played} matches</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
