import { EmptyState } from "@/components/EmptyState";
import { PlayerLeaderboard } from "@/components/Leaderboard";
import { getMatches, getPlayers, getTournamentTeams, getTournaments } from "@/lib/data";
import { calculatePlayerStats } from "@/lib/scoring";
import { playersFromTeams, teamsFromTournamentTeams } from "@/lib/scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayersPage() {
  const [players, tournamentTeams, matches, tournaments] = await Promise.all([getPlayers(), getTournamentTeams(), getMatches(), getTournaments()]);
  const teams = teamsFromTournamentTeams(tournamentTeams);
  const scopedPlayers = playersFromTeams(players, teams);
  const rows = calculatePlayerStats(scopedPlayers, teams, matches, tournaments);
  if (!rows.length) return <EmptyState title="No players yet" body="Add players from the Admin panel." />;
  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">Individual rankings</p>
        <h1 className="mt-1 text-3xl font-black">Players leaderboard</h1>
      </section>
      <PlayerLeaderboard rows={rows} />
    </div>
  );
}
