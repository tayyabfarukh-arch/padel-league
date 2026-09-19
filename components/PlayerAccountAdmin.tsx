"use client";

import { useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { PlayerClaim } from "@/lib/types";

export function PlayerAccountAdmin() {
  const [claims, setClaims] = useState<PlayerClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function loadClaims() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("player_claims")
      .select("*, player:players(*), account:app_users!player_claims_user_id_fkey(*)")
      .order("created_at", { ascending: false });
    setClaims((data as PlayerClaim[] | null) ?? []);
    setMessage(error?.message ?? "");
    setLoading(false);
  }

  useEffect(() => { void loadClaims(); }, []);

  async function review(id: string, approve: boolean) {
    if (!supabase) return;
    setBusyId(id);
    setMessage("");
    const { error } = await supabase.rpc(approve ? "approve_player_claim" : "reject_player_claim", { p_claim_id: id });
    setBusyId("");
    setMessage(error ? error.message : approve ? "Player account approved." : "Player account request rejected.");
    if (!error) await loadClaims();
  }

  const pending = claims.filter((item) => item.status === "pending");
  return (
    <section className="sport-card p-4 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-slate-950">Player account requests</h2><p className="text-sm text-slate-500">Approve only after confirming the account belongs to that player.</p></div>
        <button className="btn-secondary px-3" onClick={() => void loadClaims()} title="Refresh requests"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {message ? <p className="mb-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
      {loading ? <p className="text-sm font-bold text-slate-500">Loading requests...</p> : pending.length ? (
        <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {pending.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="font-black text-slate-950">{item.player?.name}</p><p className="text-sm text-slate-500">Account: @{item.account?.username ?? "unknown"}</p></div>
              <div className="flex gap-2"><button className="btn-primary" disabled={busyId === item.id} onClick={() => void review(item.id, true)}><Check className="h-4 w-4" /> Approve</button><button className="btn-secondary text-red-700" disabled={busyId === item.id} onClick={() => void review(item.id, false)}><X className="h-4 w-4" /> Reject</button></div>
            </div>
          ))}
        </div>
      ) : <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-500">No player account requests are waiting.</p>}
    </section>
  );
}
