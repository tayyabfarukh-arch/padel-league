import Link from "next/link";
import { Activity, Swords, Trophy } from "lucide-react";

export type PerformanceView = "journey" | "wrapped" | "rivals";

export function PerformanceViewTabs({ active, playerId, tournamentId }: { active: PerformanceView; playerId: string; tournamentId: string }) {
  const tabs = [
    { id: "journey" as const, label: "Rating journey", icon: Activity },
    { id: "wrapped" as const, label: "Tournament wrapped", icon: Trophy },
    { id: "rivals" as const, label: "Rivalry hub", icon: Swords }
  ];

  return (
    <nav className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" aria-label="Performance views">
      {tabs.map(({ id, label, icon: Icon }) => {
        const query = new URLSearchParams({ player: playerId, view: id });
        if (tournamentId) query.set("tournament", tournamentId);
        return (
          <Link key={id} href={`/performance?${query.toString()}`} className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-xs font-black transition sm:text-sm ${active === id ? "bg-white text-court shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"}`}>
            <Icon className="h-4 w-4 shrink-0" /><span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
