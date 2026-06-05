import Link from "next/link";
import { formatPercent, teamLabel } from "@/lib/format";
import type { PlayerStats, TeamStats } from "@/lib/types";
import { PlayerAvatar, TeamAvatar } from "./Avatar";

export function TeamLeaderboard({ rows, limit }: { rows: TeamStats[]; limit?: number }) {
  return (
    <div className="sport-card overflow-hidden">
      {(limit ? rows.slice(0, limit) : rows).map((row, index) => (
        <Link
          href={`/teams/${row.team.id}`}
          key={row.team.id}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 p-3 transition last:border-b-0 hover:bg-emerald-50/60"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600">#{index + 1}</span>
          <div className="flex min-w-0 items-center gap-3">
            <TeamAvatar team={row.team} size={40} />
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">{teamLabel(row.team)}</p>
              <p className="text-xs font-semibold text-slate-500">{row.wins}-{row.losses} | {formatPercent(row.wins, row.played)}</p>
            </div>
          </div>
          <span className="rounded-md bg-court px-3 py-1.5 text-sm font-black text-white shadow-sm">{row.points}</span>
        </Link>
      ))}
    </div>
  );
}

export function PlayerLeaderboard({ rows, limit }: { rows: PlayerStats[]; limit?: number }) {
  return (
    <div className="sport-card overflow-hidden">
      {(limit ? rows.slice(0, limit) : rows).map((row, index) => (
        <Link
          href={`/players/${row.player.id}`}
          key={row.player.id}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 p-3 transition last:border-b-0 hover:bg-emerald-50/60"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600">#{index + 1}</span>
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar player={row.player} size={40} />
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">{row.player.name}</p>
              <p className="text-xs font-semibold text-slate-500">{row.wins}-{row.losses} | {formatPercent(row.wins, row.played)}</p>
            </div>
          </div>
          <span className="rounded-md bg-ink px-3 py-1.5 text-sm font-black text-white shadow-sm">{row.points}</span>
        </Link>
      ))}
    </div>
  );
}
