import { EmptyState } from "@/components/EmptyState";
import { TournamentExperience } from "@/components/TournamentExperience";
import { getTournaments } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CurrentTournamentPage() {
  const tournaments = await getTournaments();
  const tournament = tournaments.find((item) => item.status === "active");
  if (!tournament) return <EmptyState title="No active tournament" body="Open Admin, select a tournament, and change its status to Active." />;

  return <TournamentExperience tournament={tournament} allowScoreEntry />;
}
