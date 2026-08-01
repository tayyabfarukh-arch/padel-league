import { AdminPanel } from "@/components/AdminPanel";
import { getAmericanoMatches, getCourtStreams, getMatches, getPlayers, getTeams, getTournamentPlayers, getTournamentTeams, getTournaments } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const [players, teams, tournaments, tournamentPlayers, tournamentTeams, matches, americanoMatches, courtStreams] = await Promise.all([
    getPlayers(),
    getTeams(),
    getTournaments(),
    getTournamentPlayers(),
    getTournamentTeams(),
    getMatches(),
    getAmericanoMatches(),
    getCourtStreams()
  ]);

  return (
    <AdminPanel
      configured={isSupabaseConfigured}
      players={players}
      teams={teams}
      tournaments={tournaments}
      tournamentPlayers={tournamentPlayers}
      tournamentTeams={tournamentTeams}
      matches={matches}
      americanoMatches={americanoMatches}
      courtStreams={courtStreams}
    />
  );
}
