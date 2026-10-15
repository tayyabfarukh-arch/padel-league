import { CalendarDays, MapPin, Youtube } from "lucide-react";
import { stageLabel, teamLabel } from "@/lib/format";
import type { Match, PointsScoringMode } from "@/lib/types";
import { PlayerAvatar } from "./Avatar";
import { InlineMatchScore } from "./InlineMatchScore";

export function MatchCard({
  match,
  allowScoreEntry = false,
  scoreTarget,
  pointsScoringMode,
  youtubeUrl
}: {
  match: Match;
  allowScoreEntry?: boolean;
  scoreTarget?: number;
  pointsScoringMode?: PointsScoringMode;
  youtubeUrl?: string;
}) {
  const completed = match.team_1_games !== null && match.team_2_games !== null;
  const knockout = match.stage !== "group";
  const visualWinnerId = completed
    ? match.winner_team_id ??
      (match.team_1_games! > match.team_2_games!
        ? match.team_1_id
        : match.team_2_games! > match.team_1_games!
          ? match.team_2_id
          : null)
    : null;
  const drawn = completed && !visualWinnerId;
  const team1Result = drawn ? "draw" : visualWinnerId === match.team_1_id ? "winner" : completed ? "loser" : null;
  const team2Result = drawn ? "draw" : visualWinnerId === match.team_2_id ? "winner" : completed ? "loser" : null;

  return (
    <article
      className={`sport-card match-card p-4 ${
        knockout
          ? "match-card--knockout"
          : completed
            ? "match-card--completed"
            : "match-card--pending"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-limeball px-3 py-1 text-xs font-black text-ink">
            {match.stage === "group" && match.group_name
              ? `Group ${match.group_name}`
              : match.stage === "quarterfinal" && match.round_number
                ? `Quarter-final Q${match.round_number}`
                : match.stage === "semifinal" && match.round_number
                  ? `Semifinal SF${match.round_number}`
                  : stageLabel(match.stage)}
          </span>
          {match.stage === "group" ? (
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-black text-white">
              {match.round_number ? `Round ${match.round_number}` : "Round TBD"}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          {match.court_number ? (
            <span className="flex items-center gap-1.5 rounded-md bg-court px-3 py-1.5 text-sm font-black text-white shadow-sm">
              <MapPin className="h-4 w-4" /> Court {match.court_number}
            </span>
          ) : null}
          {youtubeUrl ? (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-red-600 text-white shadow-sm transition hover:bg-red-700"
              title={`Watch Court ${match.court_number ?? ""} on YouTube`}
              aria-label={`Watch Court ${match.court_number ?? ""} on YouTube`}
            >
              <Youtube className="h-5 w-5" />
            </a>
          ) : null}
          <span className="hidden items-center gap-1 sm:flex">
            <CalendarDays className="h-3.5 w-3.5" />
            {match.played_at ? new Date(match.played_at).toLocaleDateString() : "Upcoming"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="min-w-0">
          <PlayerRatingPair team={match.team_1} match={match} result={team1Result} />
          {completed ? <ResultLabel result={team1Result as Result} /> : null}
          <p className="mt-1 truncate text-sm font-bold text-slate-900">{teamLabel(match.team_1)}</p>
        </div>

        <div className="min-w-14 rounded-md bg-slate-950 px-3 py-2 text-center text-lg font-black text-white shadow-sm">
          {completed ? `${match.team_1_games}-${match.team_2_games}` : "vs"}
        </div>

        <div className="min-w-0 text-right">
          <PlayerRatingPair team={match.team_2} match={match} result={team2Result} align="right" />
          {completed ? <ResultLabel result={team2Result as Result} align="right" /> : null}
          <p className="mt-1 truncate text-sm font-bold text-slate-900">{teamLabel(match.team_2)}</p>
        </div>
      </div>

      {completed && match.deciding_point_winner_team_id ? (
        <p className="mt-3 rounded-md bg-limeball/30 p-2 text-center text-xs font-black text-ink">
          Golden point won by{" "}
          {teamLabel(
            match.deciding_point_winner_team_id === match.team_1_id
              ? match.team_1
              : match.team_2
          )}
        </p>
      ) : null}
      {completed && match.ended_due_to_time ? (
        <p className="mt-3 rounded-md bg-amber-100 p-2 text-center text-xs font-black text-amber-950">
          Match finished early due to court time
        </p>
      ) : null}
      {!completed && allowScoreEntry && scoreTarget ? (
        <InlineMatchScore match={match} targetScore={scoreTarget} pointsScoringMode={pointsScoringMode} />
      ) : null}
    </article>
  );
}

type Result = "winner" | "loser" | "draw";

function PlayerRatingPair({
  team,
  match,
  result,
  align = "left"
}: {
  team: Match["team_1"];
  match: Match;
  result: Result | null;
  align?: "left" | "right";
}) {
  const players = [team?.player_1, team?.player_2];

  return (
    <div className={`relative flex gap-2 sm:gap-3 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {players.map((player, index) => (
        <div key={player?.id ?? index} className="flex w-12 min-w-0 flex-col items-center sm:w-14">
          <PlayerAvatar player={player} size={38} />
          <span className="mt-1 block w-full truncate text-center text-[10px] font-black text-slate-700" title={player?.name}>
            {firstName(player?.name)}
          </span>
          <RatingChange value={playerRatingChange(match, player?.id)} />
        </div>
      ))}
      {result ? (
        <span
          className={`absolute -top-2 text-lg drop-shadow-sm ${align === "right" ? "-right-1" : "-left-1"}`}
          role="img"
          aria-label={result === "winner" ? "Winner" : result === "loser" ? "Loser" : "Draw"}
        >
          {result === "winner" ? "🙂" : result === "loser" ? "☹️" : "🤝"}
        </span>
      ) : null}
    </div>
  );
}

function ResultLabel({ result, align = "left" }: { result: Result; align?: "left" | "right" }) {
  const styles = result === "winner"
    ? "text-emerald-700"
    : result === "loser"
      ? "text-rose-600"
      : "text-amber-700";

  return (
    <p className={`mt-2 text-[10px] font-black uppercase ${styles} ${align === "right" ? "text-right" : ""}`}>
      {result === "winner" ? "Winner" : result === "loser" ? "Loser" : "Draw"}
    </p>
  );
}

function RatingChange({ value }: { value?: number | null }) {
  if (value == null || Math.abs(Number(value)) < 0.0005) return null;
  const change = Number(value);
  return (
    <span
      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black ${change > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
      title="Player rating change from this match"
    >
      {change > 0 ? "+" : ""}{change.toFixed(2)}
    </span>
  );
}

function playerRatingChange(match: Match, playerId?: string) {
  if (!playerId) return null;
  const event = match.rating_events?.find((item) => item.player_id === playerId);
  return event ? Number(event.rating_change) : null;
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "Player";
}
