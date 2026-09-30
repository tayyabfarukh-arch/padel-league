import Link from "next/link";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PlayerLeaderboard } from "@/components/Leaderboard";
import { getMatches, getPlayerRatings, getPlayers, getTournamentTeams, getTournaments } from "@/lib/data";
import { applyPlayerRatings } from "@/lib/ratings";
import { calculatePlayerStats } from "@/lib/scoring";
import { playersFromTeams, teamsFromTournamentTeams } from "@/lib/scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayersPage() {
  const [players, tournamentTeams, matches, tournaments, ratings] = await Promise.all([getPlayers(), getTournamentTeams(), getMatches(), getTournaments(), getPlayerRatings()]);
  const regularTournamentIds = new Set(tournaments.filter((item) => item.tournament_format === "regular").map((item) => item.id));
  const teams = teamsFromTournamentTeams(tournamentTeams.filter((item) => regularTournamentIds.has(item.tournament_id)));
  const scopedPlayers = playersFromTeams(players, teams);
  const rows = applyPlayerRatings(calculatePlayerStats(scopedPlayers, teams, matches, tournaments), ratings);
  if (!rows.length) return <EmptyState title="No players yet" body="Add players from the Admin panel." />;
  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold uppercase text-limeball">Individual rankings</p><h1 className="mt-1 text-3xl font-black">Players leaderboard</h1></div>
          <Link href="/ratings" className="btn-primary self-start"><Star className="h-4 w-4" /> Rate players</Link>
        </div>
      </section>
      <PlayerLeaderboard rows={rows} showRating />
    </div>
  );
}
