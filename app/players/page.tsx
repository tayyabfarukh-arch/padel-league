import Link from "next/link";
import { Activity, Award, Star } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PlayerLeaderboard } from "@/components/Leaderboard";
import { getMatches, getPlayerRatings, getPlayers, getPredictions, getTournamentTeams, getTournaments } from "@/lib/data";
import { applyLatestPredictionOutcomes } from "@/lib/prediction-outcomes";
import { applyPlayerRatings } from "@/lib/ratings";
import { calculatePlayerStats } from "@/lib/scoring";
import { playersFromTeams, teamsFromTournamentTeams } from "@/lib/scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayersPage() {
  const [players, tournamentTeams, matches, tournaments, ratings, predictions] = await Promise.all([getPlayers(), getTournamentTeams(), getMatches(), getTournaments(), getPlayerRatings(), getPredictions()]);
  const regularTournamentIds = new Set(tournaments.filter((item) => item.tournament_format === "regular").map((item) => item.id));
  const teams = teamsFromTournamentTeams(tournamentTeams.filter((item) => regularTournamentIds.has(item.tournament_id)));
  const scopedPlayers = playersFromTeams(players, teams);
  const rows = applyLatestPredictionOutcomes(
    applyPlayerRatings(calculatePlayerStats(scopedPlayers, teams, matches, tournaments), ratings),
    predictions,
    tournaments,
    tournamentTeams
  );
  if (!rows.length) return <EmptyState title="No players yet" body="Add players from the Admin panel." />;
  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold uppercase text-limeball">Individual rankings</p><h1 className="mt-1 text-3xl font-black">Players leaderboard</h1></div>
          <div className="flex flex-wrap gap-2 self-start"><Link href="/awards" className="btn-secondary"><Award className="h-4 w-4" /> Awards</Link><Link href="/performance" className="btn-secondary"><Activity className="h-4 w-4" /> Performance</Link><Link href="/ratings" className="btn-primary"><Star className="h-4 w-4" /> Rate players</Link></div>
        </div>
      </section>
      <PlayerLeaderboard rows={rows} showRating />
    </div>
  );
}
