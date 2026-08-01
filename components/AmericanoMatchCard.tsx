import { MapPin, Users, Youtube } from "lucide-react";
import { teamLabel } from "@/lib/format";
import type { AmericanoMatch, PointsScoringMode, TournamentFormat } from "@/lib/types";
import { PlayerAvatar, TeamAvatar } from "./Avatar";
import { InlineAmericanoScore } from "./InlineAmericanoScore";

export function AmericanoMatchCard({
  match,
  format,
  targetPoints,
  pointsScoringMode,
  allowScoreEntry,
  youtubeUrl
}: {
  match: AmericanoMatch;
  format: TournamentFormat;
  targetPoints: number;
  pointsScoringMode: PointsScoringMode;
  allowScoreEntry: boolean;
  youtubeUrl?: string;
}) {
  const completed = match.side_1_points !== null && match.side_2_points !== null;
  return (
    <article className={`sport-card match-card p-4 ${completed ? "match-card--completed" : "match-card--pending"}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 rounded-full bg-limeball px-3 py-1 text-xs font-black text-ink">
          <Users className="h-3.5 w-3.5" /> Round {match.round_number}
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-md bg-court px-2.5 py-1.5 text-sm font-black text-white">
            <MapPin className="h-4 w-4" /> Court {match.court_number ?? "TBD"}
          </span>
          {youtubeUrl ? (
            <a href={youtubeUrl} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-md bg-red-600 text-white" title="Watch this court on YouTube" aria-label="Watch this court on YouTube">
              <Youtube className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <AmericanoSide match={match} side={1} format={format} result={completed ? match.winner_side === 1 ? "winner" : match.winner_side === 2 ? "loser" : "draw" : null} />
        <div className="min-w-16 rounded-md bg-slate-950 px-3 py-2 text-center text-lg font-black text-white">
          {completed ? `${match.side_1_points}-${match.side_2_points}` : "vs"}
        </div>
        <AmericanoSide match={match} side={2} format={format} result={completed ? match.winner_side === 2 ? "winner" : match.winner_side === 1 ? "loser" : "draw" : null} align="right" />
      </div>

      {!completed && allowScoreEntry ? <InlineAmericanoScore match={match} targetPoints={targetPoints} pointsScoringMode={pointsScoringMode} /> : null}
    </article>
  );
}

function AmericanoSide({
  match,
  side,
  format,
  result,
  align = "left"
}: {
  match: AmericanoMatch;
  side: 1 | 2;
  format: TournamentFormat;
  result: "winner" | "loser" | "draw" | null;
  align?: "left" | "right";
}) {
  const team = side === 1 ? match.side_1_team : match.side_2_team;
  const first = side === 1 ? match.side_1_player_1 : match.side_2_player_1;
  const second = side === 1 ? match.side_1_player_2 : match.side_2_player_2;
  const name = format === "team_americano" ? teamLabel(team) : `${first?.name ?? "Player"} / ${second?.name ?? "Player"}`;
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className={`relative inline-flex ${align === "right" ? "float-right" : ""}`}>
        {format === "team_americano" ? (
          <TeamAvatar team={team} size={38} />
        ) : (
          <div className="flex -space-x-3">
            <PlayerAvatar player={first} size={38} />
            <PlayerAvatar player={second} size={38} />
          </div>
        )}
        {result ? <span className="absolute -bottom-1 -right-2 text-xl drop-shadow-sm">{result === "winner" ? "😎" : result === "loser" ? "😔" : "🤝"}</span> : null}
      </div>
      <div className="clear-both" />
      {result ? <p className={`mt-2 text-[10px] font-black uppercase ${result === "winner" ? "text-emerald-700" : result === "loser" ? "text-rose-600" : "text-amber-700"}`}>{result}</p> : null}
      <p className="mt-1 truncate text-xs font-black text-slate-950" title={name}>{name}</p>
    </div>
  );
}
