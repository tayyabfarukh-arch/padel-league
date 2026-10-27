import { Activity, ArrowRight, CalendarDays, Crown, Minus, Shield, Sparkles, Star, Swords, Target, TrendingDown, TrendingUp, Trophy, UserRoundCheck } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import { PerformanceFilters } from "@/components/PerformanceFilters";
import { PerformanceViewTabs, type PerformanceView } from "@/components/PerformanceViewTabs";
import { RatingJourneyChart } from "@/components/RatingJourneyChart";
import { SharePerformanceButton } from "@/components/SharePerformanceButton";
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

type Rivalry = {
  player: Player;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  ratingChange: number;
  closestMargin: number;
  latestMatchAt: string;
};

export default async function PerformancePage({ searchParams }: { searchParams: { player?: string; tournament?: string; view?: string } }) {
  const [players, tournaments, matches] = await Promise.all([getPlayers(), getTournaments(), getMatches()]);
  const playerWithHistory = players.find((player) => matches.some((match) => eventFor(match, player.id)));
  const player = players.find((item) => item.id === searchParams.player) ?? playerWithHistory ?? players[0];

  if (!player) return <EmptyPerformance />;

  const tournamentOptions = tournaments
    .filter((tournament) => matches.some((match) => match.tournament_id === tournament.id && eventFor(match, player.id)))
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  const tournament = tournamentOptions.find((item) => item.id === searchParams.tournament) ?? tournamentOptions[0];
  const view: PerformanceView = searchParams.view === "wrapped" || searchParams.view === "rivals" ? searchParams.view : "journey";
  const ratingMatches = tournament ? buildRatingMatches(player, tournament, matches) : [];
  const startRating = ratingMatches[0]?.before;
  const endRating = ratingMatches.at(-1)?.after;
  const totalChange = ratingMatches.reduce((total, item) => total + item.change, 0);
  const wins = ratingMatches.filter((item) => item.result === "win").length;
  const losses = ratingMatches.filter((item) => item.result === "loss").length;
  const draws = ratingMatches.filter((item) => item.result === "draw").length;
  const chartValues = ratingMatches.length ? [ratingMatches[0].before, ...ratingMatches.map((item) => item.after)] : [];
  const wrapped = tournament ? buildTournamentWrapped(player, tournament, ratingMatches) : null;
  const rivalries = buildRivalries(player, players, matches);

  return (
    <div className="space-y-5">
      <section className="court-panel rounded-lg p-5 text-white">
        <div className="flex items-center gap-4">
          <PlayerAvatar player={player} size={70} />
          <div><p className="text-sm font-bold uppercase text-limeball">Performance lab</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{player.name}&apos;s rating journey</h1><p className="mt-1 text-sm font-semibold text-slate-300">See exactly how every tournament result moved the rating.</p></div>
        </div>
      </section>

      <section className="sport-card p-4 sm:p-5">
        <PerformanceFilters players={players} tournaments={tournamentOptions} playerId={player.id} tournamentId={tournament?.id ?? ""} view={view} />
      </section>

      <PerformanceViewTabs active={view} playerId={player.id} tournamentId={tournament?.id ?? ""} />

      {view !== "rivals" && (!tournament || !ratingMatches.length) ? (
        <div className="sport-card p-8 text-center"><Activity className="mx-auto h-9 w-9 text-slate-400" /><h2 className="mt-3 text-lg font-black text-slate-950">No rating journey yet</h2><p className="mt-1 text-sm font-semibold text-slate-500">This player needs a completed rated match before tournament analysis appears.</p></div>
      ) : view === "journey" && tournament ? (
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
      ) : view === "wrapped" && tournament && wrapped ? (
        <TournamentWrapped player={player} tournament={tournament} ratingMatches={ratingMatches} wrapped={wrapped} />
      ) : view === "rivals" ? <RivalryHub player={player} rivalries={rivalries} /> : null}
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

function TournamentWrapped({ player, tournament, ratingMatches, wrapped }: { player: Player; tournament: Tournament; ratingMatches: RatingMatch[]; wrapped: ReturnType<typeof buildTournamentWrapped> }) {
  const shareText = `${player.name}'s ${tournament.name} recap: ${wrapped.wins} wins, ${wrapped.losses} losses and ${signed(wrapped.ratingChange)} rating change.`;
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
        <div className="bg-ink px-5 py-5 text-white sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-black uppercase text-limeball">Tournament wrapped</p><h2 className="mt-1 text-2xl font-black">{tournament.name}</h2><p className="mt-1 text-sm font-semibold text-slate-300">{player.name}&apos;s complete tournament story</p></div>
            <SharePerformanceButton title={`${player.name}'s tournament recap`} text={shareText} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">
          <WrappedMetric label="Record" value={`${wrapped.wins}W ${wrapped.draws}D ${wrapped.losses}L`} />
          <WrappedMetric label="Win rate" value={`${wrapped.winRate}%`} />
          <WrappedMetric label="Rating movement" value={signed(wrapped.ratingChange)} tone={wrapped.ratingChange} />
          <WrappedMetric label="Best streak" value={`${wrapped.bestWinStreak} win${wrapped.bestWinStreak === 1 ? "" : "s"}`} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-court" /><h2 className="section-title mb-0">Your tournament highlights</h2></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Highlight icon={Crown} label="Tournament finish" value={wrapped.finish} detail={wrapped.finishDetail} />
          <Highlight icon={UserRoundCheck} label="Top partner" value={wrapped.favoritePartner?.player.name ?? "No partner data"} detail={wrapped.favoritePartner ? `${wrapped.favoritePartner.wins} wins in ${wrapped.favoritePartner.matches} matches together` : "Play a completed match to unlock this highlight"} />
          <Highlight icon={Star} label="Best rating result" value={wrapped.bestWin ? `vs ${wrapped.bestWin.opponent}` : "No win recorded"} detail={wrapped.bestWin ? `${wrapped.bestWin.ownScore}-${wrapped.bestWin.opponentScore} · ${signed(wrapped.bestWin.change)}` : "Your first win will appear here"} />
          <Highlight icon={Target} label="Closest battle" value={wrapped.closestMatch ? `vs ${wrapped.closestMatch.opponent}` : "No match recorded"} detail={wrapped.closestMatch ? `${wrapped.closestMatch.result.toUpperCase()} · ${wrapped.closestMatch.ownScore}-${wrapped.closestMatch.opponentScore}` : "Complete a match to unlock this highlight"} />
        </div>
      </section>

      <RatingJourneyChart values={[ratingMatches[0].before, ...ratingMatches.map((item) => item.after)]} />
    </div>
  );
}

function RivalryHub({ player, rivalries }: { player: Player; rivalries: Rivalry[] }) {
  const top = rivalries[0];
  return (
    <div className="space-y-5">
      <section className="court-panel rounded-lg p-5 text-white">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-md bg-limeball text-ink"><Swords className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase text-limeball">Rivalry hub</p><h2 className="text-xl font-black">{player.name}&apos;s head-to-head records</h2><p className="mt-1 text-sm font-semibold text-slate-300">Every opponent, every result, one ongoing story.</p></div></div>
      </section>

      {top ? (
        <section className="sport-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3"><p className="text-[10px] font-black uppercase text-court">Most-played rival</p></div>
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3"><PlayerAvatar player={top.player} size={58} /><div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-950">{top.player.name}</h3><p className="text-sm font-semibold text-slate-500">{top.matches} matches · closest margin {top.closestMargin}</p></div></div>
            <div className="grid grid-cols-3 gap-2 text-center"><MiniRecord label="Wins" value={top.wins} tone="positive" /><MiniRecord label="Draws" value={top.draws} /><MiniRecord label="Losses" value={top.losses} tone="negative" /></div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="section-title mb-0">All rivalries</h2><span className="text-xs font-bold text-slate-500">{rivalries.length} opponents</span></div>
        {rivalries.length ? <div className="grid gap-3 md:grid-cols-2">{rivalries.map((rival, index) => <RivalryCard key={rival.player.id} rivalry={rival} rank={index + 1} />)}</div> : <div className="sport-card p-8 text-center"><Swords className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-black text-slate-900">No rivalry history yet</p><p className="mt-1 text-sm font-semibold text-slate-500">Completed matches will build this page automatically.</p></div>}
      </section>
    </div>
  );
}

function RivalryCard({ rivalry, rank }: { rivalry: Rivalry; rank: number }) {
  const decided = rivalry.wins + rivalry.losses;
  const winRate = decided ? Math.round((rivalry.wins / decided) * 100) : 0;
  return (
    <article className="sport-card p-4">
      <div className="flex items-center gap-3"><span className="text-xs font-black text-slate-400">#{rank}</span><PlayerAvatar player={rivalry.player} size={44} /><div className="min-w-0 flex-1"><h3 className="truncate font-black text-slate-950">{rivalry.player.name}</h3><p className="text-xs font-bold text-slate-500">{rivalry.matches} matches · {winRate}% win rate</p></div><span className={`rounded-md px-2 py-1 text-xs font-black ${rivalry.ratingChange >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{signed(rivalry.ratingChange)}</span></div>
      <div className="mt-3 grid grid-cols-3 gap-2"><MiniRecord label="Won" value={rivalry.wins} tone="positive" /><MiniRecord label="Drawn" value={rivalry.draws} /><MiniRecord label="Lost" value={rivalry.losses} tone="negative" /></div>
    </article>
  );
}

function WrappedMetric({ label, value, tone = 0 }: { label: string; value: string; tone?: number }) {
  return <div className="bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className={`mt-1 text-xl font-black ${tone > 0 ? "text-emerald-700" : tone < 0 ? "text-red-700" : "text-slate-950"}`}>{value}</p></div>;
}

function Highlight({ icon: Icon, label, value, detail }: { icon: typeof Trophy; label: string; value: string; detail: string }) {
  return <article className="sport-card flex items-start gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-limeball/40 text-court"><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className="mt-0.5 truncate font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p></div></article>;
}

function MiniRecord({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "positive" | "negative" | "neutral" }) {
  return <div className={`rounded-md px-3 py-2 ${tone === "positive" ? "bg-emerald-50 text-emerald-700" : tone === "negative" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}><p className="text-lg font-black">{value}</p><p className="text-[9px] font-black uppercase">{label}</p></div>;
}

function buildTournamentWrapped(player: Player, tournament: Tournament, ratingMatches: RatingMatch[]) {
  const wins = ratingMatches.filter((item) => item.result === "win").length;
  const draws = ratingMatches.filter((item) => item.result === "draw").length;
  const losses = ratingMatches.filter((item) => item.result === "loss").length;
  const ratingChange = ratingMatches.reduce((sum, item) => sum + item.change, 0);
  const favoritePartner = findFavoritePartner(player, ratingMatches);
  const bestWin = [...ratingMatches].filter((item) => item.result === "win").sort((a, b) => b.change - a.change)[0];
  const closestMatch = [...ratingMatches].sort((a, b) => Math.abs(a.ownScore - a.opponentScore) - Math.abs(b.ownScore - b.opponentScore))[0];
  const finish = tournamentFinish(ratingMatches);
  return {
    wins,
    draws,
    losses,
    ratingChange,
    winRate: ratingMatches.length ? Math.round((wins / ratingMatches.length) * 100) : 0,
    bestWinStreak: longestWinStreak(ratingMatches),
    favoritePartner,
    bestWin,
    closestMatch,
    finish: finish.label,
    finishDetail: finish.detail
  };
}

function findFavoritePartner(player: Player, ratingMatches: RatingMatch[]) {
  const partners = new Map<string, { player: Player; matches: number; wins: number }>();
  for (const item of ratingMatches) {
    const side = sideForPlayer(item.match, player.id);
    const partner = side?.players.find((candidate) => candidate.id !== player.id);
    if (!partner) continue;
    const record = partners.get(partner.id) ?? { player: partner, matches: 0, wins: 0 };
    record.matches += 1;
    if (item.result === "win") record.wins += 1;
    partners.set(partner.id, record);
  }
  return [...partners.values()].sort((a, b) => b.matches - a.matches || b.wins - a.wins || a.player.name.localeCompare(b.player.name))[0];
}

function tournamentFinish(ratingMatches: RatingMatch[]) {
  const final = ratingMatches.find((item) => item.match.stage === "final");
  if (final?.result === "win") return { label: "Champion", detail: "Finished the tournament by winning the final" };
  if (final) return { label: "Runner-up", detail: "Reached the championship match" };
  const thirdPlace = ratingMatches.find((item) => item.match.stage === "third_place");
  if (thirdPlace?.result === "win") return { label: "Third place", detail: "Won the third-place playoff" };
  if (ratingMatches.some((item) => item.match.stage === "semifinal")) return { label: "Semi-finalist", detail: "Reached the final four" };
  if (ratingMatches.some((item) => item.match.stage === "quarterfinal")) return { label: "Quarter-finalist", detail: "Reached the final eight" };
  if (ratingMatches.some((item) => item.match.stage === "prequarterfinal")) return { label: "Pre-quarter-finalist", detail: "Qualified from the group stage" };
  return { label: "Group stage", detail: `${ratingMatches.length} rated matches played` };
}

function longestWinStreak(matches: RatingMatch[]) {
  let longest = 0;
  let current = 0;
  for (const item of matches) {
    current = item.result === "win" ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

function buildRivalries(player: Player, players: Player[], matches: Match[]): Rivalry[] {
  const playerById = new Map(players.map((item) => [item.id, item]));
  const rivalries = new Map<string, Rivalry>();
  const completed = matches
    .filter((match) => match.team_1_games != null && match.team_2_games != null && sideForPlayer(match, player.id))
    .sort((a, b) => new Date(a.played_at ?? a.submitted_at ?? a.created_at).getTime() - new Date(b.played_at ?? b.submitted_at ?? b.created_at).getTime());

  for (const match of completed) {
    const ownSide = sideForPlayer(match, player.id)!;
    const opponentSide = ownSide.number === 1 ? matchSide(match, 2) : matchSide(match, 1);
    const ownScore = Number(ownSide.number === 1 ? match.team_1_games : match.team_2_games);
    const opponentScore = Number(ownSide.number === 1 ? match.team_2_games : match.team_1_games);
    const result = match.winner_team_id == null ? "draw" : match.winner_team_id === ownSide.teamId ? "win" : "loss";
    const ratingChange = Number(eventFor(match, player.id)?.rating_change ?? 0);
    const playedAt = match.played_at ?? match.submitted_at ?? match.created_at;
    for (const opponent of opponentSide.players) {
      const rival = playerById.get(opponent.id) ?? opponent;
      const record = rivalries.get(rival.id) ?? { player: rival, matches: 0, wins: 0, draws: 0, losses: 0, ratingChange: 0, closestMargin: Number.POSITIVE_INFINITY, latestMatchAt: playedAt };
      record.matches += 1;
      if (result === "win") record.wins += 1;
      else if (result === "loss") record.losses += 1;
      else record.draws += 1;
      record.ratingChange += ratingChange;
      record.closestMargin = Math.min(record.closestMargin, Math.abs(ownScore - opponentScore));
      if (new Date(playedAt).getTime() > new Date(record.latestMatchAt).getTime()) record.latestMatchAt = playedAt;
      rivalries.set(rival.id, record);
    }
  }
  return [...rivalries.values()].sort((a, b) => b.matches - a.matches || b.wins - a.wins || new Date(b.latestMatchAt).getTime() - new Date(a.latestMatchAt).getTime());
}

function sideForPlayer(match: Match, playerId: string) {
  const first = matchSide(match, 1);
  if (first.players.some((item) => item.id === playerId)) return first;
  const second = matchSide(match, 2);
  return second.players.some((item) => item.id === playerId) ? second : null;
}

function matchSide(match: Match, number: 1 | 2) {
  const team = number === 1 ? match.team_1 : match.team_2;
  const players = [team?.player_1, team?.player_2].filter((item): item is Player => Boolean(item));
  return { number, teamId: number === 1 ? match.team_1_id : match.team_2_id, players };
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
