"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, LogIn, Vote } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { teamLabel } from "@/lib/format";
import type { Player, Prediction, Team, Tournament, TournamentTeam } from "@/lib/types";
import { PlayerAvatar, TeamAvatar } from "./Avatar";

export function PredictionPanel({
  tournaments,
  tournamentTeams,
  predictions,
  players
}: {
  tournaments: Tournament[];
  tournamentTeams: TournamentTeam[];
  predictions: Prediction[];
  players: Player[];
}) {
  const router = useRouter();
  const preferredTournament = tournaments.find((item) => item.status === "upcoming")
    ?? tournaments.find((item) => item.status === "active")
    ?? tournaments[0];
  const [tournamentId, setTournamentId] = useState(preferredTournament?.id ?? "");
  const [message, setMessage] = useState("");
  const [busyTeamId, setBusyTeamId] = useState("");
  const [userId, setUserId] = useState("");
  const [playerLinked, setPlayerLinked] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const tournament = tournaments.find((item) => item.id === tournamentId) ?? tournaments[0];
  const assignments = tournamentTeams.filter((item) => item.tournament_id === tournament?.id);
  const teams = assignments.map((item) => item.team).filter((team): team is Team => Boolean(team));
  const tournamentPredictions = predictions.filter((item) => item.tournament_id === tournament?.id);
  const userVote = tournamentPredictions.find((item) => item.voter_user_id === userId);
  const votingOpen = tournament?.status === "upcoming";
  const completed = tournament?.status === "completed";
  const championId = tournament?.champion_team_id;
  const championPlayerIds = new Set([
    tournament?.champion?.player_1_id,
    tournament?.champion?.player_2_id
  ].filter((playerId): playerId is string => Boolean(playerId)));
  const predictionRows = completed
    ? players
        .filter((player) => Boolean(player.user_id))
        .map((player) => ({
          key: player.id,
          player,
          prediction: tournamentPredictions.find((prediction) => prediction.voter_user_id === player.user_id)
        }))
    : tournamentPredictions.map((prediction) => ({
        key: prediction.id,
        player: players.find((player) => player.user_id === prediction.voter_user_id),
        prediction
      }));

  useEffect(() => {
    if (!supabase) return;
    async function applyAccount(nextUserId: string) {
      setUserId(nextUserId);
      if (!nextUserId) {
        setPlayerLinked(false);
        setCheckingAccount(false);
        return;
      }
      const { data } = await supabase!.from("players").select("id").eq("user_id", nextUserId).eq("is_active", true).maybeSingle();
      setPlayerLinked(Boolean(data));
      setCheckingAccount(false);
    }
    supabase.auth.getSession().then(({ data }) => void applyAccount(data.session?.user.id ?? ""));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => void applyAccount(session?.user.id ?? ""));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function voteForTeam(teamId: string) {
    if (!supabase || !tournament || !userId || !playerLinked) return;
    setBusyTeamId(teamId);
    setMessage("");
    const operation = userVote
      ? supabase.from("predictions").update({ predicted_team_id: teamId }).eq("id", userVote.id).eq("voter_user_id", userId)
      : supabase.from("predictions").insert({ tournament_id: tournament.id, voter_user_id: userId, voter_token: null, predicted_team_id: teamId });
    const { error } = await operation;
    setBusyTeamId("");
    setMessage(error ? error.message : userVote ? "Your prediction has been changed." : "Your prediction has been recorded.");
    if (!error) router.refresh();
  }

  return (
    <div className="space-y-5">
      {tournaments.length > 1 ? (
        <label className="block">
          <span className="mb-1 block text-xs font-black uppercase text-slate-500">Tournament</span>
          <select className="field" value={tournament?.id ?? ""} onChange={(event) => setTournamentId(event.target.value)}>
            {tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      ) : null}

      <section>
        <div className="mb-3">
          <h2 className="section-title mb-1">{tournament?.name}</h2>
          <p className="text-sm font-semibold text-slate-500">
            {votingOpen
              ? "Choose the team you expect to win. Each approved player account receives one vote."
              : completed
                ? "Tournament completed. Correct and incorrect predictions are shown below."
                : "Voting is closed. Predictions will be marked after the tournament champion is confirmed."}
          </p>
        </div>
        {votingOpen && !checkingAccount && !userId ? (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-amber-900">Sign in to your player account before voting.</p>
            <Link href="/account" className="btn-primary"><LogIn className="h-4 w-4" /> Sign in</Link>
          </div>
        ) : null}
        {votingOpen && !checkingAccount && userId && !playerLinked ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            Claim your player profile from the Account page and wait for Admin approval before voting.
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {teams.map((team) => {
            const votes = tournamentPredictions.filter((item) => item.predicted_team_id === team.id).length;
            const percentage = tournamentPredictions.length ? Math.round((votes / tournamentPredictions.length) * 100) : 0;
            const selected = userVote?.predicted_team_id === team.id;
            return (
              <div key={team.id} className={`sport-card flex items-center gap-3 p-4 ${selected ? "border-emerald-400 bg-emerald-50" : ""}`}>
                <TeamAvatar team={team} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-slate-950">{teamLabel(team)}</p>
                  <p className="text-sm font-semibold text-slate-500">{votes} votes | {percentage}%</p>
                </div>
                {selected ? (
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-court text-white" title="Your prediction">
                    <Check className="h-5 w-5" />
                  </span>
                ) : votingOpen ? (
                  <button
                    type="button"
                    className="btn-primary shrink-0"
                    disabled={!votingOpen || Boolean(busyTeamId) || !userId || !playerLinked}
                    onClick={() => voteForTeam(team.id)}
                  >
                    <Vote className="h-4 w-4" /> {busyTeamId === team.id ? "Voting..." : "Vote"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        {!teams.length ? <p className="sport-card p-4 text-sm font-semibold text-slate-500">No teams have been added to this tournament yet.</p> : null}
        {!votingOpen && predictionRows.length ? (
          <div className="mt-5">
            <h3 className="section-title">Player predictions</h3>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {predictionRows.map(({ key, player: voter, prediction }) => {
                const correct = Boolean(completed && championId && prediction?.predicted_team_id === championId);
                const outcomeReady = Boolean(completed && championId);
                const champion = championPlayerIds.has(voter?.id ?? "");
                return (
                  <div key={key} className="flex items-center gap-3 p-3">
                    <PlayerAvatar player={voter} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">{voter?.name ?? "Legacy voter"}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{prediction ? `Predicted ${teamLabel(prediction.predicted_team)}` : "No prediction submitted"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-2xl">
                      {champion ? <span role="img" aria-label="Tournament champion" title="Tournament champion">👑</span> : null}
                      <span
                        role="img"
                        aria-label={outcomeReady ? (prediction ? (correct ? "Correct prediction" : "Wrong prediction") : "No prediction") : "Awaiting tournament result"}
                        title={outcomeReady ? (prediction ? (correct ? "Correct prediction" : "Wrong prediction") : "No prediction submitted") : "Awaiting tournament result"}
                      >
                        {outcomeReady ? (prediction ? (correct ? "😎" : "🐒") : "🐀") : "⌛"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {message ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{message}</p> : null}
      </section>
    </div>
  );
}
