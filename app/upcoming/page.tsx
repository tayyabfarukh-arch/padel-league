import { EmptyState } from "@/components/EmptyState";
import { TournamentExperience } from "@/components/TournamentExperience";
import { TournamentSwitcher } from "@/components/TournamentSwitcher";
import { getTournaments } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UpcomingTournamentPage({ searchParams }: { searchParams?: { tournament?: string } }) {
  const tournaments = await getTournaments();
  const upcoming = tournaments
    .filter((item) => item.status === "upcoming")
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at));
  const tournament = upcoming.find((item) => item.id === searchParams?.tournament) ?? upcoming[0];

  if (!tournament) {
    return (
      <EmptyState
        title="No upcoming tournament scheduled"
        body="When a tournament is created with Upcoming status, its standings and match schedule will appear here."
      />
    );
  }

  return (
    <div className="space-y-5">
      {upcoming.length > 1 ? <TournamentSwitcher tournaments={upcoming} selectedId={tournament.id} basePath="/upcoming" status="upcoming" /> : null}
      <TournamentExperience tournament={tournament} allowScoreEntry={false} showRegistration />
    </div>
  );
}
