import Image from "next/image";
import { defaultAvatar } from "@/lib/format";
import type { Player, Team } from "@/lib/types";

export function PlayerAvatar({ player, size = 44 }: { player?: Player | null; size?: number }) {
  const name = player?.name ?? "Player";
  return (
    <Image
      src={player?.photo_url || defaultAvatar(name)}
      alt={name}
      width={size}
      height={size}
      className="shrink-0 aspect-square rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
    />
  );
}

export function TeamAvatar({ team, size = 56 }: { team?: Team | null; size?: number }) {
  if (team?.team_photo_url) {
    return (
      <Image
        src={team.team_photo_url}
        alt={team.team_name}
        width={size}
        height={size}
        className="shrink-0 aspect-square rounded-lg border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
      />
    );
  }

  return (
    <div className="flex shrink-0 -space-x-3" style={{ width: size * 2 - 12 }}>
      <PlayerAvatar player={team?.player_1} size={size} />
      <PlayerAvatar player={team?.player_2} size={size} />
    </div>
  );
}
