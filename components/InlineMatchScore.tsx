"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { teamLabel } from "@/lib/format";
import { validateScore } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import type { Match } from "@/lib/types";

export function InlineMatchScore({ match, targetScore }: { match: Match; targetScore: number }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [decidingWinnerId, setDecidingWinnerId] = useState("");
  const [endedDueToTime, setEndedDueToTime] = useState(false);
  const tiedGroupScore =
    match.stage === "group" &&
    team1Score !== "" &&
    team2Score !== "" &&
    Number(team1Score) === Number(team2Score);
  const maximumScore = match.stage === "group" ? targetScore : targetScore + 1;
  const isTimedFinishScore =
    match.stage !== "group" &&
    team1Score !== "" &&
    team2Score !== "" &&
    Math.max(Number(team1Score), Number(team2Score)) === targetScore &&
    Math.min(Number(team1Score), Number(team2Score)) === targetScore - 1;

  async function submitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    const enteredTeam1Score = Number(form.get("team_1_score"));
    const enteredTeam2Score = Number(form.get("team_2_score"));
    const validation = validateScore(
      enteredTeam1Score,
      enteredTeam2Score,
      targetScore,
      match.stage,
      isTimedFinishScore && endedDueToTime
    );

    if (!validation.valid) {
      if (isTimedFinishScore && !endedDueToTime) {
        setMessage(
          `Choose whether the match closed at ${targetScore} because court time ended, or continue the extra game to ${targetScore + 1}.`
        );
        return;
      }
      setMessage(
        match.stage === "group"
          ? `Both scores must total ${targetScore} points.`
          : `Finish at ${targetScore}, or play to ${targetScore + 1} after ${targetScore - 1}-${targetScore - 1}.`
      );
      return;
    }
    if (tiedGroupScore && !decidingWinnerId) {
      setMessage("Select the team that won the Golden point.");
      return;
    }

    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("submit_match_score", {
      p_match_id: match.id,
      p_team_1_score: enteredTeam1Score,
      p_team_2_score: enteredTeam2Score,
      p_deciding_point_winner_team_id: tiedGroupScore ? decidingWinnerId : null,
      p_ended_due_to_time: isTimedFinishScore && endedDueToTime
    });
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Result saved. Updating standings...");
    router.refresh();
  }

  return (
    <form onSubmit={submitScore} className="mt-4 border-t border-slate-200 pt-3">
      <p className="mb-3 text-xs font-bold text-slate-500">
        {match.stage === "group"
          ? `Enter both scores. Their total must be ${targetScore}.`
          : `First to ${targetScore}. After ${targetScore - 1}-${targetScore - 1}, play one extra game to ${targetScore + 1}, or confirm a ${targetScore}-${targetScore - 1} finish if court time ends.`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0">
          <span className="mb-1 block truncate text-xs font-black text-slate-600">{teamLabel(match.team_1)}</span>
          <input
            className="field"
            name="team_1_score"
            type="number"
            min={0}
            max={maximumScore}
            value={team1Score}
            onChange={(event) => {
              setTeam1Score(event.target.value);
              setEndedDueToTime(false);
            }}
            required
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block truncate text-xs font-black text-slate-600">{teamLabel(match.team_2)}</span>
          <input
            className="field"
            name="team_2_score"
            type="number"
            min={0}
            max={maximumScore}
            value={team2Score}
            onChange={(event) => {
              setTeam2Score(event.target.value);
              setEndedDueToTime(false);
            }}
            required
          />
        </label>
        {tiedGroupScore ? (
          <label className="col-span-2">
            <span className="mb-1 block text-xs font-black text-slate-600">Golden point winner</span>
            <select
              className="field"
              value={decidingWinnerId}
              onChange={(event) => setDecidingWinnerId(event.target.value)}
              required
            >
              <option value="">Select the winner</option>
              <option value={match.team_1_id}>{teamLabel(match.team_1)}</option>
              <option value={match.team_2_id}>{teamLabel(match.team_2)}</option>
            </select>
          </label>
        ) : null}
        {isTimedFinishScore ? (
          <label className="col-span-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <span className="mb-2 block text-xs font-black text-amber-950">
              The score is {team1Score}-{team2Score} after reaching {targetScore - 1}-{targetScore - 1}. What happens next?
            </span>
            <select
              className="field"
              value={endedDueToTime ? "yes" : "no"}
              onChange={(event) => setEndedDueToTime(event.target.value === "yes")}
            >
              <option value="no">Continue the extra game to {targetScore + 1}</option>
              <option value="yes">Close at {targetScore} because court time ended</option>
            </select>
          </label>
        ) : null}
        <button className="btn-primary col-span-2 w-full" disabled={busy}>
          <Save className="h-4 w-4" /> {busy ? "Saving..." : "Submit result"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-bold text-slate-600">{message}</p> : null}
    </form>
  );
}
