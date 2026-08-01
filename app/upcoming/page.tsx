import { EmptyState } from "@/components/EmptyState";
import { TournamentExperience } from "@/components/TournamentExperience";
import { getTournaments } from "@/lib/data";

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

  return <TournamentExperience tournament={tournament} allowScoreEntry={false} />;
}
