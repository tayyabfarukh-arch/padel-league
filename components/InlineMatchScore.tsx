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

  async function submitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    const team1Score = Number(form.get("team_1_score"));
    const team2Score = Number(form.get("team_2_score"));
    const validation = validateScore(team1Score, team2Score, targetScore, match.stage);

    if (!validation.valid) {
      setMessage(
        match.stage === "group"
          ? `Both scores must total ${targetScore} points.`
          : `One team must reach exactly ${targetScore} games.`
      );
      return;
    }

    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("submit_match_score", {
      p_match_id: match.id,
      p_team_1_score: team1Score,
      p_team_2_score: team2Score
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
          : `Enter the set result. One team must reach ${targetScore} games.`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0">
          <span className="mb-1 block truncate text-xs font-black text-slate-600">{teamLabel(match.team_1)}</span>
          <input className="field" name="team_1_score" type="number" min={0} max={targetScore} required />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block truncate text-xs font-black text-slate-600">{teamLabel(match.team_2)}</span>
          <input className="field" name="team_2_score" type="number" min={0} max={targetScore} required />
        </label>
        <button className="btn-primary col-span-2 w-full" disabled={busy}>
          <Save className="h-4 w-4" /> {busy ? "Saving..." : "Submit result"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-bold text-slate-600">{message}</p> : null}
    </form>
  );
}
