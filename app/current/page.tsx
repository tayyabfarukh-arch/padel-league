import { EmptyState } from "@/components/EmptyState";
import { TournamentExperience } from "@/components/TournamentExperience";
import { TournamentSwitcher } from "@/components/TournamentSwitcher";
import { getTournaments } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CurrentTournamentPage({ searchParams }: { searchParams?: { tournament?: string } }) {
  const tournaments = await getTournaments();
  const active = tournaments
    .filter((item) => item.status === "active")
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at));
  const tournament = active.find((item) => item.id === searchParams?.tournament) ?? active[0];
  if (!tournament) return <EmptyState title="No active tournament" body="Open Admin, select a tournament, and change its status to Active." />;

  return (
    <div className="space-y-5">
      {active.length > 1 ? <TournamentSwitcher tournaments={active} selectedId={tournament.id} basePath="/current" status="active" /> : null}
      <TournamentExperience tournament={tournament} allowScoreEntry />
    </div>
  );
}
