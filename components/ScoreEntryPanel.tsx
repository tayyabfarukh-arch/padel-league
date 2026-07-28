"use client";

import { FormEvent, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { getTargetGamesForStage, validateScore } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import { teamLabel } from "@/lib/format";
import type { Match, Tournament } from "@/lib/types";

export function ScoreEntryPanel({ tournament, matches }: { tournament: Tournament; matches: Match[] }) {
  const router = useRouter();
  const pendingMatches = useMemo(
    () => matches.filter((match) => match.team_1_games === null || match.team_2_games === null),
    [matches]
  );
  const [selectedMatchId, setSelectedMatchId] = useState(pendingMatches[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedMatch = pendingMatches.find((match) => match.id === selectedMatchId) ?? pendingMatches[0];
  const targetScore = selectedMatch ? getTargetGamesForStage(tournament, selectedMatch.stage) : 0;

  async function submitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMatch || !supabase) return;
    const form = new FormData(event.currentTarget);
    const team1 = Number(form.get("team_1_score"));
    const team2 = Number(form.get("team_2_score"));
    const validation = validateScore(team1, team2, targetScore, selectedMatch.stage);
    if (!validation.valid) {
      setMessage(
        selectedMatch.stage === "group"
          ? `The two scores must total ${targetScore} points.`
          : `One team must reach exactly ${targetScore} games.`
      );
      return;
    }

    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("submit_match_score", {
      p_match_id: selectedMatch.id,
      p_team_1_score: team1,
      p_team_2_score: team2
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Score saved. The standings have been updated.");
    router.refresh();
  }

  return (
    <section className="sport-card p-4">
      <h2 className="text-lg font-black text-slate-950">Enter a match score</h2>
      {!pendingMatches.length ? (
        <p className="mt-3 text-sm font-semibold text-slate-500">All scheduled matches currently have results.</p>
      ) : (
        <form onSubmit={submitScore} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase text-slate-500">Match</span>
            <select className="field" value={selectedMatch?.id ?? ""} onChange={(event) => setSelectedMatchId(event.target.value)}>
              {pendingMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {teamLabel(match.team_1)} vs {teamLabel(match.team_2)} | Court {match.court_number ?? "TBD"}
                </option>
              ))}
            </select>
          </label>

          {selectedMatch ? (
            <>
              <div className="rounded-md bg-limeball/30 p-3 text-sm font-black text-ink">
                {selectedMatch.stage === "group"
                  ? `The two scores must add up to ${targetScore} points. Draws are allowed.`
                  : `This ${selectedMatch.stage.replace("_", " ")} is first to ${targetScore} games.`}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block truncate text-xs font-black uppercase text-slate-500">{teamLabel(selectedMatch.team_1)}</span>
                  <input className="field" name="team_1_score" type="number" min={0} max={targetScore} required />
                </label>
                <label>
                  <span className="mb-1 block truncate text-xs font-black uppercase text-slate-500">{teamLabel(selectedMatch.team_2)}</span>
                  <input className="field" name="team_2_score" type="number" min={0} max={targetScore} required />
                </label>
              </div>
              <button className="btn-primary" disabled={busy}>
                <Save className="h-4 w-4" /> {busy ? "Saving..." : "Submit result"}
              </button>
            </>
          ) : null}
        </form>
      )}
      {message ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{message}</p> : null}
    </section>
  );
}
