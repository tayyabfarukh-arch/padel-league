import { Crown } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MatchCard } from "@/components/MatchCard";
import { TeamAvatar } from "@/components/Avatar";
import { TeamLeaderboard } from "@/components/Leaderboard";
import { getMatches, getTournamentTeams, getTournaments } from "@/lib/data";
import { calculateTeamStats } from "@/lib/scoring";
import { stageLabel, teamLabel } from "@/lib/format";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CurrentTournamentPage() {
  const tournaments = await getTournaments();
  const tournament = tournaments.find((item) => item.status === "active") ?? tournaments.find((item) => item.status === "upcoming");
  if (!tournament) return <EmptyState title="No current tournament" body="Create a tournament in Admin and set it active." />;

  const [tournamentTeams, matches] = await Promise.all([getTournamentTeams(tournament.id), getMatches(tournament.id)]);
  const teams = tournamentTeams.map((item) => item.team).filter((team): team is Team => Boolean(team));
  const standings = calculateTeamStats(teams, matches, [tournament]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-slate-950 p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">{tournament.status}</p>
        <h1 className="mt-1 text-3xl font-black">{tournament.name}</h1>
        <p className="mt-2 text-sm text-slate-300">{teams.length} teams | {matches.length} matches</p>
      </section>

      {tournament.champion ? (
        <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-4">
            <TeamAvatar team={tournament.champion} size={64} />
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase text-yellow-700">
                <Crown className="h-4 w-4" /> Champion
              </p>
              <h2 className="text-xl font-black text-slate-950">{teamLabel(tournament.champion)}</h2>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">Teams</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <TeamAvatar team={team} size={48} />
              <p className="font-bold text-slate-950">{teamLabel(team)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">Group standings</h2>
        <TeamLeaderboard rows={standings} />
      </section>

      {(["group", "semifinal", "final", "third_place"] as const).map((stage) => {
        const stageMatches = matches.filter((match) => match.stage === stage);
        if (!stageMatches.length) return null;
        return (
          <section key={stage}>
            <h2 className="mb-3 text-lg font-black text-slate-950">{stageLabel(stage)}</h2>
            <div className="grid gap-3 md:grid-cols-2">{stageMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
