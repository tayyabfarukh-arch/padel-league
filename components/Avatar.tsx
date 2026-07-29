"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Player, Team } from "@/lib/types";

export function PlayerAvatar({ player, size = 44 }: { player?: Player | null; size?: number }) {
  const name = player?.name ?? "Player";
  const photoUrl = player?.photo_url ?? "";
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [photoUrl]);

  if (!photoUrl || failed) {
    return <InitialsAvatar name={name} size={size} rounded />;
  }

  return (
    <Image
      src={photoUrl}
      alt={name}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
    />
  );
}

export function TeamAvatar({ team, size = 56 }: { team?: Team | null; size?: number }) {
  const teamPhotoUrl = team?.team_photo_url ?? "";
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [teamPhotoUrl]);

  if (teamPhotoUrl && !failed) {
    return (
      <Image
        src={teamPhotoUrl}
        alt={team?.team_name ?? "Team"}
        width={size}
        height={size}
        unoptimized
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-lg border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
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

export function TournamentCover({
  url,
  name,
  width = 104,
  height = 78
}: {
  url?: string | null;
  name: string;
  width?: number;
  height?: number;
}) {
  const photoUrl = url ?? "";
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [photoUrl]);

  if (!photoUrl || failed) {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-md bg-ink text-xl font-black text-limeball ring-1 ring-slate-200"
        style={{ width, height }}
        aria-label={`${name} cover`}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <Image
      src={photoUrl}
      alt={`${name} cover`}
      width={width}
      height={height}
      unoptimized
      onError={() => setFailed(true)}
      style={{ width, height }}
      className="shrink-0 rounded-md object-cover ring-1 ring-slate-200"
    />
  );
}

function InitialsAvatar({
  name,
  size,
  rounded = false
}: {
  name: string;
  size: number;
  rounded?: boolean;
}) {
  return (
    <div
      className={`grid shrink-0 place-items-center border-2 border-white bg-ink text-xs font-black text-limeball shadow-sm ring-1 ring-slate-200 ${
        rounded ? "rounded-full" : "rounded-lg"
      }`}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}
