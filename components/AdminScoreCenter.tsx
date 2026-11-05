"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Filter, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { stageLabel, teamLabel } from "@/lib/format";
import { getTargetGamesForStage, validateScore } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import type { Match, PointsScoringMode, Team, Tournament } from "@/lib/types";

type ScoreDraft = {
  team1: string;
  team2: string;
  decidingWinnerId: string;
  endedDueToTime: boolean;
};

type PendingResult = {
  match_id: string;
  team_1_score: number;
  team_2_score: number;
  deciding_point_winner_team_id: string | null;
  ended_due_to_time: boolean;
};

const EMPTY_DRAFT: ScoreDraft = { team1: "", team2: "", decidingWinnerId: "", endedDueToTime: false };
const STAGE_ORDER: Match["stage"][] = ["group", "prequarterfinal", "quarterfinal", "semifinal", "final", "third_place"];

export function AdminScoreCenter({ tournaments, matches, teams }: { tournaments: Tournament[]; matches: Match[]; teams: Team[] }) {
  const router = useRouter();
  const defaultTournament = tournaments.find((item) => item.status === "active") ?? tournaments[0];
  const [tournamentId, setTournamentId] = useState(defaultTournament?.id ?? "");
  const [teamId, setTeamId] = useState("all");
  const [group, setGroup] = useState("all");
  const [stage, setStage] = useState("all");
  const [round, setRound] = useState("all");
  const [court, setCourt] = useState("all");
  const [status, setStatus] = useState("pending");
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const tournament = tournaments.find((item) => item.id === tournamentId) ?? defaultTournament;

  const tournamentMatches = useMemo(() => matches
    .filter((match) => match.tournament_id === tournamentId)
    .sort(compareMatches), [matches, tournamentId]);
  const tournamentTeamIds = new Set(tournamentMatches.flatMap((match) => [match.team_1_id, match.team_2_id]));
  const teamOptions = teams.filter((team) => tournamentTeamIds.has(team.id)).sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)));
  const groups = uniqueNumbersOrStrings(tournamentMatches.map((match) => match.group_name).filter(Boolean) as string[]);
  const stages = STAGE_ORDER.filter((item) => tournamentMatches.some((match) => match.stage === item));
  const rounds = uniqueNumbersOrStrings(tournamentMatches.map((match) => match.round_number).filter((value): value is number => value != null));
  const courts = uniqueNumbersOrStrings(tournamentMatches.map((match) => match.court_number).filter((value): value is number => value != null));
  const filteredMatches = tournamentMatches.filter((match) => {
    const completed = isCompleted(match);
    return (teamId === "all" || match.team_1_id === teamId || match.team_2_id === teamId)
      && (group === "all" || match.group_name === group)
      && (stage === "all" || match.stage === stage)
      && (round === "all" || match.round_number === Number(round))
      && (court === "all" || match.court_number === Number(court))
      && (status === "all" || (status === "completed" ? completed : !completed));
  });
  const pendingCount = tournamentMatches.filter((match) => !isCompleted(match)).length;
  const enteredCount = Object.values(drafts).filter((draft) => draft.team1 !== "" || draft.team2 !== "").length;

  function resetFilters(nextTournamentId?: string) {
    if (nextTournamentId != null) {
      setTournamentId(nextTournamentId);
      setDrafts({});
    }
    setTeamId("all");
    setGroup("all");
    setStage("all");
    setRound("all");
    setCourt("all");
    setStatus("pending");
    setMessage("");
  }

  function updateDraft(matchId: string, patch: Partial<ScoreDraft>) {
    setDrafts((current) => ({ ...current, [matchId]: { ...(current[matchId] ?? EMPTY_DRAFT), ...patch } }));
  }

  async function submitAll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !tournament) return;
    const pendingResults: PendingResult[] = [];

    try {
      for (const [matchId, draft] of Object.entries(drafts)) {
        if (draft.team1 === "" && draft.team2 === "") continue;
        const match = tournamentMatches.find((item) => item.id === matchId);
        if (!match || isCompleted(match)) continue;
        if (draft.team1 === "" || draft.team2 === "") throw new Error(`Enter both scores for ${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)}.`);
        const team1 = Number(draft.team1);
        const team2 = Number(draft.team2);
        const target = getTargetGamesForStage(tournament, match.stage);
        const validation = validateScore(team1, team2, target, match.stage, draft.endedDueToTime, tournament.points_scoring_mode);
        if (!validation.valid) throw new Error(scoreError(match, tournament.points_scoring_mode, target));
        const tiedGroup = match.stage === "group" && team1 === team2;
        if (tiedGroup && ![match.team_1_id, match.team_2_id].includes(draft.decidingWinnerId)) {
          throw new Error(`Select the Golden point winner for ${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)}.`);
        }
        pendingResults.push({
          match_id: match.id,
          team_1_score: team1,
          team_2_score: team2,
          deciding_point_winner_team_id: tiedGroup ? draft.decidingWinnerId : null,
          ended_due_to_time: match.stage === "group" ? false : draft.endedDueToTime
        });
      }
      if (!pendingResults.length) throw new Error("Enter at least one complete result before saving.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Check the entered results.");
      return;
    }

    setBusy(true);
    setMessage("");
    setIsError(false);
    const { data, error } = await supabase.rpc("submit_match_scores_batch", { p_results: pendingResults });
    setBusy(false);
    if (error) {
      setIsError(true);
      setMessage(error.message);
      return;
    }
    setDrafts({});
    setMessage(`${Number(data) || pendingResults.length} results saved. Standings and ratings are updating.`);
    router.refresh();
  }

  if (!tournaments.length) return <section className="sport-card p-5"><p className="font-bold text-slate-600">Create a regular tournament before entering scores.</p></section>;

  return (
    <section className="sport-card overflow-hidden">
      <div className="border-b border-slate-200 bg-ink px-4 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase text-limeball">Admin score centre</p><h2 className="text-xl font-black">Enter multiple match results</h2><p className="mt-1 text-xs font-semibold text-slate-300">Filter the schedule, enter every completed score, then save once.</p></div>
          <div className="flex gap-2 text-center"><Summary label="Pending" value={pendingCount} /><Summary label="Entered" value={enteredCount} /></div>
        </div>
      </div>

      <div className="border-b border-slate-200 p-4">
        <label className="block"><span className="field-label">Tournament</span><select className="field" value={tournamentId} onChange={(event) => resetFilters(event.target.value)}>{tournaments.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.status})</option>)}</select></label>
        {tournament?.status !== "active" ? <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">Score submission opens when this tournament is Active. You can inspect its fixtures now, then activate it from the Tournament section.</p> : null}
        <div className="mt-3 flex items-center gap-2 text-xs font-black uppercase text-slate-500"><Filter className="h-4 w-4" /> Match filters</div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <FilterSelect label="Team" value={teamId} onChange={setTeamId} options={teamOptions.map((team) => [team.id, teamLabel(team)])} />
          <FilterSelect label="Group" value={group} onChange={setGroup} options={groups.map((value) => [String(value), `Group ${value}`])} />
          <FilterSelect label="Stage" value={stage} onChange={setStage} options={stages.map((value) => [value, stageLabel(value)])} />
          <FilterSelect label="Round" value={round} onChange={setRound} options={rounds.map((value) => [String(value), `Round ${value}`])} />
          <FilterSelect label="Court" value={court} onChange={setCourt} options={courts.map((value) => [String(value), `Court ${value}`])} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[["pending", "Pending"], ["completed", "Completed"], ["all", "All matches"]]} includeAll={false} />
        </div>
      </div>

      <form onSubmit={submitAll}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="px-3 py-3">Match</th><th className="px-3 py-3">Team 1</th><th className="w-24 px-2 py-3 text-center">Score</th><th className="w-24 px-2 py-3 text-center">Score</th><th className="px-3 py-3">Team 2</th><th className="w-48 px-3 py-3">Match detail</th><th className="w-28 px-3 py-3 text-center">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMatches.map((match) => {
                const completed = isCompleted(match);
                const draft = drafts[match.id] ?? EMPTY_DRAFT;
                const target = getTargetGamesForStage(tournament, match.stage);
                const tiedGroup = match.stage === "group" && draft.team1 !== "" && draft.team2 !== "" && Number(draft.team1) === Number(draft.team2);
                const timedFinishPossible = match.stage !== "group" && draft.team1 !== "" && draft.team2 !== "" && Math.max(Number(draft.team1), Number(draft.team2)) === target && Math.min(Number(draft.team1), Number(draft.team2)) === target - 1;
                return <tr key={match.id} className={completed ? "bg-slate-50/70" : "bg-white hover:bg-emerald-50/30"}>
                  <td className="px-3 py-3"><p className="font-black text-slate-950">{match.stage === "group" ? `Round ${match.round_number ?? "-"}` : stageLabel(match.stage)}</p><p className="text-[10px] font-bold uppercase text-slate-500">{match.group_name ? `Group ${match.group_name} · ` : ""}Court {match.court_number ?? "TBD"}</p></td>
                  <td className="max-w-48 px-3 py-3 font-black text-slate-900"><span className="block truncate" title={teamLabel(match.team_1)}>{teamLabel(match.team_1)}</span></td>
                  <td className="px-2 py-3">{completed ? <Score value={match.team_1_games} /> : <input className="field text-center" type="number" min={0} max={match.stage === "group" ? target : target + 1} value={draft.team1} onChange={(event) => updateDraft(match.id, { team1: event.target.value, endedDueToTime: false })} aria-label={`${teamLabel(match.team_1)} score`} />}</td>
                  <td className="px-2 py-3">{completed ? <Score value={match.team_2_games} /> : <input className="field text-center" type="number" min={0} max={match.stage === "group" ? target : target + 1} value={draft.team2} onChange={(event) => updateDraft(match.id, { team2: event.target.value, endedDueToTime: false })} aria-label={`${teamLabel(match.team_2)} score`} />}</td>
                  <td className="max-w-48 px-3 py-3 font-black text-slate-900"><span className="block truncate" title={teamLabel(match.team_2)}>{teamLabel(match.team_2)}</span></td>
                  <td className="px-3 py-3">{completed ? <span className="text-xs font-semibold text-slate-500">Use the correction form below to change this result.</span> : tiedGroup ? <select className="field text-xs" value={draft.decidingWinnerId} onChange={(event) => updateDraft(match.id, { decidingWinnerId: event.target.value })}><option value="">Golden point winner</option><option value={match.team_1_id}>{teamLabel(match.team_1)}</option><option value={match.team_2_id}>{teamLabel(match.team_2)}</option></select> : timedFinishPossible ? <label className="flex items-center gap-2 text-xs font-bold text-amber-900"><input type="checkbox" checked={draft.endedDueToTime} onChange={(event) => updateDraft(match.id, { endedDueToTime: event.target.checked })} /> Ended due to court time</label> : <span className="text-xs font-semibold text-slate-500">{match.stage === "group" ? tournament?.points_scoring_mode === "race_to" ? `Race to ${target}` : `Combined total ${target}` : `Race to ${target}`}</span>}</td>
                  <td className="px-3 py-3 text-center">{completed ? <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</span> : draft.team1 !== "" || draft.team2 !== "" ? <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700">Entered</span> : <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">Pending</span>}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {!filteredMatches.length ? <p className="p-8 text-center text-sm font-semibold text-slate-500">No matches match the selected filters.</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <p className={`text-sm font-bold ${isError ? "text-red-700" : "text-emerald-700"}`}>{message || `${filteredMatches.length} matches shown · ${enteredCount} results ready to save`}</p>
          <button className="btn-primary" disabled={busy || enteredCount === 0 || tournament?.status !== "active"}><Save className="h-4 w-4" /> {busy ? "Saving results..." : "Save all entered results"}</button>
        </div>
      </form>
    </section>
  );
}

function FilterSelect({ label, value, onChange, options, includeAll = true }: { label: string; value: string; onChange: (value: string) => void; options: string[][]; includeAll?: boolean }) {
  return <label><span className="field-label">{label}</span><select className="field" value={value} onChange={(event) => onChange(event.target.value)}>{includeAll ? <option value="all">All {label.toLowerCase()}s</option> : null}{options.map(([optionValue, text]) => <option key={`${label}-${optionValue}`} value={optionValue}>{text}</option>)}</select></label>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="min-w-16 rounded-md border border-white/15 bg-white/10 px-3 py-2"><p className="text-lg font-black text-limeball">{value}</p><p className="text-[9px] font-black uppercase text-slate-300">{label}</p></div>;
}

function Score({ value }: { value: number | null }) {
  return <span className="block rounded-md bg-slate-950 px-3 py-2 text-center text-lg font-black text-white">{value ?? "-"}</span>;
}

function isCompleted(match: Match) {
  return match.team_1_games != null && match.team_2_games != null;
}

function compareMatches(a: Match, b: Match) {
  return STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
    || (a.round_number ?? Number.MAX_SAFE_INTEGER) - (b.round_number ?? Number.MAX_SAFE_INTEGER)
    || (a.court_number ?? Number.MAX_SAFE_INTEGER) - (b.court_number ?? Number.MAX_SAFE_INTEGER)
    || new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function uniqueNumbersOrStrings<T extends string | number>(values: T[]) {
  return [...new Set(values)].sort((a, b) => typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)));
}

function scoreError(match: Match, scoringMode: PointsScoringMode, target: number) {
  const fixture = `${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)}`;
  if (match.stage === "group") return scoringMode === "race_to" ? `${fixture}: one team must reach ${target}.` : `${fixture}: both scores must total ${target}.`;
  return `${fixture}: finish at ${target}, continue to ${target + 1} after ${target - 1}-${target - 1}, or mark a ${target}-${target - 1} time-limited finish.`;
}
