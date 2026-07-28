import { AdminPanel } from "@/components/AdminPanel";
import { getCourtStreams, getMatches, getPlayers, getTeams, getTournamentTeams, getTournaments } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const [players, teams, tournaments, tournamentTeams, matches, courtStreams] = await Promise.all([
    getPlayers(),
    getTeams(),
    getTournaments(),
    getTournamentTeams(),
    getMatches(),
    getCourtStreams()
  ]);

  return (
    <AdminPanel
      configured={isSupabaseConfigured}
      players={players}
      teams={teams}
      tournaments={tournaments}
      tournamentTeams={tournamentTeams}
      matches={matches}
      courtStreams={courtStreams}
    />
  );
}
