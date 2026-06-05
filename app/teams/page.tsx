import { EmptyState } from "@/components/EmptyState";
import { TeamLeaderboard } from "@/components/Leaderboard";
import { getMatches, getTeams, getTournaments } from "@/lib/data";
import { calculateTeamStats } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamsPage() {
  const [teams, matches, tournaments] = await Promise.all([getTeams(), getMatches(), getTournaments()]);
  const rows = calculateTeamStats(teams, matches, tournaments);
  if (!rows.length) return <EmptyState title="No teams yet" body="Create teams from the Admin panel." />;
  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">Partnership rankings</p>
        <h1 className="mt-1 text-3xl font-black">Teams leaderboard</h1>
      </section>
      <TeamLeaderboard rows={rows} />
    </div>
  );
}
