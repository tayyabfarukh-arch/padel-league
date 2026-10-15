import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, Award, CheckCircle2, Target, Trophy, XCircle } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { StatsGrid } from "@/components/StatsGrid";
import { getCourtStreams, getMatches, getPlayerAwardWinners, getPlayers, getPredictions, getTeams, getTournaments } from "@/lib/data";
import { calculatePlayerStats } from "@/lib/scoring";
import { courtStreamUrl, teamLabel } from "@/lib/format";
import { awardTone, formatAwardPeriod } from "@/lib/awards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const [players, teams, matches, tournaments, courtStreams, awards, predictions] = await Promise.all([
    getPlayers(),
    getTeams(true),
    getMatches(),
    getTournaments(),
    getCourtStreams(),
    getPlayerAwardWinners(params.id),
    getPredictions()
  ]);
  const player = players.find((item) => item.id === params.id);
  if (!player) notFound();
  const stats = calculatePlayerStats(players, teams, matches, tournaments).find((item) => item.player.id === player.id)!;
  const playerTeams = teams.filter((team) => team.player_1_id === player.id || team.player_2_id === player.id);
  const teamIds = new Set(playerTeams.map((team) => team.id));
  const recentMatches = matches.filter((match) => teamIds.has(match.team_1_id) || teamIds.has(match.team_2_id)).slice(0, 8);
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

  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg p-5 text-white">
        <PlayerAvatar player={player} size={84} />
        <p className="mt-4 text-sm font-bold uppercase text-limeball">Player profile</p>
        <div className="flex flex-wrap items-end justify-between gap-3"><h1 className="mt-1 text-3xl font-black">{player.name}</h1><Link href={`/performance?player=${player.id}`} className="btn-primary"><Activity className="h-4 w-4" /> Performance analysis</Link></div>
      </section>
      <StatsGrid stats={stats} />
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
            <div key={team.id} className="sport-card p-4">
              <p className="font-black text-slate-950">{teamLabel(team)}</p>
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
