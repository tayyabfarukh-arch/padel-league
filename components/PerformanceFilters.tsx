"use client";

import { useRouter } from "next/navigation";
import { PlayerPicker } from "@/components/PlayerPicker";
import type { Player, Tournament } from "@/lib/types";

export function PerformanceFilters({
  players,
  tournaments,
  playerId,
  tournamentId,
  view
}: {
  players: Player[];
  tournaments: Tournament[];
  playerId: string;
  tournamentId: string;
  view?: string;
}) {
  const router = useRouter();

  function navigate(nextPlayerId: string, nextTournamentId: string) {
    const query = new URLSearchParams({ player: nextPlayerId });
    if (nextTournamentId) query.set("tournament", nextTournamentId);
    if (view) query.set("view", view);
    router.push(`/performance?${query.toString()}`);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <PlayerPicker
        label="Player"
        players={players}
        value={playerId}
        onChange={(nextPlayerId) => navigate(nextPlayerId, "")}
      />
      <label>
        <span className="field-label">Tournament</span>
        <select className="field min-h-[50px]" value={tournamentId} onChange={(event) => navigate(playerId, event.target.value)}>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
