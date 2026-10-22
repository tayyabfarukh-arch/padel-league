import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, Radio, Trophy } from "lucide-react";
import type { Tournament, TournamentStatus } from "@/lib/types";

export function TournamentSwitcher({
  tournaments,
  selectedId,
  basePath,
  status
}: {
  tournaments: Tournament[];
  selectedId: string;
  basePath: "/upcoming" | "/current";
  status: Extract<TournamentStatus, "upcoming" | "active">;
}) {
  const activeView = status === "active";

  return (
    <section className="sport-card overflow-hidden" aria-label={`${activeView ? "Active" : "Upcoming"} tournaments`}>
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${activeView ? "bg-red-50 text-red-600" : "bg-emerald-50 text-court"}`}>
          {activeView ? <Radio className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase text-court">Choose tournament</p>
          <h1 className="truncate text-base font-black text-slate-950">{activeView ? "Active tournaments" : "Upcoming tournaments"}</h1>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{tournaments.length}</span>
      </header>

      <nav className="divide-y divide-slate-100" aria-label="Tournament selection">
        {tournaments.map((tournament, index) => {
          const selected = tournament.id === selectedId;
          return (
            <Link
              key={tournament.id}
              href={`${basePath}?tournament=${encodeURIComponent(tournament.id)}`}
              aria-current={selected ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-3 transition sm:px-4 ${selected ? "bg-emerald-50/80" : "bg-white hover:bg-slate-50"}`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-black ${selected ? "bg-court text-white" : "bg-ink text-limeball"}`}>{index + 1}</span>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><Trophy className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black text-slate-950">{tournament.name}</span>
                <span className="block text-xs font-semibold text-slate-500">{formatTournamentDate(tournament.start_date)} · {formatTournamentType(tournament)}</span>
              </span>
              {selected ? <span className="hidden items-center gap-1 text-xs font-black text-court sm:flex"><CheckCircle2 className="h-4 w-4" /> Viewing</span> : null}
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

function formatTournamentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatTournamentType(tournament: Tournament) {
  return tournament.tournament_format === "singles_americano"
    ? "Singles Americano"
    : tournament.tournament_format === "team_americano"
      ? "Team Americano"
      : "Team tournament";
}
