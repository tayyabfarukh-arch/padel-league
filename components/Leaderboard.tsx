import Link from "next/link";
import { teamLabel } from "@/lib/format";
import type { PlayerStats, TeamStats } from "@/lib/types";
import { PlayerAvatar, TeamAvatar } from "./Avatar";

export function TeamLeaderboard({ rows, limit }: { rows: TeamStats[]; limit?: number }) {
  return (
    <div className="sport-card overflow-x-auto">
      <div className="min-w-[620px]">
        <div className="grid grid-cols-[48px_260px_repeat(4,78px)] border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase text-slate-500">
          <div className="sticky left-0 z-20 bg-slate-50 p-3">Rank</div>
          <div className="sticky left-12 z-20 bg-slate-50 p-3">Team</div>
          <div className="p-3 text-center">MP</div>
          <div className="p-3 text-center">W</div>
          <div className="p-3 text-center">L</div>
          <div className="p-3 text-center">Pts</div>
        </div>
      {(limit ? rows.slice(0, limit) : rows).map((row, index) => (
        <Link
          href={`/teams/${row.team.id}`}
          key={row.team.id}
          className="group grid grid-cols-[48px_260px_repeat(4,78px)] border-b border-slate-100 transition last:border-b-0 hover:bg-emerald-50/60"
        >
          <div className="sticky left-0 z-10 grid place-items-center bg-white p-3 group-hover:bg-emerald-50">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600">
              #{index + 1}
            </span>
          </div>
          <div className="sticky left-12 z-10 flex min-w-0 items-center gap-3 bg-white p-3 group-hover:bg-emerald-50">
            <TeamAvatar team={row.team} size={42} />
            <div className="min-w-0">
              <p className="truncate font-black text-slate-950">{teamLabel(row.team)}</p>
              <p className="truncate text-xs font-semibold text-slate-500">
                {row.gamesWon}-{row.gamesLost} games | Best: {row.bestFinish}
              </p>
            </div>
          </div>
          <Metric value={row.played} />
          <Metric value={row.wins} />
          <Metric value={row.losses} />
          <Metric value={signed(row.points)} featured />
        </Link>
      ))}
      </div>
    </div>
  );
}

export function PlayerLeaderboard({ rows, limit }: { rows: PlayerStats[]; limit?: number }) {
  return (
    <div className="sport-card overflow-x-auto">
      <div className="min-w-[620px]">
        <div className="grid grid-cols-[48px_260px_repeat(4,78px)] border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase text-slate-500">
          <div className="sticky left-0 z-20 bg-slate-50 p-3">Rank</div>
          <div className="sticky left-12 z-20 bg-slate-50 p-3">Player</div>
          <div className="p-3 text-center">MP</div>
          <div className="p-3 text-center">W</div>
          <div className="p-3 text-center">L</div>
          <div className="p-3 text-center">Pts</div>
        </div>
      {(limit ? rows.slice(0, limit) : rows).map((row, index) => (
        <Link
          href={`/players/${row.player.id}`}
          key={row.player.id}
          className="group grid grid-cols-[48px_260px_repeat(4,78px)] border-b border-slate-100 transition last:border-b-0 hover:bg-emerald-50/60"
        >
          <div className="sticky left-0 z-10 grid place-items-center bg-white p-3 group-hover:bg-emerald-50">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600">
              #{index + 1}
            </span>
          </div>
          <div className="sticky left-12 z-10 flex min-w-0 items-center gap-3 bg-white p-3 group-hover:bg-emerald-50">
            <PlayerAvatar player={row.player} size={42} />
            <div className="min-w-0">
              <p className="truncate font-black text-slate-950">{row.player.name}</p>
              <p className="truncate text-xs font-semibold text-slate-500">
                {row.gamesWon}-{row.gamesLost} games | Best: {row.bestFinish}
              </p>
            </div>
          </div>
          <Metric value={row.played} />
          <Metric value={row.wins} />
          <Metric value={row.losses} />
          <Metric value={signed(row.points)} featured dark />
        </Link>
      ))}
      </div>
    </div>
  );
}

function Metric({
  value,
  featured = false,
  dark = false
}: {
  value: string | number;
  featured?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={[
        "grid place-items-center p-3 text-center text-sm",
        featured
          ? dark
            ? "font-black text-ink"
            : "font-black text-court"
          : "font-black text-slate-700"
      ].join(" ")}
    >
      <span className="font-black">{value}</span>
    </div>
  );
}

function signed(value: number) {
  return value > 0 ? `+${value}` : value;
}
