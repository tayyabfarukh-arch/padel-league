import { EmptyState } from "@/components/EmptyState";
import { PredictionPanel } from "@/components/PredictionPanel";
import { getPredictions, getTournamentTeams, getTournaments } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PredictionsPage() {
  const [allTournaments, tournamentTeams, predictions] = await Promise.all([
    getTournaments(),
    getTournamentTeams(),
    getPredictions()
  ]);
  const tournaments = allTournaments.filter((item) => item.status !== "completed" && item.tournament_format !== "singles_americano");
  if (!tournaments.length) {
    return <EmptyState title="No prediction available" body="Predictions appear after the Admin creates an upcoming tournament." />;
  }

  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">Simple tournament vote</p>
        <h1 className="mt-1 text-3xl font-black">Tournament predictions</h1>
        <p className="mt-2 text-sm text-slate-300">No sign-in required. Vote before the tournament becomes active.</p>
      </section>
      <PredictionPanel tournaments={tournaments} tournamentTeams={tournamentTeams} predictions={predictions} />
    </div>
  );
}
