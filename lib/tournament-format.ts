import type { GroupName } from "./types";

export function groupNamesForCount(groupCount: number): GroupName[] {
  if (groupCount === 4) return ["A", "B", "C", "D"];
  if (groupCount === 2) return ["A", "B"];
  return ["A"];
}
