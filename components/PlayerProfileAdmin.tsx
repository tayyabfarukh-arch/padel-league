"use client";

import { useMemo, useState } from "react";
import { Archive, BadgeCheck, Merge, RotateCcw, ShieldAlert } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";

export function PlayerProfileAdmin({ players }: { players: Player[] }) {
  const activePlayers = useMemo(() => players.filter((player) => player.is_active !== false), [players]);
  const inactivePlayers = useMemo(() => players.filter((player) => player.is_active === false), [players]);
  const [keepId, setKeepId] = useState(activePlayers[0]?.id ?? players[0]?.id ?? "");
  const [removeId, setRemoveId] = useState(activePlayers.find((player) => player.id !== keepId)?.id ?? players.find((player) => player.id !== keepId)?.id ?? "");
  const [visibilityPlayerId, setVisibilityPlayerId] = useState(activePlayers[0]?.id ?? "");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const keepPlayer = players.find((player) => player.id === keepId);
  const removePlayer = players.find((player) => player.id === removeId);

  function chooseKeep(id: string) {
    setKeepId(id);
    if (id === removeId) setRemoveId(players.find((player) => player.id !== id)?.id ?? "");
    setConfirmation("");
  }

  async function mergeProfiles() {
    if (!supabase || !keepPlayer || !removePlayer || keepPlayer.id === removePlayer.id || confirmation !== "MERGE") return;
    if (!window.confirm(`Keep ${keepPlayer.name} and permanently merge ${removePlayer.name} into it?`)) return;
    setBusy(true);
    setMessage("");
    setError("");
    const { error: mergeError } = await supabase.rpc("merge_player_profiles", {
      p_keep_player_id: keepPlayer.id,
      p_remove_player_id: removePlayer.id
    });
    setBusy(false);
    if (mergeError) {
      setError(mergeError.message);
      return;
    }
    setMessage(`${removePlayer.name} was merged into ${keepPlayer.name}. Reloading the complete player list...`);
    setTimeout(() => window.location.reload(), 900);
  }

  async function setProfileActive(player: Player, isActive: boolean) {
    if (!supabase) return;
    const action = isActive ? "restore" : "disable";
    if (!window.confirm(`${action === "disable" ? "Disable" : "Restore"} ${player.name}?`)) return;
    setBusy(true);
    setMessage("");
    setError("");
    const { error: updateError } = await supabase.from("players").update({ is_active: isActive }).eq("id", player.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage(isActive ? `${player.name} is visible again.` : `${player.name} is now hidden from public player dashboards and selections.`);
    setTimeout(() => window.location.reload(), 900);
  }

  return (
    <section className="sport-card p-5 lg:col-span-2">
      <div className="mb-5">
        <h2 className="text-lg font-black text-slate-950">Player profile management</h2>
        <p className="text-sm font-semibold text-slate-500">Merge accidental duplicates or temporarily hide unused profiles without deleting their records.</p>
      </div>
      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      {message ? <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-start gap-3"><Merge className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h3 className="font-black text-slate-950">Merge duplicate profiles</h3><p className="text-sm font-semibold text-slate-600">Keep the original profile with match history. Remove the newly created duplicate.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PlayerSelect label="Profile to keep" value={keepId} players={players} onChange={chooseKeep} />
            <PlayerSelect label="Duplicate to remove" value={removeId} players={players.filter((player) => player.id !== keepId)} onChange={(id) => { setRemoveId(id); setConfirmation(""); }} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ProfilePreview player={keepPlayer} label="This profile survives" tone="keep" />
            <ProfilePreview player={removePlayer} label="This profile is removed" tone="remove" />
          </div>
          <div className="mt-4 rounded-md border border-amber-200 bg-white p-3 text-xs font-semibold text-amber-900">
            The surviving profile keeps its name and history. The duplicate&apos;s login, teams, appearances, ratings, and votes are transferred. This cannot be undone.
          </div>
          <label className="mt-3 block"><span className="field-label">Type MERGE to confirm</span><input className="field" value={confirmation} onChange={(event) => setConfirmation(event.target.value.toUpperCase())} placeholder="MERGE" /></label>
          <button type="button" className="btn-primary mt-3" disabled={busy || !keepId || !removeId || keepId === removeId || confirmation !== "MERGE"} onClick={() => void mergeProfiles()}><Merge className="h-4 w-4" /> Merge profiles</button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-start gap-3"><Archive className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" /><div><h3 className="font-black text-slate-950">Profile visibility</h3><p className="text-sm font-semibold text-slate-600">Disable a useless profile without permanently deleting it.</p></div></div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <select className="field flex-1" value={visibilityPlayerId} onChange={(event) => setVisibilityPlayerId(event.target.value)}>
              {activePlayers.map((player) => <option key={player.id} value={player.id}>{player.name}{player.user_id ? " (account linked)" : ""}</option>)}
            </select>
            <button type="button" className="btn-secondary shrink-0 text-red-700" disabled={busy || !visibilityPlayerId} onClick={() => { const player = players.find((item) => item.id === visibilityPlayerId); if (player) void setProfileActive(player, false); }}><Archive className="h-4 w-4" /> Disable</button>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">Disabled profiles disappear from public player leaderboards, rating choices, claim lists, and registration selections. Their database history remains available.</p>

          <h4 className="mt-5 text-xs font-black uppercase text-slate-500">Disabled profiles ({inactivePlayers.length})</h4>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {inactivePlayers.map((player) => (
              <div key={player.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
                <PlayerAvatar player={player} size={36} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{player.name}</p><p className="text-xs font-semibold text-slate-500">Hidden</p></div>
                <button type="button" className="btn-secondary min-h-8 px-2 py-1 text-xs" disabled={busy} onClick={() => void setProfileActive(player, true)}><RotateCcw className="h-3.5 w-3.5" /> Restore</button>
              </div>
            ))}
            {!inactivePlayers.length ? <p className="rounded-md bg-white p-3 text-sm font-semibold text-slate-500">No disabled profiles.</p> : null}
          </div>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs font-semibold text-slate-500"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Always merge a duplicate into the original historical profile. If both profiles appear together in one team or Americano match, the website will stop and explain why.</p>
    </section>
  );
}

function PlayerSelect({ label, value, players, onChange }: { label: string; value: string; players: Player[]; onChange: (id: string) => void }) {
  return <label className="block"><span className="field-label">{label}</span><select className="field" value={value} onChange={(event) => onChange(event.target.value)}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}{player.is_active === false ? " (disabled)" : ""}{player.user_id ? " (account)" : ""}</option>)}</select></label>;
}

function ProfilePreview({ player, label, tone }: { player?: Player; label: string; tone: "keep" | "remove" }) {
  if (!player) return <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-500">Select a profile.</div>;
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-md border bg-white p-3 ${tone === "keep" ? "border-emerald-200" : "border-red-200"}`}>
      <PlayerAvatar player={player} size={40} />
      <div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{player.name}</p><p className={`flex items-center gap-1 text-xs font-bold ${tone === "keep" ? "text-emerald-700" : "text-red-700"}`}>{player.user_id ? <BadgeCheck className="h-3.5 w-3.5" /> : null}{label}{player.user_id ? " | account linked" : ""}</p></div>
    </div>
  );
}
