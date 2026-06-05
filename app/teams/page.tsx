import { EmptyState } from "@/components/EmptyState";
import { TeamLeaderboard } from "@/components/Leaderboard";
import { getMatches, getTeams, getTournaments } from "@/lib/data";
import { calculateTeamStats } from "@/lib/scoring";

export default async function TeamsPage() {
  const [teams, matches, tournaments] = await Promise.all([getTeams(), getMatches(), getTournaments()]);
  const rows = calculateTeamStats(teams, matches, tournaments);
  if (!rows.length) return <EmptyState title="No teams yet" body="Create teams from the Admin panel." />;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black text-slate-950">Teams leaderboard</h1>
      <TeamLeaderboard rows={rows} />
    </div>
  );
}
