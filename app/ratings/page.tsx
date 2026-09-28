import { LockKeyhole, Star } from "lucide-react";
import { PlayerRatingVotePanel } from "@/components/PlayerRatingVotePanel";
import { getPlayers } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RatingsPage() {
  const players = await getPlayers();
  return (
    <div className="space-y-5">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">Community calibration</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Rate the players you know</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300">Give an honest rating from 1 to 10. Skip anyone you do not know well enough. Your individual ratings are never shown to other players.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-200">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5"><Star className="h-3.5 w-3.5 text-limeball" /> 1 = beginner, 10 = exceptional</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5"><LockKeyhole className="h-3.5 w-3.5 text-limeball" /> Private and editable while open</span>
        </div>
      </section>
      <PlayerRatingVotePanel players={players} />
    </div>
  );
}
