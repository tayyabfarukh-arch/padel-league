import { Award } from "lucide-react";
import { AwardsPanel } from "@/components/AwardsPanel";
import { getAwardCycles, getPlayers, getPublishedAwardVoteTotals } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AwardsPage() {
  const [cycles, players, publishedVoteTotals] = await Promise.all([getAwardCycles(), getPlayers(true), getPublishedAwardVoteTotals()]);
  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg p-5 text-white">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-md bg-limeball text-ink"><Award className="h-6 w-6" /></span><div><p className="text-sm font-bold uppercase text-limeball">Community recognition</p><h1 className="mt-1 text-3xl font-black">Player awards</h1></div></div>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">Weekly recognition selected by Admin and monthly awards decided privately by verified player voting.</p>
      </section>
      <AwardsPanel cycles={cycles} players={players} publishedVoteTotals={publishedVoteTotals} />
    </div>
  );
}
