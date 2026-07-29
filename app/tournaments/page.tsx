import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { TournamentCover } from "@/components/Avatar";
import { getMatches, getTournamentTeams, getTournaments } from "@/lib/data";
import { teamLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TournamentHistoryPage() {
  const [tournaments, allTournamentTeams, matches] = await Promise.all([getTournaments(), getTournamentTeams(), getMatches()]);
  const completed = tournaments.filter((tournament) => tournament.status === "completed");
  if (!completed.length) return <EmptyState title="No completed tournaments yet" body="Close a tournament in Admin and it will appear here." />;

  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg px-4 py-3 text-white">
        <p className="text-[10px] font-black uppercase text-limeball">Archive</p>
        <h1 className="mt-0.5 text-xl font-black md:text-2xl">Tournament history</h1>
      </section>
      <div className="grid gap-2 md:grid-cols-2">
        {completed.map((tournament) => {
          const final = matches.find((match) => match.tournament_id === tournament.id && match.stage === "final");
          const teamCount = allTournamentTeams.filter((item) => item.tournament_id === tournament.id).length;
          return (
            <Link href={`/tournaments/${tournament.id}`} key={tournament.id} className="sport-card p-2 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="grid grid-cols-[80px_1fr] items-center gap-2.5">
                <TournamentCover
                  url={tournament.cover_image_url}
                  name={tournament.name}
                  width={80}
                  height={60}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-500">{new Date(tournament.start_date).toLocaleDateString()}</p>
                  <h2 className="truncate text-sm font-black text-slate-950">{tournament.name}</h2>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    {teamCount} teams | Final {final ? `${final.team_1_games}-${final.team_2_games}` : "TBD"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-700"><b>Champion:</b> {teamLabel(tournament.champion)}</p>
                  <p className="truncate text-[11px] text-slate-600"><b>Runner-up:</b> {teamLabel(tournament.runner_up)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
