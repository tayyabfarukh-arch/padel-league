import { EmptyState } from "@/components/EmptyState";
import { TournamentDashboard } from "@/components/TournamentDashboard";
import { getCourtStreams, getMatches, getTournamentTeams, getTournaments } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UpcomingTournamentPage() {
  const tournaments = await getTournaments();
  const tournament = tournaments
    .filter((item) => item.status === "upcoming")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  if (!tournament) {
    return (
      <EmptyState
        title="No upcoming tournament scheduled"
        body="When a tournament is created with Upcoming status, its standings and match schedule will appear here."
      />
    );
  }

  const [tournamentTeams, matches, courtStreams] = await Promise.all([
    getTournamentTeams(tournament.id),
    getMatches(tournament.id),
    getCourtStreams(tournament.id)
  ]);

  return (
    <TournamentDashboard
      tournament={tournament}
      tournamentTeams={tournamentTeams}
      matches={matches}
      courtStreams={courtStreams}
      allowScoreEntry={false}
    />
  );
}
