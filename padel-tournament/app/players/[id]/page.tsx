import { notFound } from "next/navigation";
import { PlayerAvatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { StatsGrid } from "@/components/StatsGrid";
import { getMatches, getPlayers, getTeams, getTournaments } from "@/lib/data";
import { calculatePlayerStats } from "@/lib/scoring";
import { teamLabel } from "@/lib/format";

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const [players, teams, matches, tournaments] = await Promise.all([getPlayers(), getTeams(), getMatches(), getTournaments()]);
  const player = players.find((item) => item.id === params.id);
  if (!player) notFound();
  const stats = calculatePlayerStats(players, teams, matches, tournaments).find((item) => item.player.id === player.id)!;
  const playerTeams = teams.filter((team) => team.player_1_id === player.id || team.player_2_id === player.id);
  const teamIds = new Set(playerTeams.map((team) => team.id));
  const recentMatches = matches.filter((match) => teamIds.has(match.team_1_id) || teamIds.has(match.team_2_id)).slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <PlayerAvatar player={player} size={84} />
        <h1 className="mt-3 text-3xl font-black text-slate-950">{player.name}</h1>
      </section>
      <StatsGrid stats={stats} />
      <section className="grid gap-3 md:grid-cols-3">
        <PartnerCard label="Best partner" value={stats.bestPartner?.name} />
        <PartnerCard label="Most played partner" value={stats.mostPlayedPartner?.name} />
        <PartnerCard label="Most successful partner" value={stats.mostSuccessfulPartner?.name} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">Team history</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {playerTeams.map((team) => (
            <div key={team.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-black text-slate-950">{teamLabel(team)}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">Recent matches</h2>
        <div className="grid gap-3 md:grid-cols-2">{recentMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
      </section>
    </div>
  );
}

function PartnerCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value ?? "TBD"}</p>
    </div>
  );
}
