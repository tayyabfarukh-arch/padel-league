"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, LockKeyhole, RotateCcw, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import { formatAwardPeriod } from "@/lib/awards";
import { supabase } from "@/lib/supabase";
import type { AwardCycle, AwardVote, Player } from "@/lib/types";

export function AwardAdminPanel({ players }: { players: Player[] }) {
  const [cycles, setCycles] = useState<AwardCycle[]>([]);
  const [votes, setVotes] = useState<AwardVote[]>([]);
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("weekly");
  const [weeklyWinners, setWeeklyWinners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const activePlayers = useMemo(() => players.filter((player) => player.is_active !== false), [players]);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const [{ data: cycleData, error: cycleError }, { data: voteData, error: voteError }] = await Promise.all([
      supabase.from("award_cycles").select("*, categories:award_categories(*, winners:award_winners(*, player:players(*)))").order("period_end", { ascending: false }),
      supabase.from("award_votes").select("*")
    ]);
    if (cycleError) {
      setError("Run SUPABASE_AWARDS_UPDATE.sql in Supabase first, then refresh this page.");
      setCycles([]);
    } else {
      setCycles((cycleData as AwardCycle[] | null) ?? []);
    }
    if (voteError) setVotes([]);
    else setVotes((voteData as AwardVote[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const weeklyDraft = cycles.find((cycle) => cycle.period_type === "weekly" && cycle.status === "draft");
  const openMonthly = cycles.find((cycle) => cycle.period_type === "monthly" && cycle.status === "open");

  async function createCycle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    const { error: createError } = await supabase.rpc("create_award_cycle", {
      p_period_type: periodType,
      p_title: String(form.get("title") ?? ""),
      p_period_start: String(form.get("period_start") ?? ""),
      p_period_end: String(form.get("period_end") ?? "")
    });
    setBusy(false);
    if (createError) setError(createError.message);
    else {
      setMessage(periodType === "monthly" ? "Monthly voting is now open." : "Weekly award period created. Select the three winners below.");
      event.currentTarget.reset();
      await load();
    }
  }

  async function publishWeekly() {
    if (!supabase || !weeklyDraft) return;
    const categories = weeklyDraft.categories ?? [];
    if (categories.some((category) => !weeklyWinners[category.award_key])) {
      setError("Please select a winner for all three weekly awards.");
      return;
    }
    if (!window.confirm("Publish these three weekly award winners?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { error: publishError } = await supabase.rpc("publish_weekly_awards", {
      p_cycle_id: weeklyDraft.id,
      p_winners: weeklyWinners
    });
    setBusy(false);
    if (publishError) setError(publishError.message);
    else {
      setMessage("Weekly awards published and added to the winners' profiles.");
      setWeeklyWinners({});
      await load();
    }
  }

  async function finalizeMonthly() {
    if (!supabase || !openMonthly) return;
    if (!window.confirm("Close monthly voting and publish the winners? Tied leaders will share the award.")) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { data, error: finalizeError } = await supabase.rpc("finalize_monthly_awards", { p_cycle_id: openMonthly.id });
    setBusy(false);
    if (finalizeError) setError(finalizeError.message);
    else {
      setMessage(`Monthly voting closed. ${Number(data ?? 0)} winner record${Number(data ?? 0) === 1 ? "" : "s"} published.`);
      await load();
    }
  }

  return (
    <section className="sport-card p-5 lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-lg font-black text-slate-950">Weekly and monthly awards</h2><p className="text-sm font-semibold text-slate-500">Admin selects weekly winners. Verified players vote privately for monthly winners.</p></div>
        <button type="button" className="btn-secondary self-start" disabled={busy} onClick={() => void load()}><RotateCcw className="h-4 w-4" /> Refresh</button>
      </div>
      {loading ? <p className="mt-4 text-sm font-bold text-slate-500">Loading awards...</p> : null}
      {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      {message ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <form onSubmit={createCycle} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <h3 className="flex items-center gap-2 font-black text-slate-950"><CalendarPlus className="h-5 w-5 text-court" /> Create award period</h3>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-white p-1 ring-1 ring-slate-200">
            <button type="button" className={periodType === "weekly" ? "btn-primary" : "btn-secondary border-transparent shadow-none"} onClick={() => setPeriodType("weekly")}>Weekly</button>
            <button type="button" className={periodType === "monthly" ? "btn-primary" : "btn-secondary border-transparent shadow-none"} onClick={() => setPeriodType("monthly")}>Monthly</button>
          </div>
          <label className="mt-3 block"><span className="field-label">Title</span><input className="field" name="title" placeholder={periodType === "weekly" ? "Week 1 Awards" : "October 2026 Awards"} required /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="field-label">Start date</span><input className="field" type="date" name="period_start" required /></label>
            <label><span className="field-label">End date</span><input className="field" type="date" name="period_end" required /></label>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">{periodType === "weekly" ? "The period stays in draft until Admin selects and publishes all three winners." : "The six monthly categories open for voting immediately."}</p>
          <button className="btn-primary mt-3" disabled={busy}><CalendarPlus className="h-4 w-4" /> Create {periodType} awards</button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 font-black text-slate-950"><Trophy className="h-5 w-5 text-amber-600" /> Current award period</h3>
          {weeklyDraft ? (
            <div className="mt-4">
              <p className="text-sm font-black text-slate-950">{weeklyDraft.title}</p><p className="text-xs font-semibold text-slate-500">{formatAwardPeriod(weeklyDraft)}</p>
              <div className="mt-3 space-y-3">
                {(weeklyDraft.categories ?? []).sort((a, b) => a.display_order - b.display_order).map((category) => (
                  <label key={category.id} className="block"><span className="field-label">{category.name}</span><select className="field" value={weeklyWinners[category.award_key] ?? ""} onChange={(event) => setWeeklyWinners((current) => ({ ...current, [category.award_key]: event.target.value }))}><option value="">Select winner</option>{activePlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
                ))}
              </div>
              <button type="button" className="btn-primary mt-3" disabled={busy} onClick={() => void publishWeekly()}><CheckCircle2 className="h-4 w-4" /> Publish weekly winners</button>
            </div>
          ) : null}
          {openMonthly ? (
            <div className={`${weeklyDraft ? "mt-5 border-t border-slate-200 pt-5" : "mt-4"}`}><p className="text-sm font-black text-slate-950">{openMonthly.title}</p><p className="text-xs font-semibold text-slate-500">{formatAwardPeriod(openMonthly)}</p><p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Voting is open. {new Set(votes.filter((vote) => (openMonthly.categories ?? []).some((category) => category.id === vote.category_id)).map((vote) => vote.voter_user_id)).size} players have participated.</p><button type="button" className="btn-secondary mt-3 text-red-700" disabled={busy} onClick={() => void finalizeMonthly()}><LockKeyhole className="h-4 w-4" /> Close voting and publish</button></div>
          ) : null}
          {!weeklyDraft && !openMonthly ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">No unpublished weekly awards or open monthly vote.</p> : null}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black uppercase text-slate-500">Published history</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {cycles.filter((cycle) => cycle.status === "closed").slice(0, 8).map((cycle) => (
            <div key={cycle.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-black text-slate-950">{cycle.title}</p><p className="text-xs font-semibold text-slate-500">{formatAwardPeriod(cycle)}</p></div><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{cycle.period_type}</span></div><div className="mt-3 space-y-2">{(cycle.categories ?? []).flatMap((category) => (category.winners ?? []).map((winner) => <div key={winner.id} className="flex items-center gap-2 text-sm"><PlayerAvatar player={winner.player} size={30} /><span className="min-w-0 flex-1 truncate font-bold text-slate-700">{category.name}</span><span className="truncate font-black text-slate-950">{winner.player?.name}</span></div>))}</div></div>
          ))}
          {!cycles.some((cycle) => cycle.status === "closed") ? <p className="text-sm font-semibold text-slate-500">No awards have been published yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
