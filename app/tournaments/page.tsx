import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { TeamAvatar } from "@/components/Avatar";
import { getMatches, getTournamentTeams, getTournaments } from "@/lib/data";
import { teamLabel } from "@/lib/format";

export default async function TournamentHistoryPage() {
  const [tournaments, allTournamentTeams, matches] = await Promise.all([getTournaments(), getTournamentTeams(), getMatches()]);
  const completed = tournaments.filter((tournament) => tournament.status === "completed");
  if (!completed.length) return <EmptyState title="No completed tournaments yet" body="Close a tournament in Admin and it will appear here." />;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black text-slate-950">Tournament history</h1>
      <div className="grid gap-3">
        {completed.map((tournament) => {
          const final = matches.find((match) => match.tournament_id === tournament.id && match.stage === "final");
          const teamCount = allTournamentTeams.filter((item) => item.tournament_id === tournament.id).length;
          return (
            <Link href={`/tournaments/${tournament.id}`} key={tournament.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-4">
                <TeamAvatar team={tournament.champion} size={58} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-500">{new Date(tournament.start_date).toLocaleDateString()}</p>
                  <h2 className="truncate text-xl font-black text-slate-950">{tournament.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{teamCount} teams</p>
                  <p className="mt-2 text-sm"><b>Champion:</b> {teamLabel(tournament.champion)}</p>
                  <p className="text-sm"><b>Runner-up:</b> {teamLabel(tournament.runner_up)}</p>
                  <p className="text-sm"><b>Final:</b> {final ? `${final.team_1_games}-${final.team_2_games}` : "TBD"}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
