"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AmericanoMatch } from "@/lib/types";

export function InlineAmericanoScore({ match, targetPoints }: { match: AmericanoMatch; targetPoints: number }) {
  const [side1, setSide1] = useState("");
  const [side2, setSide2] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const first = Number(side1);
    const second = Number(side2);
    if (!Number.isInteger(first) || !Number.isInteger(second) || first < 0 || second < 0) {
      setError(true);
      setMessage("Enter two valid scores.");
      return;
    }
    if (first + second !== targetPoints) {
      setError(true);
      setMessage(`The scores must total ${targetPoints} points.`);
      return;
    }

    setBusy(true);
    setMessage("");
    setError(false);
    const { error: submitError } = await supabase!.rpc("submit_americano_score", {
      p_match_id: match.id,
      p_side_1_points: first,
      p_side_2_points: second
    });
    if (submitError) {
      setError(true);
      setMessage(submitError.message);
      setBusy(false);
      return;
    }
    setMessage("Result saved. Updating standings...");
    setTimeout(() => window.location.reload(), 650);
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-slate-200 pt-4">
      <p className="mb-2 text-center text-xs font-black text-slate-600">
        Enter both scores. They must total {targetPoints}.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input className="field text-center" type="number" min={0} max={targetPoints} value={side1} onChange={(event) => setSide1(event.target.value)} placeholder="Side 1" required />
        <input className="field text-center" type="number" min={0} max={targetPoints} value={side2} onChange={(event) => setSide2(event.target.value)} placeholder="Side 2" required />
      </div>
      <button className="btn-primary mt-2 w-full" disabled={busy}>
        <Save className="h-4 w-4" /> {busy ? "Saving..." : "Submit result"}
      </button>
      {message ? (
        <p className={`mt-2 rounded-md p-2 text-center text-xs font-bold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
