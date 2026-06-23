import { AdminPanel } from "@/components/AdminPanel";
import { getAmericanoMatches, getMatches, getPlayers, getTeams, getTournamentPlayers, getTournamentTeams, getTournaments } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const [players, teams, tournaments, tournamentTeams, matches, tournamentPlayers, americanoMatches] = await Promise.all([
    getPlayers(),
    getTeams(),
    getTournaments(),
    getTournamentTeams(),
    getMatches(),
    getTournamentPlayers(),
    getAmericanoMatches()
  ]);

  return (
    <AdminPanel
      configured={isSupabaseConfigured}
      players={players}
      teams={teams}
      tournaments={tournaments}
      tournamentTeams={tournamentTeams}
      matches={matches}
      tournamentPlayers={tournamentPlayers}
      americanoMatches={americanoMatches}
    />
  );
}
