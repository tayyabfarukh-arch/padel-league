"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CheckCircle2, Clock3, LogIn, ReceiptText, UserPlus, X } from "lucide-react";
import { PlayerAvatar, TeamAvatar } from "@/components/Avatar";
import { teamLabel } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Player, Team, Tournament, TournamentRegistration } from "@/lib/types";

export function TournamentRegistrationPanel({ tournament, teams, players }: { tournament: Tournament; teams: Team[]; players: Player[] }) {
  const [session, setSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [ownRegistration, setOwnRegistration] = useState<TournamentRegistration | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (nextSession?: Session | null) => {
    if (!supabase) return;
    setLoading(true);
    const activeSession = nextSession === undefined ? (await supabase.auth.getSession()).data.session : nextSession;
    setSession(activeSession);
    const { data: publicData, error: publicError } = await supabase.rpc("get_public_tournament_registrations", {
      p_tournament_id: tournament.id
    });
    setRegistrations((publicData as TournamentRegistration[] | null) ?? []);
    if (publicError) setError(publicError.message);

    if (activeSession) {
      const { data: linkedPlayer } = await supabase.from("players").select("*").eq("user_id", activeSession.user.id).maybeSingle();
      setPlayer((linkedPlayer as Player | null) ?? null);
      const { data: ownRows } = await supabase
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", tournament.id)
        .not("status", "in", "(withdrawn,rejected)")
        .order("created_at", { ascending: false });
      const own = ((ownRows as TournamentRegistration[] | null) ?? []).find((row) => {
        const team = teams.find((item) => item.id === row.team_id);
        return linkedPlayer && team && [team.player_1_id, team.player_2_id].includes(linkedPlayer.id);
      }) ?? null;
      setOwnRegistration(own);
    } else {
      setPlayer(null);
      setOwnRegistration(null);
    }
    setLoading(false);
  }, [teams, tournament.id]);

  useEffect(() => {
    if (!supabase) return;
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => void load(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [load]);

  const availablePartners = useMemo(() => {
    const query = partnerSearch.trim().toLowerCase();
    return players.filter((item) => item.id !== player?.id && (!query || item.name.toLowerCase().includes(query)));
  }, [partnerSearch, player?.id, players]);
  const existingTeam = useMemo(() => {
    if (!player || !selectedPartnerId) return null;
    return teams.find((team) =>
      (team.player_1_id === player.id && team.player_2_id === selectedPartnerId)
      || (team.player_2_id === player.id && team.player_1_id === selectedPartnerId)
    ) ?? null;
  }, [player, selectedPartnerId, teams]);
  const visibleRegistrations = registrations.filter((item) => teams.some((team) => team.id === item.team_id));
  const registrationOpen = tournament.status === "upcoming" && tournament.registration_open !== false;

  async function register() {
    if (!supabase || !selectedPartnerId) return;
    if (!existingTeam && !teamName.trim()) {
      setError("Enter a team name for this new player pairing.");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    const { error: registrationError } = await supabase.rpc("register_tournament_pair", {
      p_tournament_id: tournament.id,
      p_partner_player_id: selectedPartnerId,
      p_team_name: teamName.trim() || null
    });
    setBusy(false);
    if (registrationError) setError(registrationError.message);
    else {
      setMessage("Your team registration was sent to the Admin for confirmation.");
      setSelectedPartnerId("");
      setTeamName("");
      window.location.reload();
    }
  }

  async function withdraw() {
    if (!supabase || !ownRegistration) return;
    if (!window.confirm("Withdraw this team registration?")) return;
    setBusy(true);
    const { error: withdrawError } = await supabase.rpc("withdraw_tournament_registration", {
      p_registration_id: ownRegistration.id
    });
    setBusy(false);
    if (withdrawError) setError(withdrawError.message);
    else {
      setMessage("Your registration has been withdrawn.");
      await load(session);
    }
  }

  return (
    <section className="space-y-4">
      <div className="section-bar mb-0">
        <span className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-limeball" /> Team registration</span>
        <span className="text-xs text-slate-300">{visibleRegistrations.length} registered</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="sport-card p-4">
          <h2 className="font-black text-slate-950">Register your team</h2>
          <p className="mt-1 text-sm text-slate-500">
            {registrationOpen ? "Choose any player as your partner. The site will reuse your existing team or create a new one." : "Registration is currently closed."}
          </p>
          {(tournament.team_fee ?? 0) > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MoneySummary label="Team fee" value={tournament.team_fee ?? 0} />
              <MoneySummary label="Advance" value={tournament.advance_amount ?? 0} />
            </div>
          ) : null}

          {loading ? <p className="mt-4 text-sm font-bold text-slate-500">Checking your account...</p> : ownRegistration ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-black uppercase text-emerald-700">Your registration</p>
              <p className="mt-1 font-black text-emerald-950">{teamLabel(teams.find((team) => team.id === ownRegistration.team_id))}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={ownRegistration.status} />
                <PaymentBadge status={ownRegistration.payment_status} />
              </div>
              {ownRegistration.status === "pending" || ownRegistration.status === "waitlisted" ? (
                <button className="btn-secondary mt-3 text-red-700" disabled={busy} onClick={() => void withdraw()}><X className="h-4 w-4" /> Withdraw</button>
              ) : null}
            </div>
          ) : !session ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-900">Sign in to register a team.</p>
              <Link href="/account" className="btn-primary mt-3"><LogIn className="h-4 w-4" /> Sign in</Link>
            </div>
          ) : !player ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Claim your player profile and wait for Admin approval before registering.</div>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block"><span className="field-label">Find your partner</span><input className="field" value={partnerSearch} onChange={(event) => setPartnerSearch(event.target.value)} placeholder="Search player name" /></label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                {availablePartners.length ? availablePartners.map((partner) => (
                  <button
                    type="button"
                    key={partner.id}
                    onClick={() => {
                      const savedTeam = teams.find((team) =>
                        player && ((team.player_1_id === player.id && team.player_2_id === partner.id)
                          || (team.player_2_id === player.id && team.player_1_id === partner.id))
                      );
                      setSelectedPartnerId(partner.id);
                      setTeamName(savedTeam ? teamLabel(savedTeam) : "");
                      setError("");
                    }}
                    className={`flex w-full items-center gap-3 rounded-md border p-2 text-left transition ${selectedPartnerId === partner.id ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <PlayerAvatar player={partner} size={38} />
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-950">{partner.name}</span>
                    {selectedPartnerId === partner.id ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
                  </button>
                )) : <p className="p-3 text-center text-sm font-semibold text-slate-500">No matching players found.</p>}
              </div>
              {selectedPartnerId ? (
                <label className="block">
                  <span className="field-label">{existingTeam ? "Existing team found" : "New team name (required)"}</span>
                  <input
                    className={`field ${existingTeam ? "bg-slate-100 text-slate-600" : ""}`}
                    value={teamName}
                    maxLength={100}
                    required={!existingTeam}
                    readOnly={Boolean(existingTeam)}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Enter the new team name"
                  />
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{existingTeam ? "The saved team name has been filled automatically." : "This player pairing has no existing team, so please give it a name."}</span>
                </label>
              ) : null}
              <p className="rounded-md bg-slate-50 p-3 text-xs font-semibold text-slate-600">Admin approval confirms your registration only. The Admin will add the team to the tournament and choose its group later.</p>
              <button className="btn-primary w-full" disabled={!registrationOpen || !selectedPartnerId || (!existingTeam && !teamName.trim()) || busy} onClick={() => void register()}><CheckCircle2 className="h-4 w-4" /> {busy ? "Submitting..." : "Register team"}</button>
            </div>
          )}
          {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
        </div>

        <div className="sport-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-black text-slate-950">Registered teams</h2><p className="text-sm text-slate-500">Payment amounts remain private; only progress is shown.</p></div>
          {visibleRegistrations.length ? <div className="divide-y divide-slate-100">{visibleRegistrations.map((item) => {
            const team = teams.find((entry) => entry.id === item.team_id);
            if (!team) return null;
            return <div key={item.id} className="flex items-center gap-3 p-3"><TeamAvatar team={team} size={42} /><div className="min-w-0 flex-1"><p className="truncate font-black text-slate-950">{teamLabel(team)}</p><div className="mt-1 flex flex-wrap gap-1.5"><StatusBadge status={item.status} /><PaymentBadge status={item.payment_status} /></div></div></div>;
          })}</div> : <p className="p-6 text-center text-sm font-semibold text-slate-500">No teams have registered yet.</p>}
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: TournamentRegistration["status"] }) {
  const style = status === "confirmed" ? "bg-emerald-100 text-emerald-800" : status === "waitlisted" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-black uppercase ${style}`}>{status === "confirmed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{status}</span>;
}

function PaymentBadge({ status }: { status: TournamentRegistration["payment_status"] }) {
  const labels = { unpaid: "Unpaid", advance_paid: "Advance paid", fully_paid: "Paid in full", refunded: "Refunded" };
  const style = status === "fully_paid" ? "bg-emerald-100 text-emerald-800" : status === "advance_paid" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-black uppercase ${style}`}><ReceiptText className="h-3 w-3" />{labels[status]}</span>;
}

function MoneySummary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 font-black text-slate-950">KWD {Number(value).toFixed(3)}</p></div>;
}
