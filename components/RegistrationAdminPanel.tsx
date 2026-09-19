"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Plus, RefreshCw, Save, Trash2, WalletCards } from "lucide-react";
import { TeamAvatar } from "@/components/Avatar";
import { teamLabel } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { PaymentStatus, RegistrationStatus, Team, Tournament, TournamentExpense, TournamentRegistration } from "@/lib/types";

type Draft = {
  status: RegistrationStatus;
  payment_status: PaymentStatus;
  fee_amount: number;
  amount_paid: number;
  admin_notes: string;
};

export function RegistrationAdminPanel({ tournaments, teams }: { tournaments: Tournament[]; teams: Team[] }) {
  const defaultTournament = tournaments.find((item) => item.status === "upcoming") ?? tournaments[0];
  const [tournamentId, setTournamentId] = useState(defaultTournament?.id ?? "");
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [expenses, setExpenses] = useState<TournamentExpense[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const tournament = tournaments.find((item) => item.id === tournamentId) ?? defaultTournament;

  async function load() {
    if (!supabase || !tournamentId) return;
    setLoading(true);
    setError("");
    const [{ data: registrationData, error: registrationError }, { data: expenseData, error: expenseError }] = await Promise.all([
      supabase.from("tournament_registrations").select("*").eq("tournament_id", tournamentId).order("created_at"),
      supabase.from("tournament_expenses").select("*").eq("tournament_id", tournamentId).order("created_at")
    ]);
    const rows = (registrationData as TournamentRegistration[] | null) ?? [];
    setRegistrations(rows);
    setExpenses((expenseData as TournamentExpense[] | null) ?? []);
    setDrafts(Object.fromEntries(rows.map((row) => [row.id, {
      status: row.status,
      payment_status: row.payment_status,
      fee_amount: Number(row.fee_amount ?? 0),
      amount_paid: Number(row.amount_paid ?? 0),
      admin_notes: row.admin_notes ?? ""
    }])));
    setError(registrationError?.message ?? expenseError?.message ?? "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, [tournamentId]);

  const activeRows = registrations.filter((row) => !["withdrawn", "rejected"].includes(row.status));
  const expectedIncome = activeRows.reduce((total, row) => total + Number(drafts[row.id]?.fee_amount ?? row.fee_amount ?? 0), 0);
  const receivedIncome = activeRows.reduce((total, row) => total + Number(drafts[row.id]?.amount_paid ?? row.amount_paid ?? 0), 0);
  const expenseTotal = expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  const confirmedCount = registrations.filter((row) => row.status === "confirmed").length;
  const summary = [
    ["Registered", String(activeRows.length)],
    ["Confirmed", String(confirmedCount)],
    ["Expected", money(expectedIncome)],
    ["Received", money(receivedIncome)],
    ["Outstanding", money(Math.max(0, expectedIncome - receivedIncome))],
    ["Expenses", money(expenseTotal)],
    ["Current balance", money(receivedIncome - expenseTotal)]
  ];

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function saveTournamentSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !tournament) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage("");
    setError("");
    const { error: updateError } = await supabase.from("tournaments").update({
      registration_open: form.get("registration_open") === "on",
      team_fee: Number(form.get("team_fee") ?? 0),
      advance_amount: Number(form.get("advance_amount") ?? 0)
    }).eq("id", tournament.id);
    setBusy(false);
    if (updateError) setError(updateError.message);
    else {
      setMessage("Registration settings saved. Refreshing...");
      window.setTimeout(() => window.location.reload(), 500);
    }
  }

  async function saveRegistration(row: TournamentRegistration) {
    if (!supabase) return;
    const draft = drafts[row.id];
    if (!draft) return;
    setBusy(true);
    setMessage("");
    setError("");
    const timestamps = {
      advance_paid_at: draft.payment_status === "advance_paid" || draft.payment_status === "fully_paid" ? row.advance_paid_at ?? new Date().toISOString() : null,
      fully_paid_at: draft.payment_status === "fully_paid" ? row.fully_paid_at ?? new Date().toISOString() : null
    };
    const { error: updateError } = await supabase.from("tournament_registrations").update({
      ...draft,
      ...timestamps,
      updated_at: new Date().toISOString()
    }).eq("id", row.id);

    if (!updateError && draft.status === "confirmed") {
      const { error: assignmentError } = await supabase.from("tournament_teams").upsert({
        tournament_id: row.tournament_id,
        team_id: row.team_id,
        group_name: "A"
      }, { onConflict: "tournament_id,team_id", ignoreDuplicates: true });
      if (assignmentError) {
        setBusy(false);
        setError(`Registration saved, but the team could not be added to the tournament: ${assignmentError.message}`);
        await load();
        return;
      }
    }

    setBusy(false);
    if (updateError) setError(updateError.message);
    else {
      setMessage(draft.status === "confirmed" ? "Registration saved and the team was added to the tournament." : "Registration saved.");
      await load();
    }
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !tournamentId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    const { error: insertError } = await supabase.from("tournament_expenses").insert({
      tournament_id: tournamentId,
      description: String(form.get("description") ?? "").trim(),
      amount: Number(form.get("amount") ?? 0)
    });
    setBusy(false);
    if (insertError) setError(insertError.message);
    else {
      formElement.reset();
      setMessage("Expense added.");
      await load();
    }
  }

  async function deleteExpense(id: string) {
    if (!supabase || !window.confirm("Delete this expense?")) return;
    setBusy(true);
    const { error: deleteError } = await supabase.from("tournament_expenses").delete().eq("id", id);
    setBusy(false);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  if (!tournaments.length) return <section className="sport-card p-5 lg:col-span-2"><p className="font-bold text-slate-600">Create a tournament before managing registrations.</p></section>;

  return (
    <div className="space-y-5 lg:col-span-2">
      <section className="sport-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="block flex-1"><span className="field-label">Tournament</span><select className="field" value={tournamentId} onChange={(event) => setTournamentId(event.target.value)}>{tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button className="btn-secondary" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </section>

      {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {summary.map(([label, value]) => <div key={label} className="sport-card p-3"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p></div>)}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="sport-card p-4">
          <h2 className="mb-4 text-lg font-black text-slate-950">Registration settings</h2>
          <form key={tournamentId} onSubmit={saveTournamentSettings} className="space-y-3">
            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"><input name="registration_open" type="checkbox" defaultChecked={tournament?.registration_open !== false} className="h-5 w-5 accent-emerald-600" /><span><b className="block text-sm text-slate-950">Registration open</b><span className="text-xs text-slate-500">Players can submit teams while this is enabled.</span></span></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="field-label">Team fee (SAR)</span><input className="field" name="team_fee" type="number" min="0" step="0.01" defaultValue={Number(tournament?.team_fee ?? 0)} /></label>
              <label><span className="field-label">Advance (SAR)</span><input className="field" name="advance_amount" type="number" min="0" step="0.01" defaultValue={Number(tournament?.advance_amount ?? 0)} /></label>
            </div>
            <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> Save settings</button>
          </form>
        </section>

        <section className="sport-card p-4">
          <h2 className="mb-4 text-lg font-black text-slate-950">Tournament expenses</h2>
          <form onSubmit={addExpense} className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
            <input className="field" name="description" placeholder="Court booking, balls, trophies..." required />
            <input className="field" name="amount" type="number" min="0" step="0.01" placeholder="SAR" required />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Add</button>
          </form>
          <div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
            {expenses.map((expense) => <div key={expense.id} className="flex items-center gap-3 p-3"><span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{expense.description}</span><span className="text-sm font-black text-slate-950">{money(Number(expense.amount))}</span><button className="grid h-8 w-8 place-items-center rounded text-red-600 hover:bg-red-50" onClick={() => void deleteExpense(expense.id)} title="Delete expense"><Trash2 className="h-4 w-4" /></button></div>)}
            {!expenses.length ? <p className="p-4 text-sm font-semibold text-slate-500">No expenses recorded.</p> : null}
          </div>
        </section>
      </div>

      <section className="sport-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3"><WalletCards className="h-5 w-5 text-court" /><div><h2 className="font-black text-slate-950">Team registrations</h2><p className="text-sm text-slate-500">Confirming a team also adds it to the tournament in Group A. You can move it to Group B from the Tournament tab.</p></div></div>
        {loading ? <p className="p-5 text-sm font-bold text-slate-500">Loading registrations...</p> : registrations.length ? <div className="divide-y divide-slate-200">{registrations.map((row) => {
          const team = teams.find((item) => item.id === row.team_id);
          const draft = drafts[row.id];
          if (!team || !draft) return null;
          return (
            <div key={row.id} className="p-4">
              <div className="mb-3 flex items-center gap-3"><TeamAvatar team={team} size={44} /><div className="min-w-0 flex-1"><p className="truncate font-black text-slate-950">{teamLabel(team)}</p><p className="text-xs font-semibold text-slate-500">Submitted {new Date(row.created_at).toLocaleDateString()}</p></div>{row.status === "confirmed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label><span className="field-label">Registration</span><select className="field" value={draft.status} onChange={(event) => updateDraft(row.id, { status: event.target.value as RegistrationStatus })}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="waitlisted">Waitlisted</option><option value="withdrawn">Withdrawn</option><option value="rejected">Rejected</option></select></label>
                <label><span className="field-label">Payment</span><select className="field" value={draft.payment_status} onChange={(event) => updateDraft(row.id, { payment_status: event.target.value as PaymentStatus })}><option value="unpaid">Unpaid</option><option value="advance_paid">Advance paid</option><option value="fully_paid">Paid in full</option><option value="refunded">Refunded</option></select></label>
                <label><span className="field-label">Fee (SAR)</span><input className="field" type="number" min="0" step="0.01" value={draft.fee_amount} onChange={(event) => updateDraft(row.id, { fee_amount: Number(event.target.value) })} /></label>
                <label><span className="field-label">Received (SAR)</span><input className="field" type="number" min="0" step="0.01" value={draft.amount_paid} onChange={(event) => updateDraft(row.id, { amount_paid: Number(event.target.value) })} /></label>
                <label><span className="field-label">Admin note</span><input className="field" value={draft.admin_notes} onChange={(event) => updateDraft(row.id, { admin_notes: event.target.value })} placeholder="Private note" /></label>
              </div>
              <button className="btn-primary mt-3" disabled={busy} onClick={() => void saveRegistration(row)}><Save className="h-4 w-4" /> Save registration</button>
            </div>
          );
        })}</div> : <p className="p-6 text-center text-sm font-semibold text-slate-500">No registration requests yet.</p>}
      </section>
    </div>
  );
}

function money(value: number) {
  return `SAR ${Number(value).toFixed(2)}`;
}
