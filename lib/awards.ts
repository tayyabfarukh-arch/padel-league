import type { AwardCycle } from "./types";

export function formatAwardPeriod(cycle: AwardCycle) {
  const start = new Date(`${cycle.period_start}T00:00:00`);
  const end = new Date(`${cycle.period_end}T00:00:00`);
  if (cycle.period_type === "monthly") {
    return start.toLocaleDateString("en", { month: "long", year: "numeric" });
  }
  return `${start.toLocaleDateString("en", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;
}

export function awardTone(awardKey: string) {
  if (awardKey.includes("mvp") || awardKey.includes("player_of_week")) return "border-amber-300 bg-amber-50 text-amber-900";
  if (awardKey.includes("sportsmanship") || awardKey.includes("team_player")) return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (awardKey.includes("chaos") || awardKey.includes("moment")) return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900";
  return "border-sky-200 bg-sky-50 text-sky-900";
}
