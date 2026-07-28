import type { CourtStream, Match, Team } from "./types";

export function formatPercent(wins: number, played: number) {
  if (!played) return "0%";
  return `${Math.round((wins / played) * 100)}%`;
}

export function teamLabel(team?: Team | null) {
  if (!team) return "TBD";
  return team.team_name || [team.player_1?.name, team.player_2?.name].filter(Boolean).join(" / ");
}

export function defaultAvatar(name = "Player") {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return `https://placehold.co/160x160/14213d/d8ff3e?text=${encodeURIComponent(initials || "P")}`;
}

export function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    group: "Group",
    semifinal: "Semifinal",
    final: "Final",
    third_place: "Third place"
  };
  return labels[stage] ?? stage;
}

export function courtStreamUrl(match: Match, streams: CourtStream[]) {
  if (!match.court_number) return undefined;
  return streams.find(
    (stream) =>
      stream.tournament_id === match.tournament_id &&
      stream.court_number === match.court_number
  )?.youtube_url;
}
