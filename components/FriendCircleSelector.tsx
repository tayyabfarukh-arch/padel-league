"use client";

import { FRIEND_CIRCLE_COOKIE, FRIEND_CIRCLES, type FriendCircle } from "@/lib/friend-circles";

export function FriendCircleSelector({ selected }: { selected: FriendCircle }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
      <span className="hidden sm:inline">Data</span>
      <select
        className="bg-transparent text-xs font-black text-slate-950 outline-none"
        value={selected}
        onChange={(event) => {
          document.cookie = `${FRIEND_CIRCLE_COOKIE}=${event.target.value}; path=/; max-age=31536000; SameSite=Lax`;
          window.location.reload();
        }}
      >
        {FRIEND_CIRCLES.map((circle) => (
          <option key={circle.value} value={circle.value}>
            {circle.label}
          </option>
        ))}
      </select>
    </label>
  );
}
