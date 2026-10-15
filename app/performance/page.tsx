import { Activity, ArrowRight, CalendarDays, Minus, Shield, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import { PerformanceFilters } from "@/components/PerformanceFilters";
import { RatingJourneyChart } from "@/components/RatingJourneyChart";
import { getMatches, getPlayers, getTournaments } from "@/lib/data";
import { teamLabel } from "@/lib/format";
import type { Match, Player, Tournament } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RatingMatch = {
  match: Match;
  before: number;
  change: number;
  after: number;
  result: "win" | "loss" | "draw";
  opponent: string;
  ownScore: number;
  opponentScore: number;
};

export default async function PerformancePage({ searchParams }: { searchParams: { player?: string; tournament?: string } }) {
  const [players, tournaments, matches] = await Promise.all([getPlayers(), getTournaments(), getMatches()]);
  const playerWithHistory = players.find((player) => matches.some((match) => eventFor(match, player.id)));
  const player = players.find((item) => item.id === searchParams.player) ?? playerWithHistory ?? players[0];

  if (!player) return <EmptyPerformance />;

  const tournamentOptions = tournaments
    .filter((tournament) => matches.some((match) => match.tournament_id === tournament.id && eventFor(match, player.id)))
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  const tournament = tournamentOptions.find((item) => item.id === searchParams.tournament) ?? tournamentOptions[0];
  const ratingMatches = tournament ? buildRatingMatches(player, tournament, matches) : [];
  const startRating = ratingMatches[0]?.before;
  const endRating = ratingMatches.at(-1)?.after;
  const totalChange = ratingMatches.reduce((total, item) => total + item.change, 0);
  const wins = ratingMatches.filter((item) => item.result === "win").length;
  const losses = ratingMatches.filter((item) => item.result === "loss").length;
  const draws = ratingMatches.filter((item) => item.result === "draw").length;
  const chartValues = ratingMatches.length ? [ratingMatches[0].before, ...ratingMatches.map((item) => item.after)] : [];

  return (
    <div className="space-y-5">
      <section className="court-panel rounded-lg p-5 text-white">
        <div className="flex items-center gap-4">
          <PlayerAvatar player={player} size={70} />
          <div><p className="text-sm font-bold uppercase text-limeball">Performance lab</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{player.name}&apos;s rating journey</h1><p className="mt-1 text-sm font-semibold text-slate-300">See exactly how every tournament result moved the rating.</p></div>
        </div>
      </section>

      <section className="sport-card p-4 sm:p-5">
        <PerformanceFilters players={players} tournaments={tournamentOptions} playerId={player.id} tournamentId={tournament?.id ?? ""} />
      </section>

      {!tournament || !ratingMatches.length ? (
        <div className="sport-card p-8 text-center"><Activity className="mx-auto h-9 w-9 text-slate-400" /><h2 className="mt-3 text-lg font-black text-slate-950">No rating journey yet</h2><p className="mt-1 text-sm font-semibold text-slate-500">This player needs a completed rated match before tournament analysis appears.</p></div>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-court" /><div><h2 className="font-black text-slate-950">{tournament.name}</h2><p className="text-xs font-semibold text-slate-500">{formatDate(tournament.start_date)} · {ratingMatches.length} rated matches</p></div></div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Metric label="Starting rating" value={startRating!.toFixed(2)} icon={Shield} />
              <Metric label="Finishing rating" value={endRating!.toFixed(2)} icon={Trophy} />
              <Metric label="Tournament change" value={signed(totalChange)} icon={totalChange >= 0 ? TrendingUp : TrendingDown} tone={totalChange > 0 ? "positive" : totalChange < 0 ? "negative" : "neutral"} />
              <Metric label="Match record" value={`${wins}W ${draws}D ${losses}L`} icon={Activity} />
            </div>
          </section>

          <RatingJourneyChart values={chartValues} />

          <section>
            <h2 className="section-title">Match impact</h2>
            <div className="space-y-3">
              {ratingMatches.map((item, index) => <RatingMatchCard key={item.match.id} item={item} index={index} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function buildRatingMatches(player: Player, tournament: Tournament, matches: Match[]) {
  return matches
    .filter((match) => match.tournament_id === tournament.id && eventFor(match, player.id))
    .sort((a, b) => compareRatingSequence(a, b, player.id))
    .map((match): RatingMatch => {
      const event = eventFor(match, player.id)!;
      const onTeamOne = match.team_1?.player_1_id === player.id || match.team_1?.player_2_id === player.id;
      const ownTeam = onTeamOne ? match.team_1 : match.team_2;
      const opponentTeam = onTeamOne ? match.team_2 : match.team_1;
      const ownScore = Number(onTeamOne ? match.team_1_games : match.team_2_games);
      const opponentScore = Number(onTeamOne ? match.team_2_games : match.team_1_games);
      const result = match.winner_team_id == null ? "draw" : match.winner_team_id === ownTeam?.id ? "win" : "loss";
      return { match, before: Number(event.rating_before), change: Number(event.rating_change), after: Number(event.rating_after), result, opponent: teamLabel(opponentTeam), ownScore, opponentScore };
    });
}

function RatingMatchCard({ item, index }: { item: RatingMatch; index: number }) {
  const tone = item.change > 0 ? "text-emerald-700 bg-emerald-50" : item.change < 0 ? "text-red-700 bg-red-50" : "text-slate-600 bg-slate-100";
  const resultTone = item.result === "win" ? "bg-emerald-600 text-white" : item.result === "loss" ? "bg-red-500 text-white" : "bg-slate-500 text-white";
  return (
    <article className="sport-card grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-md text-xs font-black uppercase ${resultTone}`}>{item.result === "win" ? "W" : item.result === "loss" ? "L" : "D"}</span>
        <div><p className="text-[10px] font-black uppercase text-slate-400">Match {index + 1} · {stageLabel(item.match.stage)}</p><p className="font-black text-slate-950">vs {item.opponent}</p><p className="text-xs font-bold text-slate-500">Score {item.ownScore}-{item.opponentScore}{item.match.round_number ? ` · Round ${item.match.round_number}` : ""}</p></div>
      </div>
      <div className="flex items-center justify-center gap-2 text-sm font-black text-slate-600">
        <span>{item.before.toFixed(3)}</span><ArrowRight className="h-4 w-4 text-slate-400" /><span>{item.after.toFixed(3)}</span>
      </div>
      <span className={`justify-self-start rounded-md px-3 py-2 text-sm font-black sm:justify-self-end ${tone}`}>{signed(item.change)}</span>
    </article>
  );
}

function Metric({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string; icon: typeof Activity; tone?: "positive" | "negative" | "neutral" }) {
  const color = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-slate-950";
  return <div className="stat-card sport-card p-4"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><p className="text-[10px] font-black uppercase sm:text-xs">{label}</p></div><p className={`mt-2 text-xl font-black sm:text-2xl ${color}`}>{value}</p></div>;
}

function eventFor(match: Match, playerId: string) {
  return match.rating_events?.find((event) => event.player_id === playerId);
}

function compareRatingSequence(a: Match, b: Match, playerId: string) {
  const firstEvent = eventFor(a, playerId);
  const secondEvent = eventFor(b, playerId);
  const firstSequence = firstEvent?.rated_matches_before;
  const secondSequence = secondEvent?.rated_matches_before;

  if (firstSequence != null && secondSequence != null && firstSequence !== secondSequence) {
    return firstSequence - secondSequence;
  }

  const eventTimeDifference = new Date(firstEvent?.created_at ?? 0).getTime() - new Date(secondEvent?.created_at ?? 0).getTime();
  if (eventTimeDifference) return eventTimeDifference;

  return new Date(a.played_at ?? a.submitted_at ?? a.created_at).getTime()
    - new Date(b.played_at ?? b.submitted_at ?? b.created_at).getTime();
}

function signed(value: number) {
  const rounded = value.toFixed(3);
  return value > 0 ? `+${rounded}` : rounded;
}

function stageLabel(stage: Match["stage"]) {
  return stage === "third_place" ? "Third place" : stage.charAt(0).toUpperCase() + stage.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function EmptyPerformance() {
  return <div className="sport-card p-8 text-center"><Minus className="mx-auto h-9 w-9 text-slate-400" /><h1 className="mt-3 text-xl font-black">No player profiles yet</h1></div>;
}
