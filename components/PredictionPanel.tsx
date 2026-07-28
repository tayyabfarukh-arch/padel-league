"use client";

import { useEffect, useState } from "react";
import { Check, Vote } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { teamLabel } from "@/lib/format";
import type { Prediction, Team, Tournament, TournamentTeam } from "@/lib/types";
import { TeamAvatar } from "./Avatar";

const voterTokenKey = "padel_prediction_voter_token";

export function PredictionPanel({
  tournaments,
  tournamentTeams,
  predictions
}: {
  tournaments: Tournament[];
  tournamentTeams: TournamentTeam[];
  predictions: Prediction[];
}) {
  const router = useRouter();
  const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busyTeamId, setBusyTeamId] = useState("");
  const [voterToken, setVoterToken] = useState("");
  const tournament = tournaments.find((item) => item.id === tournamentId) ?? tournaments[0];
  const assignments = tournamentTeams.filter((item) => item.tournament_id === tournament?.id);
  const teams = assignments.map((item) => item.team).filter((team): team is Team => Boolean(team));
  const tournamentPredictions = predictions.filter((item) => item.tournament_id === tournament?.id);
  const userVote = tournamentPredictions.find((item) => item.voter_token === voterToken);
  const votingOpen = tournament?.status === "upcoming";

  useEffect(() => {
    let token = window.localStorage.getItem(voterTokenKey);
    if (!token) {
      token = window.crypto.randomUUID();
      window.localStorage.setItem(voterTokenKey, token);
    }
    setVoterToken(token);
  }, []);

  async function voteForTeam(teamId: string) {
    if (!supabase || !tournament || !voterToken) return;
    setBusyTeamId(teamId);
    setMessage("");
    const { error } = await supabase.from("predictions").insert({
      tournament_id: tournament.id,
      voter_token: voterToken,
      predicted_team_id: teamId
    });
    setBusyTeamId("");
    setMessage(error ? error.message : "Your prediction has been recorded.");
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
            {votingOpen ? "Choose the team you expect to win. One vote is allowed in this browser." : "Voting is closed. Final prediction results are shown below."}
          </p>
        </div>
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
                ) : (
                  <button
                    type="button"
                    className="btn-primary shrink-0"
                    disabled={!votingOpen || Boolean(userVote) || Boolean(busyTeamId) || !voterToken}
                    onClick={() => voteForTeam(team.id)}
                  >
                    <Vote className="h-4 w-4" /> {busyTeamId === team.id ? "Voting..." : "Vote"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {!teams.length ? <p className="sport-card p-4 text-sm font-semibold text-slate-500">No teams have been added to this tournament yet.</p> : null}
        {message ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{message}</p> : null}
      </section>
    </div>
  );
}
