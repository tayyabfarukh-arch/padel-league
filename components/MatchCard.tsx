import { CalendarDays, MapPin } from "lucide-react";
import { stageLabel, teamLabel } from "@/lib/format";
import type { Match } from "@/lib/types";
import { TeamAvatar } from "./Avatar";
import { InlineMatchScore } from "./InlineMatchScore";

export function MatchCard({
  match,
  allowScoreEntry = false,
  scoreTarget
}: {
  match: Match;
  allowScoreEntry?: boolean;
  scoreTarget?: number;
}) {
  const completed = match.team_1_games !== null && match.team_2_games !== null;
  return (
    <article className="sport-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-limeball px-3 py-1 text-xs font-black text-ink">
          {stageLabel(match.stage)}
        </span>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          {match.court_number ? (
            <span className="flex items-center gap-1 font-black text-court">
              <MapPin className="h-3.5 w-3.5" /> Court {match.court_number}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {match.played_at ? new Date(match.played_at).toLocaleDateString() : "Upcoming"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <TeamAvatar team={match.team_1} size={38} />
          <p className="mt-2 truncate text-sm font-bold text-slate-900">{teamLabel(match.team_1)}</p>
        </div>
        <div className="min-w-14 rounded-md bg-slate-950 px-3 py-2 text-center text-lg font-black text-white shadow-sm">
          {completed ? `${match.team_1_games}-${match.team_2_games}` : "vs"}
        </div>
        <div className="min-w-0 text-right">
          <div className="flex justify-end">
            <TeamAvatar team={match.team_2} size={38} />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-900">{teamLabel(match.team_2)}</p>
        </div>
      </div>
      {completed && match.deciding_point_winner_team_id ? (
        <p className="mt-3 rounded-md bg-limeball/30 p-2 text-center text-xs font-black text-ink">
          Deciding point won by{" "}
          {teamLabel(
            match.deciding_point_winner_team_id === match.team_1_id
              ? match.team_1
              : match.team_2
          )}
        </p>
      ) : null}
      {!completed && allowScoreEntry && scoreTarget ? (
        <InlineMatchScore match={match} targetScore={scoreTarget} />
      ) : null}
    </article>
  );
}
