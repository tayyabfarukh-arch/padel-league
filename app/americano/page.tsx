import Link from "next/link";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { getTournaments } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AmericanoPage() {
  const tournaments = (await getTournaments()).filter((item) => item.tournament_format !== "regular");
  if (!tournaments.length) {
    return <EmptyState title="No Americano tournaments yet" body="Create one from Admin, then its schedule and standings will appear here." />;
  }

  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg px-4 py-3 text-white">
        <p className="text-[10px] font-black uppercase text-limeball">Americano</p>
        <h1 className="mt-0.5 text-xl font-black md:text-2xl">Americano tournaments</h1>
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        {tournaments.map((tournament) => (
          <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="sport-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-limeball text-ink"><Trophy className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase text-court">{tournament.status} | {tournament.tournament_format === "singles_americano" ? "Singles Americano" : "Team Americano"}</span>
              <span className="block truncate text-base font-black text-slate-950">{tournament.name}</span>
              <span className="block text-xs font-semibold text-slate-500">{tournament.americano_target_points} total points | {tournament.americano_round_count} rounds</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
