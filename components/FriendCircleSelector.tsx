"use client";

import { FRIEND_CIRCLE_COOKIE, FRIEND_CIRCLES, type FriendCircle } from "@/lib/friend-circles";

export function FriendCircleSelector({ selected }: { selected: FriendCircle }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-xs font-bold text-slate-300 shadow-sm">
      <span className="hidden sm:inline">Data</span>
      <select
        className="max-w-32 bg-transparent text-xs font-black text-white outline-none sm:max-w-none [&>option]:text-slate-950"
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
