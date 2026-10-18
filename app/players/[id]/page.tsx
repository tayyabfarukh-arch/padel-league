import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, Award, CheckCircle2, ShieldCheck, Target, Trophy, XCircle } from "lucide-react";
import { PlayerAvatar, TeamAvatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { StatsGrid } from "@/components/StatsGrid";
import { getCourtStreams, getMatches, getPlayerAwardWinners, getPlayerRatings, getPlayers, getPredictions, getTeams, getTournaments } from "@/lib/data";
import { calculatePlayerStats } from "@/lib/scoring";
import { courtStreamUrl, teamLabel } from "@/lib/format";
import { awardTone, formatAwardPeriod } from "@/lib/awards";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const [players, teams, matches, tournaments, courtStreams, awards, predictions, ratings] = await Promise.all([
    getPlayers(),
    getTeams(true),
    getMatches(),
    getTournaments(),
    getCourtStreams(),
    getPlayerAwardWinners(params.id),
    getPredictions(),
    getPlayerRatings()
  ]);
  const player = players.find((item) => item.id === params.id);
  if (!player) notFound();
  const stats = calculatePlayerStats(players, teams, matches, tournaments).find((item) => item.player.id === player.id)!;
  const publishedRating = ratings.find((rating) => rating.player_id === player.id);
  const playerTeamMap = new Map(
    teams
      .filter((team) => team.player_1_id === player.id || team.player_2_id === player.id)
      .map((team) => [team.id, team])
  );
  const recentMatches = matches.filter((match) => {
    const playedForTeamOne = match.team_1?.player_1_id === player.id || match.team_1?.player_2_id === player.id;
    const playedForTeamTwo = match.team_2?.player_1_id === player.id || match.team_2?.player_2_id === player.id;
    if (playedForTeamOne && match.team_1) playerTeamMap.set(match.team_1.id, match.team_1);
    if (playedForTeamTwo && match.team_2) playerTeamMap.set(match.team_2.id, match.team_2);
    return (playedForTeamOne || playedForTeamTwo) && match.team_1_games !== null && match.team_2_games !== null;
  }).sort((a, b) => matchTime(b) - matchTime(a)).slice(0, 8);
  const playerTeams = [...playerTeamMap.values()];
  const completedChampions = new Map(
    tournaments
      .filter((tournament) => tournament.status === "completed" && tournament.champion_team_id)
      .map((tournament) => [tournament.id, tournament.champion_team_id!])
  );
  const completedPredictions = player.user_id
    ? predictions.filter((prediction) => prediction.voter_user_id === player.user_id && completedChampions.has(prediction.tournament_id))
    : [];
  const correctPredictions = completedPredictions.filter(
    (prediction) => prediction.predicted_team_id === completedChampions.get(prediction.tournament_id)
  ).length;
  const wrongPredictions = completedPredictions.length - correctPredictions;
  const predictionAccuracy = completedPredictions.length
    ? Math.round((correctPredictions / completedPredictions.length) * 100)
    : 0;
  const recentForm = recentMatches.slice(0, 6).map((match) => playerResult(match, player.id));

  return (
    <div className="space-y-6">
      <section className="profile-hero court-panel rounded-lg p-5 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <PlayerAvatar player={player} size={88} />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-limeball">PPC player profile</p>
              <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">{player.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-300"><ShieldCheck className="h-4 w-4 text-limeball" /> {player.user_id ? "Claimed community profile" : "Community player"}</p>
            </div>
          </div>
          <Link href={`/performance?player=${player.id}`} className="btn-primary shrink-0"><Activity className="h-4 w-4" /> Performance analysis</Link>
        </div>
        <div className="profile-snapshot mt-5 grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 pt-4">
          <HeroMetric label="Rating" value={publishedRating ? publishedRating.rating.toFixed(2) : "--"} />
          <HeroMetric label="Wins" value={String(stats.wins)} />
          <HeroMetric label="Win rate" value={stats.played ? `${Math.round((stats.wins / stats.played) * 100)}%` : "0%"} />
          <HeroMetric label="Titles" value={String(stats.titles)} />
        </div>
      </section>
      <StatsGrid stats={stats} />
      <section className="sport-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div><p className="text-[10px] font-black uppercase text-court">Recent form</p><p className="text-sm font-bold text-slate-600">Latest completed matches, newest first</p></div>
        <div className="flex items-center gap-2">
          {recentForm.length ? recentForm.map((result, index) => <span key={`${result}-${index}`} className={`form-chip form-chip--${result.toLowerCase()}`}>{result}</span>) : <span className="text-sm font-semibold text-slate-400">No results yet</span>}
        </div>
      </section>
      <section>
        <h2 className="section-title">Prediction record</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <PredictionStat icon={CheckCircle2} label="Correct" value={String(correctPredictions)} tone="correct" />
          <PredictionStat icon={XCircle} label="Wrong" value={String(wrongPredictions)} tone="wrong" />
          <PredictionStat icon={Target} label="Accuracy" value={`${predictionAccuracy}%`} tone="accuracy" />
        </div>
        {!completedPredictions.length ? <p className="mt-2 text-xs font-semibold text-slate-500">No completed tournament predictions yet.</p> : null}
      </section>
      <section>
        <h2 className="section-title">Awards cabinet</h2>
        {awards.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {awards.map((winner) => {
              const category = winner.category;
              const cycle = category?.cycle;
              if (!category || !cycle) return null;
              return (
                <div key={winner.id} className={`flex items-center gap-3 rounded-lg border p-4 ${awardTone(category.award_key)}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white/70"><Trophy className="h-6 w-6" /></span>
                  <div className="min-w-0"><p className="truncate font-black">{category.name}</p><p className="text-xs font-bold opacity-70">{formatAwardPeriod(cycle)}</p><p className="mt-1 text-[10px] font-black uppercase opacity-60">{cycle.period_type} award</p></div>
                </div>
              );
            })}
          </div>
        ) : <div className="sport-card flex items-center gap-3 p-4 text-sm font-semibold text-slate-500"><Award className="h-5 w-5" /> No awards yet.</div>}
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        <PartnerCard label="Best partner" value={stats.bestPartner?.name} />
        <PartnerCard label="Most played partner" value={stats.mostPlayedPartner?.name} />
        <PartnerCard label="Most successful partner" value={stats.mostSuccessfulPartner?.name} />
      </section>
      <section>
        <h2 className="section-title">Team history</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {playerTeams.map((team) => (
            <div key={team.id} className="sport-card flex items-center gap-3 p-3">
              <TeamAvatar team={team} size={40} />
              <div className="min-w-0"><p className="truncate font-black text-slate-950">{teamLabel(team)}</p><p className="text-xs font-semibold text-slate-500">Team history</p></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="section-title">Recent matches</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {recentMatches.map((match) => (
            <MatchCard key={match.id} match={match} youtubeUrl={courtStreamUrl(match, courtStreams)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return <div className="px-2 text-center"><p className="text-[9px] font-black uppercase text-slate-400 sm:text-[10px]">{label}</p><p className="mt-1 text-lg font-black text-white sm:text-xl">{value}</p></div>;
}

function playerResult(match: Match, playerId: string) {
  const onTeamOne = match.team_1?.player_1_id === playerId || match.team_1?.player_2_id === playerId;
  const playerTeamId = onTeamOne ? match.team_1_id : match.team_2_id;
  if (!match.winner_team_id) return "D";
  return match.winner_team_id === playerTeamId ? "W" : "L";
}

function matchTime(match: { played_at: string | null; submitted_at: string | null; created_at: string }) {
  return new Date(match.played_at ?? match.submitted_at ?? match.created_at).getTime();
}

function PredictionStat({ icon: Icon, label, value, tone }: { icon: typeof Target; label: string; value: string; tone: "correct" | "wrong" | "accuracy" }) {
  const colors = tone === "correct"
    ? "bg-emerald-50 text-emerald-700"
    : tone === "wrong"
      ? "bg-red-50 text-red-700"
      : "bg-limeball/30 text-ink";
  return (
    <div className="sport-card flex min-w-0 items-center gap-2 p-3 sm:gap-3 sm:p-4">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md sm:h-11 sm:w-11 ${colors}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0"><p className="text-[10px] font-black uppercase text-slate-500 sm:text-xs">{label}</p><p className="text-lg font-black text-slate-950 sm:text-2xl">{value}</p></div>
    </div>
  );
}

function PartnerCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="sport-card p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value ?? "TBD"}</p>
    </div>
  );
}
