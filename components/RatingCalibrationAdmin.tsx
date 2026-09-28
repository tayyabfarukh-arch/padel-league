"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, LockKeyhole, RotateCcw, UnlockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Player, PlayerRatingVote, RatingCalibration, RatingCalibrationStatus } from "@/lib/types";
import { PlayerAvatar } from "./Avatar";

export function RatingCalibrationAdmin({ players }: { players: Player[] }) {
  const [calibration, setCalibration] = useState<RatingCalibration | null>(null);
  const [votes, setVotes] = useState<PlayerRatingVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const { data: calibrationData, error: calibrationError } = await supabase
      .from("rating_calibrations").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (calibrationError) {
      setError("Run SUPABASE_PLAYER_RATING_VOTE_UPDATE.sql first, then refresh this page.");
      setLoading(false);
      return;
    }
    const nextCalibration = (calibrationData as RatingCalibration | null) ?? null;
    setCalibration(nextCalibration);
    if (nextCalibration) {
      const { data: voteData, error: voteError } = await supabase.from("player_rating_votes").select("*").eq("calibration_id", nextCalibration.id);
      if (voteError) setError(voteError.message);
      setVotes((voteData as PlayerRatingVote[] | null) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(status: RatingCalibrationStatus) {
    if (!supabase || !calibration) return;
    setBusy(true);
    setMessage("");
    setError("");
    const dates = status === "open" ? { opened_at: new Date().toISOString(), closed_at: null } : status === "closed" ? { closed_at: new Date().toISOString() } : {};
    const { error: updateError } = await supabase.from("rating_calibrations").update({ status, ...dates }).eq("id", calibration.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage(status === "open" ? "Player rating voting is now open." : "Voting is closed. Saved votes are unchanged.");
    await load();
  }

  const summaries = useMemo(() => players.map((player) => {
    const ratings = votes.filter((vote) => vote.rated_player_id === player.id && vote.rating !== null).map((vote) => Number(vote.rating)).sort((a, b) => a - b);
    const skipped = votes.filter((vote) => vote.rated_player_id === player.id && vote.rating === null).length;
    const included = ratings.length >= 5 ? ratings.slice(1, -1) : ratings;
    const average = included.length ? included.reduce((total, rating) => total + rating, 0) / included.length : null;
    return { player, votes: ratings.length, skipped, average, trimmed: ratings.length >= 5 };
  }).sort((a, b) => (b.average ?? -1) - (a.average ?? -1)), [players, votes]);
  const voterCount = new Set(votes.map((vote) => vote.voter_user_id)).size;
  const numericVoteCount = votes.filter((vote) => vote.rating !== null).length;

  return (
    <section className="sport-card p-5 lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-black text-slate-950">Player rating calibration</h2><p className="text-sm font-semibold text-slate-500">Private community voting for the future 1–10 rating baseline. This does not change current leaderboards.</p></div>
        {calibration ? <span className={`self-start rounded-md px-3 py-2 text-sm font-black ${calibration.status === "open" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{calibration.status === "open" ? "Voting open" : "Voting closed"}</span> : null}
      </div>
      {loading ? <p className="mt-4 text-sm font-bold text-slate-500">Loading rating votes...</p> : null}
      {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      {message ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      {calibration ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Participating voters" value={voterCount} /><Metric label="Numeric ratings" value={numericVoteCount} /><Metric label="Don't know choices" value={votes.length - numericVoteCount} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {calibration.status === "open" ? <button className="btn-secondary text-red-700" disabled={busy} onClick={() => void changeStatus("closed")}><LockKeyhole className="h-4 w-4" /> Close voting</button> : <button className="btn-primary" disabled={busy} onClick={() => void changeStatus("open")}><UnlockKeyhole className="h-4 w-4" /> {calibration.status === "draft" ? "Open voting" : "Reopen voting"}</button>}
            <button className="btn-secondary" disabled={busy} onClick={() => void load()}><RotateCcw className="h-4 w-4" /> Refresh totals</button>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[1fr_70px_82px] bg-ink px-3 py-2 text-[10px] font-black uppercase text-slate-300 sm:grid-cols-[1fr_100px_100px_120px]"><span>Player</span><span className="text-center">Votes</span><span className="hidden text-center sm:block">Skipped</span><span className="text-center">Baseline</span></div>
            {summaries.map((summary) => {
              const ready = summary.votes >= calibration.min_votes;
              return (
                <div key={summary.player.id} className="grid grid-cols-[1fr_70px_82px] items-center border-t border-slate-100 px-3 py-2 sm:grid-cols-[1fr_100px_100px_120px]">
                  <div className="flex min-w-0 items-center gap-2"><PlayerAvatar player={summary.player} size={36} /><span className="truncate text-sm font-black text-slate-950">{summary.player.name}</span></div>
                  <span className="text-center text-sm font-black text-slate-700">{summary.votes}</span><span className="hidden text-center text-sm font-bold text-slate-500 sm:block">{summary.skipped}</span>
                  <span className={`text-center text-sm font-black ${ready ? "text-court" : "text-slate-400"}`} title={summary.trimmed ? "Highest and lowest rating removed" : undefined}>{ready && summary.average !== null ? summary.average.toFixed(2) : `Need ${Math.max(0, calibration.min_votes - summary.votes)}`}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-slate-500"><BarChart3 className="mt-0.5 h-4 w-4 shrink-0" /> A player needs at least {calibration.min_votes} numeric ratings. From five ratings onward, one highest and one lowest rating are removed before averaging.</p>
        </>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>;
}
