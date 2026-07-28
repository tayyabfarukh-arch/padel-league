import { EmptyState } from "@/components/EmptyState";
import { ScoreEntryPanel } from "@/components/ScoreEntryPanel";
import { getMatches, getTournaments } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ScoresPage() {
  const tournaments = await getTournaments();
  const tournament = tournaments.find((item) => item.status === "active");
  if (!tournament) {
    return <EmptyState title="Score entry is not open" body="The Admin needs to set the tournament status to Active first." />;
  }
  const matches = await getMatches(tournament.id);

  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">Tournament day</p>
        <h1 className="mt-1 text-3xl font-black">Submit scores</h1>
        <p className="mt-2 text-sm text-slate-300">{tournament.name} | Select a match, enter the result, and submit.</p>
      </section>
      <ScoreEntryPanel tournament={tournament} matches={matches} />
    </div>
  );
}
