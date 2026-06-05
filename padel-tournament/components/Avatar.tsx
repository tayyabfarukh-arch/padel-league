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
      className="aspect-square rounded-full border border-white/70 object-cover shadow-sm"
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
        className="aspect-square rounded-lg border border-white/70 object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex -space-x-3" style={{ width: size + 12 }}>
      <PlayerAvatar player={team?.player_1} size={size} />
      <PlayerAvatar player={team?.player_2} size={size} />
    </div>
  );
}
