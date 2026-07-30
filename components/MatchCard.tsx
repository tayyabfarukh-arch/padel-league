import { CalendarDays, MapPin, Youtube } from "lucide-react";
import { stageLabel, teamLabel } from "@/lib/format";
import type { Match } from "@/lib/types";
import { TeamAvatar } from "./Avatar";
import { InlineMatchScore } from "./InlineMatchScore";

export function MatchCard({
  match,
  allowScoreEntry = false,
  scoreTarget,
  youtubeUrl
}: {
  match: Match;
  allowScoreEntry?: boolean;
  scoreTarget?: number;
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
        <span className="rounded-full bg-limeball px-3 py-1 text-xs font-black text-ink">
          {stageLabel(match.stage)}
        </span>
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <ResultAvatar
            team={match.team_1}
            result={drawn ? "draw" : visualWinnerId === match.team_1_id ? "winner" : completed ? "loser" : null}
          />
          {completed ? (
            <ResultLabel result={drawn ? "draw" : visualWinnerId === match.team_1_id ? "winner" : "loser"} />
          ) : null}
          <p className="mt-2 truncate text-sm font-bold text-slate-900">{teamLabel(match.team_1)}</p>
        </div>
        <div className="min-w-14 rounded-md bg-slate-950 px-3 py-2 text-center text-lg font-black text-white shadow-sm">
          {completed ? `${match.team_1_games}-${match.team_2_games}` : "vs"}
        </div>
        <div className="min-w-0 text-right">
          <div className="flex justify-end">
            <ResultAvatar
              team={match.team_2}
              result={drawn ? "draw" : visualWinnerId === match.team_2_id ? "winner" : completed ? "loser" : null}
            />
          </div>
          {completed ? (
            <ResultLabel result={drawn ? "draw" : visualWinnerId === match.team_2_id ? "winner" : "loser"} align="right" />
          ) : null}
          <p className="mt-2 truncate text-sm font-bold text-slate-900">{teamLabel(match.team_2)}</p>
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
        <InlineMatchScore match={match} targetScore={scoreTarget} />
      ) : null}
    </article>
  );
}

type Result = "winner" | "loser" | "draw";

function ResultAvatar({ team, result }: { team: Match["team_1"]; result: Result | null }) {
  return (
    <div className="relative inline-flex">
      <TeamAvatar team={team} size={38} />
      {result ? (
        <span
          className="absolute -bottom-1 -right-2 text-xl drop-shadow-sm"
          role="img"
          aria-label={result === "winner" ? "Winner" : result === "loser" ? "Loser" : "Draw"}
        >
          {result === "winner" ? "😎" : result === "loser" ? "😔" : "🤝"}
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
