"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, LogIn, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/Avatar";
import { PlayerPicker } from "@/components/PlayerPicker";
import { awardTone, formatAwardPeriod } from "@/lib/awards";
import { supabase } from "@/lib/supabase";
import type { AwardCycle, AwardVote, Player, PublishedAwardVoteTotal } from "@/lib/types";

function PublishedVoteBreakdown({ cycle, totals, players }: { cycle: AwardCycle; totals: PublishedAwardVoteTotal[]; players: Player[] }) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const categoryResults = [...(cycle.categories ?? [])]
    .filter((category) => category.selection_method === "vote")
    .sort((a, b) => a.display_order - b.display_order)
    .map((category) => {
      const results = totals
        .filter((total) => total.category_id === category.id)
        .map((total) => ({ player: playersById.get(total.nominee_player_id), votes: Number(total.vote_count) }))
        .filter((result): result is { player: Player; votes: number } => Boolean(result.player))
        .sort((a, b) => b.votes - a.votes || a.player.name.localeCompare(b.player.name));
      return {
        category,
        results,
        totalVotes: results.reduce((sum, result) => sum + result.votes, 0),
        topVotes: results[0]?.votes ?? 0
      };
    });
  const participantCount = Number(totals[0]?.participant_count ?? 0);
  const totalVotes = totals.reduce((sum, total) => sum + Number(total.vote_count), 0);

  return (
    <div className="sport-card overflow-hidden">
      <div className="flex flex-col gap-2 bg-ink px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-black">{cycle.title}</p><p className="text-xs font-semibold text-slate-300">{formatAwardPeriod(cycle)}</p></div>
        <p className="text-xs font-black text-limeball">{participantCount} participant{participantCount === 1 ? "" : "s"} · {totalVotes} total vote{totalVotes === 1 ? "" : "s"}</p>
      </div>
      <div className="p-4">
        <p className="mb-3 text-xs font-semibold text-slate-500">Scroll sideways to see the complete result for every award.</p>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2">
          {categoryResults.map(({ category, results, totalVotes: categoryVoteCount, topVotes }) => (
            <div key={category.id} className="min-w-[290px] snap-start overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5">
                <p className="truncate text-xs font-black uppercase text-slate-700" title={category.name}>{category.name}</p>
                <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{categoryVoteCount} vote{categoryVoteCount === 1 ? "" : "s"}</span>
              </div>
              <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
                {results.map(({ player, votes }, index) => (
                  <Link key={player.id} href={`/players/${player.id}`} className={`flex items-center gap-2 px-3 py-2 transition hover:bg-white ${votes === topVotes ? "bg-emerald-50" : "bg-slate-50"}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-black ${votes === topVotes ? "bg-court text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{index + 1}</span>
                    <PlayerAvatar player={player} size={30} />
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{player.name}</span>
                    <div className="shrink-0 text-right"><p className="text-sm font-black text-slate-950">{votes}</p><p className="text-[10px] font-bold text-slate-500">{categoryVoteCount ? Math.round((votes / categoryVoteCount) * 100) : 0}%</p></div>
                  </Link>
                ))}
                {!results.length ? <p className="p-3 text-sm font-bold text-slate-400">No votes recorded</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AwardsPanel({ cycles, players, publishedVoteTotals }: { cycles: AwardCycle[]; players: Player[]; publishedVoteTotals: PublishedAwardVoteTotal[] }) {
  const router = useRouter();
  const openCycle = cycles.find((cycle) => cycle.period_type === "monthly" && cycle.status === "open");
  const categories = useMemo(() => [...(openCycle?.categories ?? [])].sort((a, b) => a.display_order - b.display_order), [openCycle]);
  const [userId, setUserId] = useState("");
  const [voterPlayer, setVoterPlayer] = useState<Player | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    async function applyUser(nextUserId: string) {
      setUserId(nextUserId);
      setVoterPlayer(null);
      setChoices({});
      if (!nextUserId || !openCycle) { setChecking(false); return; }
      const [{ data: playerData }, { data: voteData }] = await Promise.all([
        supabase!.from("players").select("*").eq("user_id", nextUserId).eq("is_active", true).maybeSingle(),
        supabase!.from("award_votes").select("*").eq("voter_user_id", nextUserId).in("category_id", categories.map((category) => category.id))
      ]);
      setVoterPlayer((playerData as Player | null) ?? null);
      const saved = Object.fromEntries(((voteData as AwardVote[] | null) ?? []).map((vote) => [vote.category_id, vote.nominee_player_id]));
      setChoices(saved);
      setChecking(false);
    }
    supabase.auth.getSession().then(({ data }) => void applyUser(data.session?.user.id ?? ""));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => void applyUser(session?.user.id ?? ""));
    return () => listener.subscription.unsubscribe();
  }, [categories, openCycle]);

  async function saveVotes() {
    if (!supabase || !openCycle || !userId || !voterPlayer) return;
    if (categories.some((category) => !choices[category.id])) {
      setError("Please choose one player for all six monthly awards.");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    const rows = categories.map((category) => ({ category_id: category.id, voter_user_id: userId, voter_player_id: voterPlayer.id, nominee_player_id: choices[category.id] }));
    const { error: saveError } = await supabase.from("award_votes").upsert(rows, { onConflict: "category_id,voter_user_id" });
    setBusy(false);
    if (saveError) setError(saveError.message);
    else {
      setMessage("All six monthly award votes have been saved. You can change them until voting closes.");
      router.refresh();
    }
  }

  const eligiblePlayers = players.filter((player) => player.is_active !== false && player.id !== voterPlayer?.id);
  const published = cycles.filter((cycle) => cycle.status === "closed" && (cycle.categories ?? []).some((category) => (category.winners ?? []).length));
  const publishedMonthly = published.filter((cycle) => cycle.period_type === "monthly");

  return (
    <div className="space-y-6">
      {openCycle ? (
        <section className="sport-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase text-court">Monthly community vote</p><h2 className="mt-1 text-2xl font-black text-slate-950">{openCycle.title}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{formatAwardPeriod(openCycle)}. Individual votes remain private.</p></div><span className="self-start rounded-md bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-800">Voting open</span></div>
          {!checking && !userId ? <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">Sign in with your approved player account to vote.</p><Link href="/account" className="btn-primary"><LogIn className="h-4 w-4" /> Sign in</Link></div> : null}
          {!checking && userId && !voterPlayer ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">Your account needs an approved active player profile before you can vote.</p> : null}
          {voterPlayer ? <div className="mt-5 grid gap-4 md:grid-cols-2">{categories.map((category) => <div key={category.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"><span className="flex items-center gap-2 font-black text-slate-950"><Award className="h-4 w-4 text-amber-600" /> {category.name}</span><span className="mb-2 mt-1 block min-h-10 text-xs font-semibold text-slate-500">{category.description}</span><PlayerPicker players={eligiblePlayers} value={choices[category.id] ?? ""} required={false} placeholder="Choose a player" onChange={(playerId) => setChoices((current) => ({ ...current, [category.id]: playerId }))} /></div>)}</div> : null}
          {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
          {message ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
          {voterPlayer ? <button type="button" className="btn-primary mt-4" disabled={busy} onClick={() => void saveVotes()}><CheckCircle2 className="h-4 w-4" /> {busy ? "Saving all votes..." : "Save all six votes"}</button> : null}
        </section>
      ) : <section className="sport-card p-5"><h2 className="text-xl font-black text-slate-950">Monthly voting is currently closed</h2><p className="mt-1 text-sm font-semibold text-slate-500">The next voting form will appear here when Admin opens a new monthly award period.</p></section>}

      <section>
        <h2 className="section-title">Award winners</h2>
        <div className="space-y-4">
          {published.map((cycle) => (
            <div key={cycle.id} className="sport-card overflow-hidden"><div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white"><div><p className="font-black">{cycle.title}</p><p className="text-xs font-semibold text-slate-300">{formatAwardPeriod(cycle)}</p></div><span className="rounded bg-white/10 px-2 py-1 text-[10px] font-black uppercase">{cycle.period_type}</span></div><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{(cycle.categories ?? []).sort((a, b) => a.display_order - b.display_order).flatMap((category) => (category.winners ?? []).map((winner) => <Link key={winner.id} href={`/players/${winner.player_id}`} className={`flex items-center gap-3 rounded-lg border p-3 transition hover:-translate-y-0.5 ${awardTone(category.award_key)}`}><PlayerAvatar player={winner.player} size={44} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-black uppercase opacity-70">{category.name}</p><p className="truncate font-black">{winner.player?.name}</p></div><Trophy className="h-5 w-5 shrink-0" /></Link>))}</div></div>
          ))}
          {!published.length ? <p className="sport-card p-4 text-sm font-semibold text-slate-500">No awards have been published yet.</p> : null}
        </div>
      </section>

      {publishedMonthly.length ? (
        <section>
          <h2 className="section-title">Published voting results</h2>
          <p className="mb-3 text-sm font-semibold text-slate-500">Final anonymous totals are published for transparency after monthly voting closes.</p>
          <div className="space-y-4">
            {publishedMonthly.map((cycle) => (
              <PublishedVoteBreakdown key={cycle.id} cycle={cycle} totals={publishedVoteTotals.filter((total) => total.cycle_id === cycle.id)} players={players} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
