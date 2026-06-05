import { Medal, ShieldCheck, Trophy } from "lucide-react";
import { formatPercent } from "@/lib/format";
import type { PlayerStats, TeamStats } from "@/lib/types";
import { StatCard } from "./StatCard";

export function StatsGrid({ stats }: { stats: TeamStats | PlayerStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Matches" value={stats.played} />
      <StatCard label="Wins" value={stats.wins} />
      <StatCard label="Win rate" value={formatPercent(stats.wins, stats.played)} />
      <StatCard label="Points" value={stats.points} icon={<ShieldCheck className="h-5 w-5" />} />
      <StatCard label="Games +" value={stats.gamesWon} />
      <StatCard label="Games -" value={stats.gamesLost} />
      <StatCard label="Game diff" value={stats.gameDiff} />
      <StatCard label="Titles" value={stats.titles} icon={<Trophy className="h-5 w-5" />} />
      <StatCard label="Semis" value={`${stats.semifinalsWon}/${stats.semifinalsPlayed}`} />
      <StatCard label="Finals" value={`${stats.finalsWon}/${stats.finalsPlayed}`} />
      <StatCard label="Best" value={stats.bestFinish} icon={<Medal className="h-5 w-5" />} />
    </div>
  );
}
