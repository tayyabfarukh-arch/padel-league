export const FRIEND_CIRCLE_COOKIE = "padel_friend_circle";

export const FRIEND_CIRCLES = [
  { value: "overall", label: "Overall" },
  { value: "circle_1", label: "Heavy Tournament" },
  { value: "circle_2", label: "Super Heavy Tournament" },
  { value: "circle_3", label: "Other Tournament" }
] as const;

export type FriendCircle = (typeof FRIEND_CIRCLES)[number]["value"];

export function isFriendCircle(value: string | undefined): value is FriendCircle {
  return FRIEND_CIRCLES.some((circle) => circle.value === value);
}

export function friendCircleLabel(value: string | null | undefined) {
  return FRIEND_CIRCLES.find((circle) => circle.value === value)?.label ?? "Heavy Tournament";
}
