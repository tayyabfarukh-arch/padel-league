import { cookies } from "next/headers";
import { FRIEND_CIRCLE_COOKIE, type FriendCircle, isFriendCircle } from "./friend-circles";

export function getSelectedFriendCircle(): FriendCircle {
  const value = cookies().get(FRIEND_CIRCLE_COOKIE)?.value;
  return isFriendCircle(value) ? value : "overall";
}
