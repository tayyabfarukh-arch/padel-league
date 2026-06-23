import Link from "next/link";
import { Crown, Flame, Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PlayerLeaderboard, TeamLeaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";
import { TeamAvatar } from "@/components/Avatar";
import { getMatches, getPlayers, getTournamentTeams, getTournaments } from "@/lib/data";
import { teamLabel } from "@/lib/format";
import { calculatePlayerStats, calculateTeamStats } from "@/lib/scoring";
import { playersFromTeams, teamsFromTournamentTeams } from "@/lib/scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [players, tournamentTeams, tournaments, matches] = await Promise.all([
    getPlayers(),
    getTournamentTeams(),
    getTournaments(),
    getMatches()
  ]);
  const teams = teamsFromTournamentTeams(tournamentTeams);
  const scopedPlayers = playersFromTeams(players, teams);
  const active = tournaments.find((tournament) => tournament.status === "active");
  const completed = tournaments.filter((tournament) => tournament.status === "completed");
  const lastChampion = completed[0]?.champion;
  const teamStats = calculateTeamStats(teams, matches, tournaments);
  const playerStats = calculatePlayerStats(scopedPlayers, teams, matches, tournaments);
  const latestResults = matches.filter((match) => match.winner_team_id).slice(0, 3);
  const upcoming = matches.filter((match) => !match.winner_team_id).slice(0, 3);

  if (!tournaments.length && !teams.length && !players.length) {
    return <EmptyState title="Connect Supabase to start the league" body="Add your Supabase URL and anon key, then run the schema in supabase/schema.sql." />;
  }

  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg p-5 text-white shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-limeball px-3 py-1 text-xs font-black text-ink">
              <Flame className="h-3.5 w-3.5" /> Private doubles battle
            </p>
            <h1 className="text-3xl font-black md:text-5xl">{active?.name ?? "Padel night is waiting"}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              Race to 3 games, points by game difference, bragging rights by leaderboard.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 md:min-w-80">
            <div className="rounded-lg bg-white/10 p-3 text-center ring-1 ring-white/10">
              <p className="text-2xl font-black text-limeball">{teams.length}</p>
              <p className="text-xs font-bold text-slate-300">Teams</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 text-center ring-1 ring-white/10">
              <p className="text-2xl font-black text-limeball">{players.length}</p>
              <p className="text-xs font-bold text-slate-300">Players</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 text-center ring-1 ring-white/10">
              <p className="text-2xl font-black text-limeball">{matches.length}</p>
              <p className="text-xs font-bold text-slate-300">Matches</p>
            </div>
            <Link href="/current" className="btn-primary col-span-3 bg-limeball text-ink hover:bg-lime-300">
              View tournament
            </Link>
          </div>
        </div>
      </section>

      {lastChampion ? (
        <section className="sport-card border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-4">
            <TeamAvatar team={lastChampion} size={58} />
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase text-yellow-700">
                <Crown className="h-4 w-4" /> Last champion
              </p>
              <h2 className="text-xl font-black text-slate-950">{teamLabel(lastChampion)}</h2>
              <p className="text-sm text-slate-600">{completed[0]?.name}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="section-title">Top teams</h2>
          <TeamLeaderboard rows={teamStats} limit={5} />
        </section>
        <section>
          <h2 className="section-title">Top players</h2>
          <PlayerLeaderboard rows={playerStats} limit={5} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="section-title">Latest results</h2>
          <div className="space-y-3">{latestResults.map((match) => <MatchCard key={match.id} match={match} />)}</div>
        </section>
        <section>
          <h2 className="section-title">Upcoming matches</h2>
          <div className="space-y-3">{upcoming.map((match) => <MatchCard key={match.id} match={match} />)}</div>
        </section>
      </div>

      <section>
        <h2 className="section-title flex items-center gap-2">
          <Trophy className="h-5 w-5 text-court" /> Recent champions
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {completed.slice(0, 6).map((tournament) => (
            <Link href={`/tournaments/${tournament.id}`} key={tournament.id} className="sport-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm font-bold text-slate-500">{new Date(tournament.start_date).toLocaleDateString()}</p>
              <p className="mt-1 font-black text-slate-950">{tournament.name}</p>
              <p className="text-sm text-slate-600">{teamLabel(tournament.champion)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
