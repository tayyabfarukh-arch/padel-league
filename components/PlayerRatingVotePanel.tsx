"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, LockKeyhole, LogIn, Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Player, PlayerRatingVote, RatingCalibration } from "@/lib/types";
import { PlayerAvatar } from "./Avatar";

type Choice = number | null;

export function PlayerRatingVotePanel({ players }: { players: Player[] }) {
  const [calibration, setCalibration] = useState<RatingCalibration | null>(null);
  const [linkedPlayer, setLinkedPlayer] = useState<Player | null>(null);
  const [userId, setUserId] = useState("");
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [decidedIds, setDecidedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<"all" | "remaining" | "completed">("all");
  const [busyPlayerId, setBusyPlayerId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const nextUserId = sessionData.session?.user.id ?? "";
    setUserId(nextUserId);

    const { data: calibrationData, error: calibrationError } = await supabase
      .from("rating_calibrations").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (calibrationError) {
      setError("The rating vote is not ready yet. The Admin needs to run the Supabase rating update first.");
      setLoading(false);
      return;
    }
    const nextCalibration = (calibrationData as RatingCalibration | null) ?? null;
    setCalibration(nextCalibration);

    if (!nextUserId) {
      setLinkedPlayer(null);
      setLoading(false);
      return;
    }

    const { data: playerData } = await supabase.from("players").select("*").eq("user_id", nextUserId).maybeSingle();
    const nextPlayer = (playerData as Player | null) ?? null;
    setLinkedPlayer(nextPlayer);
    if (!nextPlayer || !nextCalibration) {
      setLoading(false);
      return;
    }

    const { data: voteData, error: voteError } = await supabase
      .from("player_rating_votes").select("*").eq("calibration_id", nextCalibration.id).eq("voter_user_id", nextUserId);
    if (voteError) setError(voteError.message);
    const nextChoices: Record<string, Choice> = {};
    const nextDecidedIds: string[] = [];
    for (const vote of (voteData ?? []) as PlayerRatingVote[]) {
      nextChoices[vote.rated_player_id] = vote.rating;
      nextDecidedIds.push(vote.rated_player_id);
    }
    setChoices(nextChoices);
    setDecidedIds(nextDecidedIds);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => void load());
    return () => data.subscription.unsubscribe();
  }, [load]);

  const eligiblePlayers = useMemo(() => players.filter((player) => player.id !== linkedPlayer?.id), [linkedPlayer?.id, players]);
  const decided = useMemo(() => new Set(decidedIds), [decidedIds]);
  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return eligiblePlayers.filter((player) => {
      if (query && !player.name.toLowerCase().includes(query)) return false;
      if (show === "remaining" && decided.has(player.id)) return false;
      if (show === "completed" && !decided.has(player.id)) return false;
      return true;
    });
  }, [decided, eligiblePlayers, search, show]);

  async function saveChoice(playerId: string, rating: Choice) {
    if (!supabase || !calibration || !linkedPlayer || !userId || calibration.status !== "open") return;
    setBusyPlayerId(playerId);
    setMessage("");
    setError("");
    const { error: saveError } = await supabase.from("player_rating_votes").upsert({
      calibration_id: calibration.id,
      voter_user_id: userId,
      voter_player_id: linkedPlayer.id,
      rated_player_id: playerId,
      rating
    }, { onConflict: "calibration_id,voter_user_id,rated_player_id" });
    setBusyPlayerId("");
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setChoices((current) => ({ ...current, [playerId]: rating }));
    setDecidedIds((current) => current.includes(playerId) ? current : [...current, playerId]);
    setMessage(rating === null ? "Marked as unfamiliar. You can change this anytime while voting is open." : "Rating saved privately.");
  }

  if (!supabase) return <Notice text="Connect Supabase before using player ratings." />;
  if (loading) return <Notice text="Checking your player account and saved ratings..." loading />;
  if (error && !calibration) return <ErrorNotice text={error} />;
  if (!userId) return <Notice text="Sign in with your player account before rating players."><Link href="/account" className="btn-primary mt-3"><LogIn className="h-4 w-4" /> Sign in</Link></Notice>;
  if (!linkedPlayer) return <Notice text="Your account must be linked to a player profile before you can vote. Claim or create your profile from the Account page." />;
  if (!calibration) return <Notice text="The Admin has not created a rating calibration yet." />;

  const completeCount = decidedIds.length;
  const progress = eligiblePlayers.length ? Math.round((completeCount / eligiblePlayers.length) * 100) : 100;
  const votingOpen = calibration.status === "open";

  return (
    <div className="space-y-5">
      <section className="sport-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <PlayerAvatar player={linkedPlayer} size={52} />
            <div className="min-w-0"><p className="text-xs font-black uppercase text-court">Voting as</p><h2 className="truncate text-lg font-black text-slate-950">{linkedPlayer.name}</h2><p className="text-sm font-semibold text-slate-500">Your individual choices are private.</p></div>
          </div>
          <span className={`rounded-md px-3 py-2 text-sm font-black ${votingOpen ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{votingOpen ? "Voting open" : "Voting closed"}</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-court transition-all" style={{ width: `${progress}%` }} /></div>
        <p className="mt-2 text-sm font-bold text-slate-600">{completeCount} of {eligiblePlayers.length} players reviewed ({progress}%)</p>
      </section>

      <section className="sport-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player name" /></label>
          <label className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-slate-500" /><select className="field" value={show} onChange={(event) => setShow(event.target.value as typeof show)}><option value="all">All players</option><option value="remaining">Not reviewed</option><option value="completed">Reviewed</option></select></label>
        </div>
      </section>

      {!votingOpen ? <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"><LockKeyhole className="h-5 w-5 shrink-0" /> Voting is closed. Your saved choices remain private and cannot be changed right now.</div> : null}
      {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <ErrorNotice text={error} /> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {visiblePlayers.map((player) => {
          const hasChoice = decided.has(player.id);
          const choice = choices[player.id];
          const busy = busyPlayerId === player.id;
          return (
            <article key={player.id} className={`sport-card p-4 ${hasChoice ? "border-emerald-200" : ""}`}>
              <div className="flex items-center gap-3">
                <PlayerAvatar player={player} size={48} />
                <div className="min-w-0 flex-1"><h3 className="truncate font-black text-slate-950">{player.name}</h3><p className="text-xs font-semibold text-slate-500">How would you rate this player?</p></div>
                {busy ? <LoaderCircle className="h-5 w-5 animate-spin text-court" /> : hasChoice ? <Check className="h-5 w-5 text-court" /> : null}
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
                  <button key={rating} type="button" disabled={!votingOpen || Boolean(busyPlayerId)} onClick={() => void saveChoice(player.id, rating)} className={`h-10 rounded-md text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${hasChoice && choice === rating ? "bg-court text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-emerald-100"}`} aria-label={`Rate ${player.name} ${rating} out of 10`}>{rating}</button>
                ))}
              </div>
              <button type="button" disabled={!votingOpen || Boolean(busyPlayerId)} onClick={() => void saveChoice(player.id, null)} className={`mt-2 w-full rounded-md border px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${hasChoice && choice === null ? "border-court bg-emerald-50 text-court" : "border-slate-200 bg-white text-slate-600 hover:border-court"}`}>I don&apos;t know this player well enough</button>
            </article>
          );
        })}
      </div>
      {!visiblePlayers.length ? <Notice text="No players match this filter." /> : null}
    </div>
  );
}

function Notice({ text, loading = false, children }: { text: string; loading?: boolean; children?: React.ReactNode }) {
  return <div className="sport-card p-5 text-center">{loading ? <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin text-court" /> : null}<p className="text-sm font-bold text-slate-600">{text}</p>{children}</div>;
}

function ErrorNotice({ text }: { text: string }) {
  return <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{text}</p>;
}
