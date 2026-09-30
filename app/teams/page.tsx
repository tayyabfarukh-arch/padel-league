import { EmptyState } from "@/components/EmptyState";
import { TeamLeaderboard } from "@/components/Leaderboard";
import { getMatches, getPlayerRatings, getTournamentTeams, getTournaments } from "@/lib/data";
import { applyTeamRatings } from "@/lib/ratings";
import { calculateTeamStats } from "@/lib/scoring";
import { teamsFromTournamentTeams } from "@/lib/scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamsPage() {
  const [tournamentTeams, matches, tournaments, ratings] = await Promise.all([getTournamentTeams(), getMatches(), getTournaments(), getPlayerRatings()]);
  const regularTournamentIds = new Set(tournaments.filter((item) => item.tournament_format === "regular").map((item) => item.id));
  const teams = teamsFromTournamentTeams(tournamentTeams.filter((item) => regularTournamentIds.has(item.tournament_id)));
  const rows = applyTeamRatings(calculateTeamStats(teams, matches, tournaments), ratings);
  if (!rows.length) return <EmptyState title="No teams yet" body="Create teams from the Admin panel." />;
  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">Partnership rankings</p>
        <h1 className="mt-1 text-3xl font-black">Teams leaderboard</h1>
      </section>
      <TeamLeaderboard rows={rows} showRating />
    </div>
  );
}
