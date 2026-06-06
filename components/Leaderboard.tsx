import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { formatPercent, teamLabel } from "@/lib/format";
import type { PlayerStats, TeamStats } from "@/lib/types";
import { PlayerAvatar, TeamAvatar } from "./Avatar";

type DetailItem = [string, string | number];

export function TeamLeaderboard({ rows, limit }: { rows: TeamStats[]; limit?: number }) {
  const displayRows = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="sport-card overflow-hidden">
      <div className="md:hidden">
        {displayRows.map((row, index) => (
          <MobileTeamRow key={row.team.id} row={row} index={index} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[1040px]">
          <Header label="Team" />
          {displayRows.map((row, index) => (
            <Link
              href={`/teams/${row.team.id}`}
              key={row.team.id}
              className="grid grid-cols-[56px_260px_repeat(12,72px)] border-b border-slate-100 transition last:border-b-0 hover:bg-emerald-50/60"
            >
              <RankCell index={index} />
              <div className="flex min-w-0 items-center gap-3 p-3">
                <TeamAvatar team={row.team} size={42} />
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{teamLabel(row.team)}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{row.gamesWon}-{row.gamesLost} games</p>
                </div>
              </div>
              {teamDetails(row).slice(0, 12).map(([label, value]) => (
                <TableMetric key={label} value={value} featured={label === "Pts"} />
              ))}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlayerLeaderboard({ rows, limit }: { rows: PlayerStats[]; limit?: number }) {
  const displayRows = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="sport-card overflow-hidden">
      <div className="md:hidden">
        {displayRows.map((row, index) => (
          <MobilePlayerRow key={row.player.id} row={row} index={index} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[1040px]">
          <Header label="Player" />
          {displayRows.map((row, index) => (
            <Link
              href={`/players/${row.player.id}`}
              key={row.player.id}
              className="grid grid-cols-[56px_260px_repeat(12,72px)] border-b border-slate-100 transition last:border-b-0 hover:bg-emerald-50/60"
            >
              <RankCell index={index} />
              <div className="flex min-w-0 items-center gap-3 p-3">
                <PlayerAvatar player={row.player} size={42} />
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{row.player.name}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{row.gamesWon}-{row.gamesLost} games</p>
                </div>
              </div>
              {playerDetails(row).slice(0, 12).map(([label, value]) => (
                <TableMetric key={label} value={value} featured={label === "Pts"} dark />
              ))}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileTeamRow({ row, index }: { row: TeamStats; index: number }) {
  return (
    <details className="group border-b border-slate-100 last:border-b-0">
      <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-3 transition hover:bg-emerald-50/60 [&::-webkit-details-marker]:hidden">
        <RankBadge index={index} />
        <div className="flex min-w-0 items-center gap-3">
          <TeamAvatar team={row.team} size={42} />
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">{teamLabel(row.team)}</p>
            <p className="truncate text-xs font-semibold text-slate-500">{row.gamesWon}-{row.gamesLost} games</p>
          </div>
        </div>
        <PointBadge value={row.points} />
        <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <ExpandedDetails href={`/teams/${row.team.id}`} items={teamDetails(row)} />
    </details>
  );
}

function MobilePlayerRow({ row, index }: { row: PlayerStats; index: number }) {
  return (
    <details className="group border-b border-slate-100 last:border-b-0">
      <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-3 transition hover:bg-emerald-50/60 [&::-webkit-details-marker]:hidden">
        <RankBadge index={index} />
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar player={row.player} size={42} />
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">{row.player.name}</p>
            <p className="truncate text-xs font-semibold text-slate-500">{row.gamesWon}-{row.gamesLost} games</p>
          </div>
        </div>
        <PointBadge value={row.points} dark />
        <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <ExpandedDetails href={`/players/${row.player.id}`} items={playerDetails(row)} />
    </details>
  );
}

function Header({ label }: { label: string }) {
  const columns = ["MP", "W", "L", "Win %", "GW", "GL", "GD", "Pts", "SF", "SFW", "F", "Titles"];
  return (
    <div className="grid grid-cols-[56px_260px_repeat(12,72px)] border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase text-slate-500">
      <div className="p-3">Rank</div>
      <div className="p-3">{label}</div>
      {columns.map((column) => (
        <div key={column} className="p-3 text-center">{column}</div>
      ))}
    </div>
  );
}

function ExpandedDetails({ href, items }: { href: string; items: DetailItem[] }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/80 p-3">
      <div className="grid grid-cols-2 gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md bg-white p-3 ring-1 ring-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-base font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      <Link href={href} className="btn-secondary mt-3 w-full">
        View full profile
      </Link>
    </div>
  );
}

function RankCell({ index }: { index: number }) {
  return (
    <div className="grid place-items-center p-3">
      <RankBadge index={index} />
    </div>
  );
}

function RankBadge({ index }: { index: number }) {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600">
      #{index + 1}
    </span>
  );
}

function PointBadge({ value, dark = false }: { value: number; dark?: boolean }) {
  return (
    <span className={`rounded-md px-3 py-1.5 text-sm font-black text-white shadow-sm ${dark ? "bg-ink" : "bg-court"}`}>
      {signed(value)}
    </span>
  );
}

function TableMetric({ value, featured = false, dark = false }: { value: string | number; featured?: boolean; dark?: boolean }) {
  return (
    <div className={`grid place-items-center p-3 text-center text-sm font-black ${featured ? (dark ? "text-ink" : "text-court") : "text-slate-700"}`}>
      {value}
    </div>
  );
}

function teamDetails(row: TeamStats): DetailItem[] {
  return [
    ["MP", row.played],
    ["W", row.wins],
    ["L", row.losses],
    ["Win %", formatPercent(row.wins, row.played)],
    ["GW", row.gamesWon],
    ["GL", row.gamesLost],
    ["GD", signed(row.gameDiff)],
    ["Pts", signed(row.points)],
    ["SF", row.semifinalsPlayed],
    ["SFW", row.semifinalsWon],
    ["F", row.finalsPlayed],
    ["Titles", row.titles],
    ["Best finish", row.bestFinish]
  ];
}

function playerDetails(row: PlayerStats): DetailItem[] {
  return [
    ["MP", row.played],
    ["W", row.wins],
    ["L", row.losses],
    ["Win %", formatPercent(row.wins, row.played)],
    ["GW", row.gamesWon],
    ["GL", row.gamesLost],
    ["GD", signed(row.gameDiff)],
    ["Pts", signed(row.points)],
    ["SF", row.semifinalsPlayed],
    ["SFW", row.semifinalsWon],
    ["F", row.finalsPlayed],
    ["Titles", row.titles],
    ["Best finish", row.bestFinish]
  ];
}

function signed(value: number) {
  return value > 0 ? `+${value}` : value;
}
