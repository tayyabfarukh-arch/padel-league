"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, LogIn, LogOut, Plus, Save, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { teamLabel } from "@/lib/format";
import { validateScore } from "@/lib/scoring";
import type { Match, Player, Stage, Team, Tournament, TournamentTeam } from "@/lib/types";

type Props = {
  configured: boolean;
  players: Player[];
  teams: Team[];
  tournaments: Tournament[];
  tournamentTeams: TournamentTeam[];
  matches: Match[];
};

export function AdminPanel({ configured, players, teams, tournaments, tournamentTeams, matches }: Props) {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">("info");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const activeTournament = tournaments.find((item) => item.status === "active") ?? tournaments[0];
  const [resultTournamentId, setResultTournamentId] = useState(activeTournament?.id ?? "");
  const tournamentTeamIds = useMemo(
    () => new Set(tournamentTeams.filter((item) => item.tournament_id === activeTournament?.id).map((item) => item.team_id)),
    [activeTournament?.id, tournamentTeams]
  );
  const resultMatches = useMemo(
    () => matches.filter((match) => !resultTournamentId || match.tournament_id === resultTournamentId),
    [matches, resultTournamentId]
  );

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSignedInEmail(data.session?.user.email ?? null);
      setCheckingSession(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null);
      setCheckingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!configured || !supabase) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h1 className="text-2xl font-black text-slate-950">Supabase is not connected</h1>
        <p className="mt-2 text-sm text-slate-700">Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`, then restart the app.</p>
      </div>
    );
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    setMessageType("info");
    try {
      await action();
      setMessageType("success");
      setMessage("Saved. Refreshing data...");
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(bucket: string, file?: File | null) {
    if (!file || !file.name || file.size === 0) return null;
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase!.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase!.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageType("info");
    try {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword("");
      setMessageType("success");
      setMessage("You are signed in. You can now add players, teams, tournaments, and results.");
    } catch (error) {
      setSignedInEmail(null);
      setMessageType("error");
      setMessage(error instanceof Error ? `Login failed: ${error.message}` : "Login failed. Please check your email and password.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase!.auth.signOut();
      if (error) throw error;
      setSignedInEmail(null);
      setMessageType("info");
      setMessage("You are signed out.");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setBusy(false);
    }
  }

  async function addPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const photo_url = await uploadPhoto("player-photos", form.get("photo") as File);
      const { error } = await supabase!.from("players").insert({ name: form.get("name"), photo_url });
      if (error) throw error;
    });
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const player1 = players.find((player) => player.id === form.get("player_1_id"));
    const player2 = players.find((player) => player.id === form.get("player_2_id"));
    await run(async () => {
      const team_photo_url = await uploadPhoto("team-photos", form.get("photo") as File);
      const { error } = await supabase!.from("teams").insert({
        player_1_id: form.get("player_1_id"),
        player_2_id: form.get("player_2_id"),
        team_name: form.get("team_name") || `${player1?.name ?? "Player"} / ${player2?.name ?? "Player"}`,
        team_photo_url
      });
      if (error) throw error;
    });
  }

  async function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const cover_image_url = await uploadPhoto("tournament-photos", form.get("cover") as File);
      const { error } = await supabase!.from("tournaments").insert({
        name: form.get("name"),
        status: form.get("status"),
        start_date: form.get("start_date"),
        cover_image_url
      });
      if (error) throw error;
    });
  }

  async function addTeamToTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const { error } = await supabase!.from("tournament_teams").insert({
        tournament_id: form.get("tournament_id"),
        team_id: form.get("team_id")
      });
      if (error) throw error;
    });
  }

  async function addMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const { error } = await supabase!.from("matches").insert({
        tournament_id: form.get("tournament_id"),
        team_1_id: form.get("team_1_id"),
        team_2_id: form.get("team_2_id"),
        stage: form.get("stage")
      });
      if (error) throw error;
    });
  }

  async function saveResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const match = matches.find((item) => item.id === form.get("match_id"));
    const team1 = Number(form.get("team_1_games"));
    const team2 = Number(form.get("team_2_games"));
    const result = validateScore(team1, team2);
    if (!match || !result.valid) {
      setMessage("Score must be one of 3-0, 3-1, 3-2, 0-3, 1-3, or 2-3.");
      return;
    }
    await run(async () => {
      const { error } = await supabase!.from("matches").update({
        team_1_games: team1,
        team_2_games: team2,
        winner_team_id: result.winnerSide === "team_1" ? match.team_1_id : match.team_2_id,
        played_at: new Date().toISOString()
      }).eq("id", match.id);
      if (error) throw error;
    });
  }

  async function closeTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const { error } = await supabase!.from("tournaments").update({
        champion_team_id: emptyToNull(form.get("champion_team_id")),
        runner_up_team_id: emptyToNull(form.get("runner_up_team_id")),
        third_place_team_id: emptyToNull(form.get("third_place_team_id")),
        status: form.get("status"),
        end_date: form.get("status") === "completed" ? new Date().toISOString().slice(0, 10) : null
      }).eq("id", form.get("tournament_id"));
      if (error) throw error;
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-slate-950 p-5 text-white">
        <h1 className="text-3xl font-black">Admin panel</h1>
        <p className="mt-2 text-sm text-slate-300">Fast entry for players, teams, tournaments, matches, and results.</p>
      </section>

      {signedInEmail ? (
        <section className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-900">Signed in successfully</p>
            <p className="text-sm text-emerald-800">{signedInEmail}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={signOut} disabled={busy}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>
      ) : (
        <form onSubmit={signIn} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
          <input className="field" type="email" placeholder="Admin email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input className="field" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="btn-primary" disabled={busy}>
            <LogIn className="h-4 w-4" /> {busy ? "Checking..." : "Sign in"}
          </button>
        </form>
      )}

      {message ? <p className={messageClass(messageType)}>{message}</p> : null}

      {!signedInEmail ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-950">
            {checkingSession ? "Checking login status..." : "Please sign in before editing tournament data."}
          </p>
          <p className="mt-1 text-sm text-amber-800">If login fails, the message above will tell you why.</p>
        </section>
      ) : null}

      {signedInEmail ? <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Add player">
          <form onSubmit={addPlayer} className="space-y-3">
            <input className="field" name="name" placeholder="Player name" required />
            <FileField name="photo" label="Player photo" />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Add player</button>
          </form>
        </Panel>

        <Panel title="Create team">
          <form onSubmit={createTeam} className="space-y-3">
            <Select name="player_1_id" label="Player 1" options={players.map((player) => [player.id, player.name])} />
            <Select name="player_2_id" label="Player 2" options={players.map((player) => [player.id, player.name])} />
            <input className="field" name="team_name" placeholder="Team name (optional)" />
            <FileField name="photo" label="Team photo" />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Create team</button>
          </form>
        </Panel>

        <Panel title="Create tournament">
          <form onSubmit={createTournament} className="space-y-3">
            <input className="field" name="name" placeholder="Tournament name" required />
            <input className="field" name="start_date" type="date" required />
            <Select name="status" label="Status" options={[["upcoming", "Upcoming"], ["active", "Active"], ["completed", "Completed"]]} />
            <FileField name="cover" label="Cover image" />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Create tournament</button>
          </form>
        </Panel>

        <Panel title="Add team to tournament">
          <form onSubmit={addTeamToTournament} className="space-y-3">
            <Select name="tournament_id" label="Tournament" options={tournaments.map((tournament) => [tournament.id, tournament.name])} />
            <Select name="team_id" label="Team" options={teams.map((team) => [team.id, teamLabel(team)])} />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Add team</button>
          </form>
        </Panel>

        <Panel title="Add match">
          <form onSubmit={addMatch} className="space-y-3">
            <Select name="tournament_id" label="Tournament" options={tournaments.map((tournament) => [tournament.id, tournament.name])} />
            <Select name="stage" label="Stage" options={(["group", "semifinal", "final", "third_place"] as Stage[]).map((stage) => [stage, stage.replace("_", " ")])} />
            <Select name="team_1_id" label="Team 1" options={teams.filter((team) => !activeTournament || tournamentTeamIds.has(team.id)).map((team) => [team.id, teamLabel(team)])} />
            <Select name="team_2_id" label="Team 2" options={teams.filter((team) => !activeTournament || tournamentTeamIds.has(team.id)).map((team) => [team.id, teamLabel(team)])} />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Add match</button>
          </form>
        </Panel>

        <Panel title="Enter or edit result">
          <form onSubmit={saveResult} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Tournament</span>
              <select
                className="field"
                value={resultTournamentId}
                onChange={(event) => setResultTournamentId(event.target.value)}
              >
                {tournaments.map((tournament) => (
                  <option key={`result-tournament-${tournament.id}`} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </label>
            <Select
              name="match_id"
              label="Match"
              options={resultMatches.map((match) => [match.id, `${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)} (${match.stage})`])}
            />
            {!resultMatches.length ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                No matches found for this tournament yet.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <input className="field" name="team_1_games" type="number" min={0} max={3} placeholder="Team 1 games" required />
              <input className="field" name="team_2_games" type="number" min={0} max={3} placeholder="Team 2 games" required />
            </div>
            <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> Save result</button>
          </form>
        </Panel>

        <Panel title="Close tournament">
          <form onSubmit={closeTournament} className="space-y-3">
            <Select name="tournament_id" label="Tournament" options={tournaments.map((tournament) => [tournament.id, tournament.name])} />
            <Select name="champion_team_id" label="Champion" required={false} options={[["", "None"], ...teams.map((team) => [team.id, teamLabel(team)] as [string, string])]} />
            <Select name="runner_up_team_id" label="Runner-up" required={false} options={[["", "None"], ...teams.map((team) => [team.id, teamLabel(team)] as [string, string])]} />
            <Select name="third_place_team_id" label="Third place" required={false} options={[["", "None"], ...teams.map((team) => [team.id, teamLabel(team)] as [string, string])]} />
            <Select name="status" label="Status" options={[["active", "Active"], ["completed", "Completed"]]} />
            <button className="btn-primary" disabled={busy}><Check className="h-4 w-4" /> Update tournament</button>
          </form>
        </Panel>
      </div> : null}
    </div>
  );
}

function messageClass(type: "info" | "success" | "error") {
  const base = "rounded-lg border p-3 text-sm font-semibold";
  if (type === "success") return `${base} border-emerald-200 bg-emerald-50 text-emerald-900`;
  if (type === "error") return `${base} border-red-200 bg-red-50 text-red-900`;
  return `${base} border-slate-200 bg-white text-slate-700`;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function Select({ name, label, options, required = true }: { name: string; label: string; options: string[][]; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase text-slate-500">{label}</span>
      <select className="field" name={name} required={required}>
        {options.map(([value, text]) => <option key={`${name}-${value}`} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function FileField({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500"><Upload className="h-3.5 w-3.5" /> {label}</span>
      <input className="field" name={name} type="file" accept="image/*" />
    </label>
  );
}

function emptyToNull(value: FormDataEntryValue | null) {
  return value ? String(value) : null;
}
