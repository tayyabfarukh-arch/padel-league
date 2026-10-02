"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { teamLabel } from "@/lib/format";
import { validateScore } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import type { Match, PointsScoringMode } from "@/lib/types";

let batchSubmissionInProgress = false;

type PendingResult = {
  match_id: string;
  team_1_score: number;
  team_2_score: number;
  deciding_point_winner_team_id: string | null;
  ended_due_to_time: boolean;
};

export function InlineMatchScore({ match, targetScore, pointsScoringMode = "fixed_total" }: { match: Match; targetScore: number; pointsScoringMode?: PointsScoringMode }) {
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
    if (!supabase || batchSubmissionInProgress) return;

    let pendingResults: PendingResult[];
    try {
      pendingResults = collectPendingResults();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Check the entered results.");
      return;
    }
    if (!pendingResults.length) {
      setMessage("Enter at least one complete result.");
      return;
    }

    batchSubmissionInProgress = true;
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc("submit_match_scores_batch", {
      p_results: pendingResults
    });
    batchSubmissionInProgress = false;
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${Number(data) || pendingResults.length} results saved. Updating standings and ratings...`);
    router.refresh();
  }

  function collectPendingResults() {
    const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[data-match-score-form="true"]'));
    const results: PendingResult[] = [];

    for (const scoreForm of forms) {
      const form = new FormData(scoreForm);
      const team1Raw = String(form.get("team_1_score") ?? "").trim();
      const team2Raw = String(form.get("team_2_score") ?? "").trim();
      if (!team1Raw && !team2Raw) continue;

      const matchLabel = String(form.get("match_label") ?? "this match");
      if (!team1Raw || !team2Raw) throw new Error(`Enter both scores for ${matchLabel}.`);

      const team1 = Number(team1Raw);
      const team2 = Number(team2Raw);
      const stage = String(form.get("stage")) as Match["stage"];
      const target = Number(form.get("target_score"));
      const scoringMode = String(form.get("points_scoring_mode")) as PointsScoringMode;
      const timedFinish = form.get("ended_due_to_time") === "yes";
      const decidingWinner = String(form.get("deciding_point_winner_team_id") ?? "") || null;
      const tiedGroup = stage === "group" && team1 === team2;
      const validation = validateScore(team1, team2, target, stage, timedFinish, scoringMode);

      if (!validation.valid) {
        throw new Error(
          stage === "group"
            ? scoringMode === "race_to"
              ? `${matchLabel}: one team must reach ${target}.`
              : `${matchLabel}: both scores must total ${target}.`
            : `${matchLabel}: finish at ${target}, continue to ${target + 1} after ${target - 1}-${target - 1}, or confirm the time-limited finish.`
        );
      }
      if (tiedGroup && !decidingWinner) throw new Error(`Select the Golden point winner for ${matchLabel}.`);

      results.push({
        match_id: String(form.get("match_id")),
        team_1_score: team1,
        team_2_score: team2,
        deciding_point_winner_team_id: tiedGroup ? decidingWinner : null,
        ended_due_to_time: timedFinish
      });
    }
    return results;
  }

  return (
    <form data-match-score-form="true" onSubmit={submitScore} className="mt-4 border-t border-slate-200 pt-3">
      <input type="hidden" name="match_id" value={match.id} />
      <input type="hidden" name="match_label" value={`${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)}`} />
      <input type="hidden" name="stage" value={match.stage} />
      <input type="hidden" name="target_score" value={targetScore} />
      <input type="hidden" name="points_scoring_mode" value={pointsScoringMode} />
      <p className="mb-3 text-xs font-bold text-slate-500">
        {match.stage === "group"
          ? pointsScoringMode === "race_to"
            ? `Race to ${targetScore}: one team must finish on ${targetScore}.`
            : `Enter both scores. Their total must be ${targetScore}.`
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
          />
        </label>
        {tiedGroupScore ? (
          <label className="col-span-2">
            <span className="mb-1 block text-xs font-black text-slate-600">Golden point winner</span>
            <select
              className="field"
              name="deciding_point_winner_team_id"
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
              name="ended_due_to_time"
              value={endedDueToTime ? "yes" : "no"}
              onChange={(event) => setEndedDueToTime(event.target.value === "yes")}
            >
              <option value="no">Continue the extra game to {targetScore + 1}</option>
              <option value="yes">Close at {targetScore} because court time ended</option>
            </select>
          </label>
        ) : null}
        <button className="btn-primary col-span-2 w-full" disabled={busy}>
          <Save className="h-4 w-4" /> {busy ? "Saving entered results..." : "Submit all entered results"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-bold text-slate-600">{message}</p> : null}
    </form>
  );
}
