import Link from "next/link";
import { Crown, Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PlayerLeaderboard, TeamLeaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";
import { TeamAvatar } from "@/components/Avatar";
import { getAmericanoMatches, getCourtStreams, getMatches, getPlayers, getTournamentPlayers, getTournamentTeams, getTournaments } from "@/lib/data";
import { courtStreamUrl, teamLabel } from "@/lib/format";
import { calculatePlayerStats, calculateTeamStats } from "@/lib/scoring";
import { playersFromTeams, teamsFromTournamentTeams } from "@/lib/scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [players, tournamentPlayers, tournamentTeams, tournaments, matches, americanoMatches, courtStreams] = await Promise.all([
    getPlayers(),
    getTournamentPlayers(),
    getTournamentTeams(),
    getTournaments(),
    getMatches(),
    getAmericanoMatches(),
    getCourtStreams()
  ]);
  const regularTournamentIds = new Set(tournaments.filter((item) => item.tournament_format === "regular").map((item) => item.id));
  const regularTournamentTeams = tournamentTeams.filter((item) => regularTournamentIds.has(item.tournament_id));
  const teams = teamsFromTournamentTeams(regularTournamentTeams);
  const scopedPlayers = playersFromTeams(players, teams);
  const active = tournaments.find((tournament) => tournament.status === "active");
  const heroTournamentTeams = active
    ? tournamentTeams.filter((entry) => entry.tournament_id === active.id)
    : tournamentTeams;
  const heroTeams = teamsFromTournamentTeams(heroTournamentTeams);
  const heroPlayers = playersFromTeams(players, heroTeams);
  const heroMatches = active
    ? matches.filter((match) => match.tournament_id === active.id)
    : matches;
  const completed = tournaments.filter((tournament) => tournament.status === "completed" && tournament.tournament_format === "regular");
  const lastChampion = completed[0]?.champion;
  const teamStats = calculateTeamStats(teams, matches, tournaments);
  const playerStats = calculatePlayerStats(scopedPlayers, teams, matches, tournaments);
  const latestResults = matches.filter((match) => match.winner_team_id).slice(0, 3);
  const upcoming = matches.filter((match) => !match.winner_team_id).slice(0, 3);
  const activeIsAmericano = Boolean(active && active.tournament_format !== "regular");
  const activeAmericanoMatches = active ? americanoMatches.filter((match) => match.tournament_id === active.id) : [];
  const activeAmericanoPlayers = active ? tournamentPlayers.filter((item) => item.tournament_id === active.id) : [];
  const heroTeamCount = active?.tournament_format === "singles_americano" ? 0 : heroTeams.length;
  const heroPlayerCount = active?.tournament_format === "singles_americano" ? activeAmericanoPlayers.length : heroPlayers.length;
  const heroMatchCount = activeIsAmericano ? activeAmericanoMatches.length : heroMatches.length;

  if (!tournaments.length && !teams.length && !players.length) {
    return <EmptyState title="Connect Supabase to start the league" body="Add your Supabase URL and anon key, then run the schema in supabase/schema.sql." />;
  }

  return (
    <div className="space-y-6">
      <section className="court-panel home-hero rounded-lg p-4 text-white md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-limeball">
              {active ? "Active tournament" : "Padel League"}
            </p>
            <h1 className="mt-0.5 truncate text-xl font-black md:text-2xl">
              {active?.name ?? "Padel night is waiting"}
            </h1>
            {active ? (
              <p className="mt-1.5 text-xs font-bold text-slate-300">
                {activeIsAmericano
                  ? `${active.tournament_format === "singles_americano" ? "Singles" : "Team"} Americano | ${active.americano_target_points} total points per match`
                  : `Group: ${active.group_target_points} total points | Final: race to ${active.final_target_games}`}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-[64px_64px_64px_auto]">
            <div className="rounded-md bg-white/10 px-2 py-1.5 text-center ring-1 ring-white/10">
              <p className="text-lg font-black leading-none text-limeball">{heroTeamCount}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-300">Teams</p>
            </div>
            <div className="rounded-md bg-white/10 px-2 py-1.5 text-center ring-1 ring-white/10">
              <p className="text-lg font-black leading-none text-limeball">{heroPlayerCount}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-300">Players</p>
            </div>
            <div className="rounded-md bg-white/10 px-2 py-1.5 text-center ring-1 ring-white/10">
              <p className="text-lg font-black leading-none text-limeball">{heroMatchCount}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-300">Matches</p>
            </div>
            <Link href="/current" className="btn-primary col-span-3 bg-limeball text-ink hover:bg-lime-300 md:col-span-1">
              View
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
          <div className="space-y-3">
            {latestResults.map((match) => (
              <MatchCard key={match.id} match={match} youtubeUrl={courtStreamUrl(match, courtStreams)} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="section-title">Upcoming matches</h2>
          <div className="space-y-3">
            {upcoming.map((match) => (
              <MatchCard key={match.id} match={match} youtubeUrl={courtStreamUrl(match, courtStreams)} />
            ))}
          </div>
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
