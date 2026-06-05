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
          className="block border-b border-slate-100 p-3 transition last:border-b-0 hover:bg-emerald-50/60"
        >
          <div className="grid gap-3 md:grid-cols-[auto_minmax(220px,1fr)_repeat(6,minmax(64px,auto))] md:items-center">
            <div className="flex items-center gap-3 md:contents">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600">
                #{index + 1}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <TeamAvatar team={row.team} size={42} />
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{teamLabel(row.team)}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {row.gamesWon}-{row.gamesLost} games | Best: {row.bestFinish}
                  </p>
                </div>
              </div>
            </div>

            <Metric label="MP" value={row.played} />
            <Metric label="W" value={row.wins} />
            <Metric label="L" value={row.losses} />
            <Metric label="Win %" value={formatPercent(row.wins, row.played)} />
            <Metric label="GD" value={signed(row.gameDiff)} />
            <Metric label="Pts" value={signed(row.points)} featured />
          </div>
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
          className="block border-b border-slate-100 p-3 transition last:border-b-0 hover:bg-emerald-50/60"
        >
          <div className="grid gap-3 md:grid-cols-[auto_minmax(220px,1fr)_repeat(6,minmax(64px,auto))] md:items-center">
            <div className="flex items-center gap-3 md:contents">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600">
                #{index + 1}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <PlayerAvatar player={row.player} size={42} />
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{row.player.name}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {row.gamesWon}-{row.gamesLost} games | Best: {row.bestFinish}
                  </p>
                </div>
              </div>
            </div>

            <Metric label="MP" value={row.played} />
            <Metric label="W" value={row.wins} />
            <Metric label="L" value={row.losses} />
            <Metric label="Win %" value={formatPercent(row.wins, row.played)} />
            <Metric label="GD" value={signed(row.gameDiff)} />
            <Metric label="Pts" value={signed(row.points)} featured dark />
          </div>
        </Link>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  featured = false,
  dark = false
}: {
  label: string;
  value: string | number;
  featured?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={[
        "inline-flex min-w-16 items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm md:flex-col md:justify-center md:gap-0 md:text-center",
        featured
          ? dark
            ? "bg-ink text-white"
            : "bg-court text-white"
          : "bg-slate-100 text-slate-700"
      ].join(" ")}
    >
      <span className={featured ? "text-[10px] font-black uppercase text-white/75" : "text-[10px] font-black uppercase text-slate-500"}>
        {label}
      </span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function signed(value: number) {
  return value > 0 ? `+${value}` : value;
}
