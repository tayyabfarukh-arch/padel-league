import { AdminPanel } from "@/components/AdminPanel";
import { getMatches, getPlayers, getTeams, getTournamentTeams, getTournaments } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function AdminPage() {
  const [players, teams, tournaments, tournamentTeams, matches] = await Promise.all([
    getPlayers(),
    getTeams(),
    getTournaments(),
    getTournamentTeams(),
    getMatches()
  ]);

  return (
    <AdminPanel
      configured={isSupabaseConfigured}
      players={players}
      teams={teams}
      tournaments={tournaments}
      tournamentTeams={tournamentTeams}
      matches={matches}
    />
  );
}
