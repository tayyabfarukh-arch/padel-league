"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, LogIn, LogOut, Plus, Save, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FRIEND_CIRCLES } from "@/lib/friend-circles";
import { teamLabel } from "@/lib/format";
import { calculateTeamStats, getTargetGamesForStage, validateScore } from "@/lib/scoring";
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
  const [knockoutTournamentId, setKnockoutTournamentId] = useState(activeTournament?.id ?? "");
  const [resultTournamentId, setResultTournamentId] = useState(activeTournament?.id ?? "");
  const [selectedResultMatchId, setSelectedResultMatchId] = useState("");
  const tournamentTeamIds = useMemo(
    () => new Set(tournamentTeams.filter((item) => item.tournament_id === activeTournament?.id).map((item) => item.team_id)),
    [activeTournament?.id, tournamentTeams]
  );
  const resultMatches = useMemo(
    () => matches.filter((match) => !resultTournamentId || match.tournament_id === resultTournamentId),
    [matches, resultTournamentId]
  );
  const selectedResultMatch = resultMatches.find((match) => match.id === selectedResultMatchId) ?? resultMatches[0];
  const selectedResultTournament = tournaments.find((tournament) => tournament.id === selectedResultMatch?.tournament_id);
  const selectedResultTarget = selectedResultMatch
    ? getTargetGamesForStage(selectedResultTournament, selectedResultMatch.stage)
    : 3;

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
        friend_circle: form.get("friend_circle"),
        group_target_games: Number(form.get("group_target_games")),
        semifinal_target_games: Number(form.get("semifinal_target_games")),
        final_target_games: Number(form.get("final_target_games")),
        third_place_target_games: Number(form.get("third_place_target_games")),
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
    const tournament = tournaments.find((item) => item.id === match?.tournament_id);
    const targetGames = match ? getTargetGamesForStage(tournament, match.stage) : 3;
    const result = validateScore(team1, team2, targetGames);
    if (!match || !result.valid) {
      setMessageType("error");
      setMessage(`Score must be race to ${targetGames}. One team must reach exactly ${targetGames}, and the other team must be below ${targetGames}.`);
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

  async function createSemifinalsFromStandings() {
    await run(async () => {
      const tournamentTeamsForSelection = tournamentTeams.filter(
        (item) => item.tournament_id === knockoutTournamentId
      );
      const tournamentTeamIdsForSelection = new Set(tournamentTeamsForSelection.map((item) => item.team_id));
      const tournamentTeamsList = teams.filter((team) => tournamentTeamIdsForSelection.has(team.id));
      const groupMatches = matches.filter(
        (match) => match.tournament_id === knockoutTournamentId && match.stage === "group"
      );
      const existingSemifinals = matches.filter(
        (match) => match.tournament_id === knockoutTournamentId && match.stage === "semifinal"
      );

      if (!knockoutTournamentId) throw new Error("Select a tournament first.");
      if (existingSemifinals.length) throw new Error("Semifinals already exist for this tournament.");
      if (tournamentTeamsList.length < 4) throw new Error("You need at least 4 teams to create semifinals.");
      if (!groupMatches.length || groupMatches.some((match) => !match.winner_team_id)) {
        throw new Error("Finish all group match scores before creating semifinals.");
      }

      const standings = calculateTeamStats(tournamentTeamsList, groupMatches);
      const topFour = standings.slice(0, 4);
      if (topFour.length < 4) throw new Error("Could not find 4 ranked teams from the group standings.");

      const { error } = await supabase!.from("matches").insert([
        {
          tournament_id: knockoutTournamentId,
          team_1_id: topFour[0].team.id,
          team_2_id: topFour[3].team.id,
          stage: "semifinal"
        },
        {
          tournament_id: knockoutTournamentId,
          team_1_id: topFour[1].team.id,
          team_2_id: topFour[2].team.id,
          stage: "semifinal"
        }
      ]);
      if (error) throw error;
    });
  }

  async function createFinalFromSemifinals() {
    await run(async () => {
      const semifinals = matches.filter(
        (match) => match.tournament_id === knockoutTournamentId && match.stage === "semifinal"
      );
      const existingFinal = matches.find(
        (match) => match.tournament_id === knockoutTournamentId && match.stage === "final"
      );

      if (!knockoutTournamentId) throw new Error("Select a tournament first.");
      if (existingFinal) throw new Error("A final match already exists for this tournament.");
      if (semifinals.length !== 2 || semifinals.some((match) => !match.winner_team_id)) {
        throw new Error("Enter both semifinal scores before creating the final.");
      }

      const { error } = await supabase!.from("matches").insert({
        tournament_id: knockoutTournamentId,
        team_1_id: semifinals[0].winner_team_id,
        team_2_id: semifinals[1].winner_team_id,
        stage: "final"
      });
      if (error) throw error;
    });
  }

  async function createThirdPlaceFromSemifinals() {
    await run(async () => {
      const semifinals = matches.filter(
        (match) => match.tournament_id === knockoutTournamentId && match.stage === "semifinal"
      );
      const existingThirdPlace = matches.find(
        (match) => match.tournament_id === knockoutTournamentId && match.stage === "third_place"
      );

      if (!knockoutTournamentId) throw new Error("Select a tournament first.");
      if (existingThirdPlace) throw new Error("A third-place match already exists for this tournament.");
      if (semifinals.length !== 2 || semifinals.some((match) => !match.winner_team_id)) {
        throw new Error("Enter both semifinal scores before creating the third-place match.");
      }

      const semifinalLosers = semifinals.map((match) =>
        match.winner_team_id === match.team_1_id ? match.team_2_id : match.team_1_id
      );

      const { error } = await supabase!.from("matches").insert({
        tournament_id: knockoutTournamentId,
        team_1_id: semifinalLosers[0],
        team_2_id: semifinalLosers[1],
        stage: "third_place"
      });
      if (error) throw error;
    });
  }

  async function closeTournamentFromFinal() {
    await run(async () => {
      const final = matches.find(
        (match) => match.tournament_id === knockoutTournamentId && match.stage === "final"
      );
      const thirdPlace = matches.find(
        (match) => match.tournament_id === knockoutTournamentId && match.stage === "third_place"
      );

      if (!knockoutTournamentId) throw new Error("Select a tournament first.");
      if (!final || !final.winner_team_id) throw new Error("Enter the final score before closing the tournament.");
      if (thirdPlace && !thirdPlace.winner_team_id) {
        throw new Error("Enter the third-place score before closing, or remove that match if you are not using it.");
      }

      const runnerUpTeamId = final.winner_team_id === final.team_1_id ? final.team_2_id : final.team_1_id;
      const { error } = await supabase!.from("tournaments").update({
        champion_team_id: final.winner_team_id,
        runner_up_team_id: runnerUpTeamId,
        third_place_team_id: thirdPlace?.winner_team_id ?? null,
        status: "completed",
        end_date: new Date().toISOString().slice(0, 10)
      }).eq("id", knockoutTournamentId);
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
      <section className="court-panel rounded-lg p-5 text-white">
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
        <form onSubmit={signIn} className="sport-card grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
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
            <Select name="friend_circle" label="Friend circle" options={FRIEND_CIRCLES.filter((circle) => circle.value !== "overall").map((circle) => [circle.value, circle.label])} />
            <input className="field" name="start_date" type="date" required />
            <div className="grid grid-cols-2 gap-3">
              <Select name="group_target_games" label="Group race to" options={targetGameOptions()} />
              <Select name="semifinal_target_games" label="Semifinal race to" options={targetGameOptions()} />
              <Select name="final_target_games" label="Final race to" options={targetGameOptions()} />
              <Select name="third_place_target_games" label="Third-place race to" options={targetGameOptions()} />
            </div>
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

        <Panel title="Knockout setup">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Tournament</span>
              <select
                className="field"
                value={knockoutTournamentId}
                onChange={(event) => setKnockoutTournamentId(event.target.value)}
              >
                {tournaments.map((tournament) => (
                  <option key={`knockout-tournament-${tournament.id}`} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              <button type="button" className="btn-secondary" onClick={createSemifinalsFromStandings} disabled={busy}>
                Create semifinals from standings
              </button>
              <button type="button" className="btn-secondary" onClick={createFinalFromSemifinals} disabled={busy}>
                Create final from semifinal winners
              </button>
              <button type="button" className="btn-secondary" onClick={createThirdPlaceFromSemifinals} disabled={busy}>
                Create third-place match
              </button>
              <button type="button" className="btn-primary" onClick={closeTournamentFromFinal} disabled={busy}>
                Close from final result
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Recommended flow: finish group scores, create semifinals, enter semifinal scores, create final, enter final score, then close from final result.
            </p>
          </div>
        </Panel>

        <Panel title="Enter or edit result">
          <form onSubmit={saveResult} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Tournament</span>
              <select
                className="field"
                value={resultTournamentId}
                onChange={(event) => {
                  setResultTournamentId(event.target.value);
                  setSelectedResultMatchId("");
                }}
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
              value={selectedResultMatchId || resultMatches[0]?.id || ""}
              onChange={(value) => setSelectedResultMatchId(value)}
              options={resultMatches.map((match) => [match.id, `${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)} (${match.stage})`])}
            />
            {selectedResultMatch ? (
              <p className="rounded-md bg-limeball/40 p-3 text-sm font-black text-ink">
                This {selectedResultMatch.stage.replace("_", " ")} match is race to {selectedResultTarget}.
              </p>
            ) : null}
            {!resultMatches.length ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                No matches found for this tournament yet.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <input className="field" name="team_1_games" type="number" min={0} max={selectedResultTarget} placeholder="Team 1 games" required />
              <input className="field" name="team_2_games" type="number" min={0} max={selectedResultTarget} placeholder="Team 2 games" required />
            </div>
            <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> Save result</button>
          </form>
        </Panel>

        <Panel title="Manual close tournament">
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
    <section className="sport-card p-4">
      <h2 className="mb-4 text-lg font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function Select({
  name,
  label,
  options,
  required = true,
  value,
  onChange
}: {
  name: string;
  label: string;
  options: string[][];
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase text-slate-500">{label}</span>
      <select
        className="field"
        name={name}
        required={required}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      >
        {options.map(([value, text]) => <option key={`${name}-${value}`} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function targetGameOptions() {
  return ["3", "4", "5", "6"].map((value) => [value, `Race to ${value}`]);
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
