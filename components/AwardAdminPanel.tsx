"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, LockKeyhole, RotateCcw, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import { PlayerPicker } from "@/components/PlayerPicker";
import { formatAwardPeriod } from "@/lib/awards";
import { supabase } from "@/lib/supabase";
import type { AwardCategory, AwardCycle, AwardVote, Player } from "@/lib/types";

type AwardCategoryResult = {
  category: AwardCategory;
  results: { player: Player; total: number }[];
  totalVotes: number;
  topVotes: number;
};

function calculateAwardResults(cycle: AwardCycle, votes: AwardVote[], players: Player[]): AwardCategoryResult[] {
  const playersById = new Map(players.map((player) => [player.id, player]));

  return [...(cycle.categories ?? [])]
    .filter((category) => category.selection_method === "vote")
    .sort((a, b) => a.display_order - b.display_order)
    .map((category) => {
      const totals = new Map<string, number>();
      for (const vote of votes) {
        if (vote.category_id !== category.id || !playersById.has(vote.nominee_player_id)) continue;
        totals.set(vote.nominee_player_id, (totals.get(vote.nominee_player_id) ?? 0) + 1);
      }
      const results = [...totals.entries()]
        .map(([playerId, total]) => ({ player: playersById.get(playerId), total }))
        .filter((result): result is { player: Player; total: number } => Boolean(result.player))
        .sort((a, b) => b.total - a.total || a.player.name.localeCompare(b.player.name));
      const totalVotes = results.reduce((sum, result) => sum + result.total, 0);

      return { category, results, totalVotes, topVotes: results[0]?.total ?? 0 };
    });
}

function AwardResultsStrip({ results }: { results: AwardCategoryResult[] }) {
  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2">
      {results.map(({ category, results: playerResults, totalVotes, topVotes }) => (
        <div key={category.id} className="min-w-[290px] snap-start overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5">
            <p className="truncate text-xs font-black uppercase text-slate-700" title={category.name}>{category.name}</p>
            <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
              {totalVotes} vote{totalVotes === 1 ? "" : "s"}
            </span>
          </div>
          {playerResults.length ? (
            <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
              {playerResults.map(({ player, total }, index) => (
                <div key={player.id} className={`flex items-center gap-2 px-3 py-2 ${total === topVotes ? "bg-emerald-50" : "bg-slate-50"}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-black ${total === topVotes ? "bg-court text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
                    {index + 1}
                  </span>
                  <PlayerAvatar player={player} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{player.name}</span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-slate-950">{total}</p>
                    <p className="text-[10px] font-bold text-slate-500">{totalVotes ? Math.round((total / totalVotes) * 100) : 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-3 text-sm font-bold text-slate-400">No votes recorded</p>
          )}
        </div>
      ))}
    </div>
  );
}

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

  const load = useCallback(async (silent = false) => {
    if (!supabase) return;
    if (!silent) {
      setLoading(true);
      setError("");
    }
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
  const openMonthlyId = openMonthly?.id;
  const monthlyParticipantCount = useMemo(() => {
    if (!openMonthly) return 0;
    const categoryIds = new Set((openMonthly.categories ?? []).map((category) => category.id));
    return new Set(votes.filter((vote) => categoryIds.has(vote.category_id)).map((vote) => vote.voter_user_id)).size;
  }, [openMonthly, votes]);
  const monthlyVoteCount = useMemo(() => {
    if (!openMonthly) return 0;
    const categoryIds = new Set((openMonthly.categories ?? []).map((category) => category.id));
    return votes.filter((vote) => categoryIds.has(vote.category_id)).length;
  }, [openMonthly, votes]);
  const liveMonthlyResults = useMemo(() => {
    if (!openMonthly) return [];
    return calculateAwardResults(openMonthly, votes, players);
  }, [openMonthly, players, votes]);

  useEffect(() => {
    if (!openMonthlyId) return;
    const timer = window.setInterval(() => { void load(true); }, 15000);
    return () => window.clearInterval(timer);
  }, [load, openMonthlyId]);

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
                  <PlayerPicker key={category.id} label={category.name} players={activePlayers} value={weeklyWinners[category.award_key] ?? ""} required={false} placeholder="Select winner" onChange={(playerId) => setWeeklyWinners((current) => ({ ...current, [category.award_key]: playerId }))} />
                ))}
              </div>
              <button type="button" className="btn-primary mt-3" disabled={busy} onClick={() => void publishWeekly()}><CheckCircle2 className="h-4 w-4" /> Publish weekly winners</button>
            </div>
          ) : null}
          {openMonthly ? (
            <div className={`${weeklyDraft ? "mt-5 border-t border-slate-200 pt-5" : "mt-4"}`}>
              <p className="text-sm font-black text-slate-950">{openMonthly.title}</p>
              <p className="text-xs font-semibold text-slate-500">{formatAwardPeriod(openMonthly)}</p>
              <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                Voting is open. {monthlyParticipantCount} player{monthlyParticipantCount === 1 ? " has" : "s have"} participated and {monthlyVoteCount} vote{monthlyVoteCount === 1 ? " has" : "s have"} been recorded.
              </p>

              <div className="mt-4">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-700">Full live voting results</p>
                    <p className="text-[11px] font-semibold text-slate-500">Scroll sideways to see every category. Individual votes remain private.</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-slate-400">Updates every 15 sec</span>
                </div>
                <AwardResultsStrip results={liveMonthlyResults} />
              </div>

              <button type="button" className="btn-secondary mt-3 text-red-700" disabled={busy} onClick={() => void finalizeMonthly()}><LockKeyhole className="h-4 w-4" /> Close voting and publish</button>
            </div>
          ) : null}
          {!weeklyDraft && !openMonthly ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">No unpublished weekly awards or open monthly vote.</p> : null}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black uppercase text-slate-500">Published history</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {cycles.filter((cycle) => cycle.status === "closed").slice(0, 8).map((cycle) => {
            const cycleCategoryIds = new Set((cycle.categories ?? []).map((category) => category.id));
            const cycleVotes = votes.filter((vote) => cycleCategoryIds.has(vote.category_id));
            const participants = new Set(cycleVotes.map((vote) => vote.voter_user_id)).size;
            const publishedResults = cycle.period_type === "monthly" ? calculateAwardResults(cycle, votes, players) : [];

            return (
              <div key={cycle.id} className={`rounded-lg border border-slate-200 bg-white p-4 ${cycle.period_type === "monthly" ? "md:col-span-2" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-black text-slate-950">{cycle.title}</p><p className="text-xs font-semibold text-slate-500">{formatAwardPeriod(cycle)}</p></div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{cycle.period_type}</span>
                </div>
                <div className="mt-3 space-y-2">{(cycle.categories ?? []).flatMap((category) => (category.winners ?? []).map((winner) => <div key={winner.id} className="flex items-center gap-2 text-sm"><PlayerAvatar player={winner.player} size={30} /><span className="min-w-0 flex-1 truncate font-bold text-slate-700">{category.name}</span><span className="truncate font-black text-slate-950">{winner.player?.name}</span></div>))}</div>
                {cycle.period_type === "monthly" ? (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-700">Published voting breakdown</p>
                        <p className="text-[11px] font-semibold text-slate-500">{participants} participant{participants === 1 ? "" : "s"} · {cycleVotes.length} total vote{cycleVotes.length === 1 ? "" : "s"}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">Scroll sideways for all categories</span>
                    </div>
                    <AwardResultsStrip results={publishedResults} />
                  </div>
                ) : null}
              </div>
            );
          })}
          {!cycles.some((cycle) => cycle.status === "closed") ? <p className="text-sm font-semibold text-slate-500">No awards have been published yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
