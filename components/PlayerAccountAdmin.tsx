"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, RefreshCw, UserRoundCheck, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AppUser, Player, PlayerClaim, PlayerRegistrationDetails } from "@/lib/types";

export function PlayerAccountAdmin() {
  const [claims, setClaims] = useState<PlayerClaim[]>([]);
  const [accounts, setAccounts] = useState<AppUser[]>([]);
  const [details, setDetails] = useState<PlayerRegistrationDetails[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function loadAccounts() {
    if (!supabase) return;
    setLoading(true);
    const [claimResult, accountResult, detailResult, playerResult] = await Promise.all([
      supabase.from("player_claims").select("*, player:players(*), account:app_users!player_claims_user_id_fkey(*)").order("created_at", { ascending: false }),
      supabase.from("app_users").select("*").order("created_at", { ascending: false }),
      supabase.from("player_registration_details").select("*").order("created_at", { ascending: false }),
      supabase.from("players").select("*").not("user_id", "is", null)
    ]);
    setClaims((claimResult.data as PlayerClaim[] | null) ?? []);
    setAccounts((accountResult.data as AppUser[] | null) ?? []);
    setDetails((detailResult.data as PlayerRegistrationDetails[] | null) ?? []);
    setPlayers((playerResult.data as Player[] | null) ?? []);
    const generalError = claimResult.error ?? accountResult.error ?? playerResult.error;
    setMessage(detailResult.error ? "Run SUPABASE_SIGNUP_DETAILS_UPDATE.sql in Supabase, then refresh this page." : generalError?.message ?? "");
    setLoading(false);
  }

  useEffect(() => { void loadAccounts(); }, []);

  async function review(id: string, approve: boolean) {
    if (!supabase) return;
    setBusyId(id);
    setMessage("");
    const { error } = await supabase.rpc(approve ? "approve_player_claim" : "reject_player_claim", { p_claim_id: id });
    setBusyId("");
    setMessage(error ? error.message : approve ? "Player account approved." : "Player account request rejected.");
    if (!error) await loadAccounts();
  }

  const pending = claims.filter((item) => item.status === "pending");
  const detailByUser = new Map(details.map((item) => [item.user_id, item]));
  const playerByUser = new Map(players.filter((player) => player.user_id).map((player) => [player.user_id!, player]));
  const claimByUser = new Map<string, PlayerClaim>();
  claims.forEach((claim) => { if (!claimByUser.has(claim.user_id)) claimByUser.set(claim.user_id, claim); });
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = accounts.filter((account) => new Date(account.created_at).getTime() >= recentCutoff).length;
  return (
    <section className="space-y-5 lg:col-span-2">
      <div className="sport-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-slate-950">New sign-ups dashboard</h2><p className="text-sm text-slate-500">Newest accounts first. Personal details are visible only to the player and Admin.</p></div>
        <button className="btn-secondary px-3" onClick={() => void loadAccounts()} title="Refresh accounts"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {message ? <p className="mb-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><Metric icon={Users} label="Total accounts" value={accounts.length} /><Metric icon={Clock3} label="Last 7 days" value={recentCount} /><Metric icon={UserRoundCheck} label="Pending claims" value={pending.length} /></div>
      {loading ? <p className="text-sm font-bold text-slate-500">Loading sign-ups...</p> : (
        <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {accounts.map((account) => {
            const accountDetails = detailByUser.get(account.id);
            const linkedPlayer = playerByUser.get(account.id);
            const claim = claimByUser.get(account.id);
            const status = linkedPlayer ? `Linked to ${linkedPlayer.name}` : claim?.status === "pending" ? "Claim awaiting approval" : claim?.status === "rejected" ? "Claim rejected" : "No linked player yet";
            return (
              <div key={account.id} className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0"><p className="truncate font-black text-slate-950">{accountDetails?.full_name ?? `@${account.username}`}</p><p className="text-sm font-semibold text-court">@{account.username}</p><p className="mt-1 text-xs font-bold text-slate-500">Joined {new Date(account.created_at).toLocaleString()}</p></div>
                  <span className={`self-start rounded-md px-2 py-1 text-xs font-black ${linkedPlayer ? "bg-emerald-100 text-emerald-800" : claim?.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{status}</span>
                </div>
                {accountDetails ? <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><Detail label="Mobile" value={accountDetails.phone_number} /><Detail label="Nationality" value={accountDetails.nationality} /><Detail label="Playing level" value={formatLevel(accountDetails.playing_level)} /></div> : <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-900">Registration details not completed. This account existed before the new form.</p>}
              </div>
            );
          })}
          {!accounts.length ? <p className="p-4 text-sm font-semibold text-slate-500">No player accounts yet.</p> : null}
        </div>
      )}
      </div>

      <div className="sport-card p-4">
      <div className="mb-4"><h2 className="text-lg font-black text-slate-950">Player account requests</h2><p className="text-sm text-slate-500">Approve only after confirming the account belongs to that player.</p></div>
      {!loading && pending.length ? (
        <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {pending.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="font-black text-slate-950">{item.player?.name}</p><p className="text-sm text-slate-500">Account: @{item.account?.username ?? "unknown"}</p></div>
              <div className="flex gap-2"><button className="btn-primary" disabled={busyId === item.id} onClick={() => void review(item.id, true)}><Check className="h-4 w-4" /> Approve</button><button className="btn-secondary text-red-700" disabled={busyId === item.id} onClick={() => void review(item.id, false)}><X className="h-4 w-4" /> Reject</button></div>
            </div>
          ))}
        </div>
      ) : !loading ? <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-500">No player account requests are waiting.</p> : null}
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="rounded-md bg-slate-50 p-3"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><p className="text-xs font-black uppercase">{label}</p></div><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className="mt-0.5 truncate font-bold text-slate-800">{value}</p></div>;
}

function formatLevel(level: string) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}
