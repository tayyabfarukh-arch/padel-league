"use client";

import { useState } from "react";
import type { TeamStats } from "@/lib/types";
import { TeamLeaderboard } from "./Leaderboard";

type TeamView = "active" | "inactive" | "all";

export function TeamLeaderboardFilter({ rows }: { rows: TeamStats[] }) {
  const [view, setView] = useState<TeamView>("active");
  const activeRows = rows.filter((row) => row.team.is_active !== false);
  const inactiveRows = rows.filter((row) => row.team.is_active === false);
  const visibleRows = view === "active" ? activeRows : view === "inactive" ? inactiveRows : rows;

  return (
    <div className="space-y-4">
      <section className="sport-card flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Team status</p>
          <p className="text-sm font-semibold text-slate-700">
            Showing {visibleRows.length} {view === "all" ? "teams" : `${view} teams`}.
          </p>
        </div>
        <div className="flex w-full shrink-0 rounded-md border border-slate-200 bg-slate-50 p-1 md:w-auto">
          {([
            ["active", `Active (${activeRows.length})`],
            ["inactive", `Inactive (${inactiveRows.length})`],
            ["all", `All (${rows.length})`]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={view === value ? "btn-primary flex-1 md:min-w-28" : "btn-secondary flex-1 border-0 shadow-none md:min-w-28"}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {visibleRows.length ? (
        <TeamLeaderboard rows={visibleRows} showRating />
      ) : (
        <div className="sport-card p-5 text-sm font-bold text-slate-500">No {view} teams to display.</div>
      )}
    </div>
  );
}
