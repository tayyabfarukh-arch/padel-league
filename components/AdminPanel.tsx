"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Check, LogIn, LogOut, Plus, Save, Trash2, Upload, Youtube } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FRIEND_CIRCLES } from "@/lib/friend-circles";
import { teamLabel } from "@/lib/format";
import { calculateGroupStandings, getTargetGamesForStage, validateScore } from "@/lib/scoring";
import type { CourtStream, Match, Player, Stage, Team, Tournament, TournamentTeam } from "@/lib/types";

type Props = {
  configured: boolean;
  players: Player[];
  teams: Team[];
  tournaments: Tournament[];
  tournamentTeams: TournamentTeam[];
  matches: Match[];
  courtStreams: CourtStream[];
};

type AdminSection = "people" | "tournament" | "schedule" | "results";

export function AdminPanel({ configured, players, teams, tournaments, tournamentTeams, matches, courtStreams }: Props) {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">("info");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>("people");
  const activeTournament = tournaments.find((item) => item.status === "active") ?? tournaments[0];
  const [knockoutTournamentId, setKnockoutTournamentId] = useState(activeTournament?.id ?? "");
  const [resultTournamentId, setResultTournamentId] = useState(activeTournament?.id ?? "");
  const [selectedResultMatchId, setSelectedResultMatchId] = useState("");
  const [teamTournamentId, setTeamTournamentId] = useState(activeTournament?.id ?? "");
  const [matchTournamentId, setMatchTournamentId] = useState(activeTournament?.id ?? "");
  const [matchStage, setMatchStage] = useState<Stage>("group");
  const [matchGroup, setMatchGroup] = useState("A");
  const teamTournament = tournaments.find((item) => item.id === teamTournamentId);
  const matchTournament = tournaments.find((item) => item.id === matchTournamentId);
  const tournamentTeamIds = useMemo(
    () => new Set(
      tournamentTeams
        .filter(
          (item) =>
            item.tournament_id === matchTournamentId &&
            (matchStage !== "group" || item.group_name === matchGroup)
        )
        .map((item) => item.team_id)
    ),
    [matchGroup, matchStage, matchTournamentId, tournamentTeams]
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
  const selectedResultMaximum =
    selectedResultMatch?.stage === "group"
      ? selectedResultTarget
      : selectedResultTarget + 2;
  const selectedTournamentAssignments = tournamentTeams.filter((item) => item.tournament_id === teamTournamentId);
  const selectedTournamentMatches = matches.filter((item) => item.tournament_id === matchTournamentId);
  const selectedCourtStreams = courtStreams.filter((item) => item.tournament_id === matchTournamentId);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      await applyAdminSession(data.session);
      setCheckingSession(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyAdminSession(session).finally(() => setCheckingSession(false));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function applyAdminSession(session: Session | null) {
    if (!session) {
      setSignedInEmail(null);
      setUnauthorizedEmail(null);
      return false;
    }
    const { data, error } = await supabase!.rpc("is_admin");
    const allowed = !error && data === true;
    setSignedInEmail(allowed ? session.user.email ?? null : null);
    setUnauthorizedEmail(allowed ? null : session.user.email ?? null);
    return allowed;
  }

  useEffect(() => {
    const savedSection = window.sessionStorage.getItem("padel_admin_section");
    if (isAdminSection(savedSection)) setAdminSection(savedSection);
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
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const allowed = await applyAdminSession(data.session);
      if (!allowed) throw new Error("This account is not registered as the website administrator.");
      setPassword("");
      setMessageType("success");
      setMessage("You are signed in. You can now add players, teams, tournaments, and results.");
    } catch (error) {
      setSignedInEmail(null);
      setUnauthorizedEmail(null);
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
        group_count: Number(form.get("group_count")),
        court_count: Number(form.get("court_count")),
        group_target_points: Number(form.get("group_target_points")),
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
    const teamIds = form.getAll("team_ids").map(String);
    if (!teamIds.length) {
      setMessageType("error");
      setMessage("Select at least one team.");
      return;
    }
    await run(async () => {
      const { error } = await supabase!.from("tournament_teams").insert(
        teamIds.map((teamId) => ({
          tournament_id: form.get("tournament_id"),
          team_id: teamId,
          group_name: form.get("group_name")
        }))
      );
      if (error) throw error;
    });
  }

  async function updateTournamentSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const groupCount = Number(form.get("group_count"));
    await run(async () => {
      const { error } = await supabase!
        .from("tournaments")
        .update({
          group_count: groupCount,
          status: form.get("status")
        })
        .eq("id", teamTournamentId);
      if (error) throw error;

      if (groupCount === 1) {
        const { error: assignmentError } = await supabase!
          .from("tournament_teams")
          .update({ group_name: "A" })
          .eq("tournament_id", teamTournamentId);
        if (assignmentError) throw assignmentError;
      }
    });
  }

  async function changeTournamentTeamGroup(assignmentId: string, groupName: string) {
    await run(async () => {
      const { error } = await supabase!
        .from("tournament_teams")
        .update({ group_name: groupName })
        .eq("id", assignmentId);
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
        stage: form.get("stage"),
        group_name: form.get("stage") === "group" ? form.get("group_name") : null,
        court_number: Number(form.get("court_number"))
      });
      if (error) throw error;
    });
  }

  async function deleteMatch(match: Match) {
    const confirmed = window.confirm(
      `Delete ${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)}? This will also remove its score from the standings.`
    );
    if (!confirmed) return;

    await run(async () => {
      const { error } = await supabase!.from("matches").delete().eq("id", match.id);
      if (error) throw error;
    });
  }

  async function saveCourtStreams(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matchTournament) {
      setMessageType("error");
      setMessage("Select a tournament first.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const rows = Array.from({ length: matchTournament.court_count }, (_, index) => {
      const courtNumber = index + 1;
      return {
        tournament_id: matchTournament.id,
        court_number: courtNumber,
        youtube_url: String(form.get(`court_stream_${courtNumber}`) ?? "").trim()
      };
    });

    for (const row of rows.filter((item) => item.youtube_url)) {
      try {
        const url = new URL(row.youtube_url);
        const youtubeHost =
          url.hostname === "youtu.be" ||
          url.hostname === "youtube.com" ||
          url.hostname.endsWith(".youtube.com");
        if (!youtubeHost) throw new Error();
      } catch {
        setMessageType("error");
        setMessage(`Court ${row.court_number} needs a valid YouTube link.`);
        return;
      }
    }

    await run(async () => {
      const links = rows.filter((item) => item.youtube_url);
      if (links.length) {
        const { error } = await supabase!
          .from("tournament_court_streams")
          .upsert(links, { onConflict: "tournament_id,court_number" });
        if (error) throw error;
      }

      const emptyCourts = rows.filter((item) => !item.youtube_url).map((item) => item.court_number);
      if (emptyCourts.length) {
        const { error } = await supabase!
          .from("tournament_court_streams")
          .delete()
          .eq("tournament_id", matchTournament.id)
          .in("court_number", emptyCourts);
        if (error) throw error;
      }
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
    const result = validateScore(team1, team2, targetGames, match?.stage ?? "group");
    const decidingPointWinnerId = emptyToNull(form.get("deciding_point_winner_team_id"));
    if (!match || !result.valid) {
      const unit = match?.stage === "group" ? "points" : "games";
      setMessageType("error");
      setMessage(
        match?.stage === "group"
          ? `The two team scores must total ${targetGames} points. Example: ${Math.ceil(targetGames / 2)}-${Math.floor(targetGames / 2)}.`
          : `Finish at ${targetGames} ${unit}. If both teams reach ${targetGames}, continue until one team reaches ${targetGames + 2}.`
      );
      return;
    }
    const tiedGroupScore = match.stage === "group" && team1 === team2;
    if (
      tiedGroupScore &&
      decidingPointWinnerId !== match.team_1_id &&
      decidingPointWinnerId !== match.team_2_id
    ) {
      setMessageType("error");
      setMessage("Select the team that won the Golden point.");
      return;
    }
    await run(async () => {
      const { error } = await supabase!.from("matches").update({
        team_1_games: team1,
        team_2_games: team2,
        winner_team_id: tiedGroupScore
          ? decidingPointWinnerId
          : result.winnerSide === "team_1"
            ? match.team_1_id
            : result.winnerSide === "team_2"
              ? match.team_2_id
              : null,
        deciding_point_winner_team_id: tiedGroupScore ? decidingPointWinnerId : null,
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
      if (
        !groupMatches.length ||
        groupMatches.some((match) => match.team_1_games === null || match.team_2_games === null)
      ) {
        throw new Error("Finish all group match scores before creating semifinals.");
      }

      const selectedTournament = tournaments.find((item) => item.id === knockoutTournamentId);
      let semifinalTeams: [Team, Team, Team, Team];

      if (selectedTournament?.group_count === 2) {
        const groupATeamIds = new Set(
          tournamentTeamsForSelection.filter((item) => item.group_name === "A").map((item) => item.team_id)
        );
        const groupBTeamIds = new Set(
          tournamentTeamsForSelection.filter((item) => item.group_name === "B").map((item) => item.team_id)
        );
        const groupATeams = teams.filter((team) => groupATeamIds.has(team.id));
        const groupBTeams = teams.filter((team) => groupBTeamIds.has(team.id));
        const groupAMatches = groupMatches.filter(
          (match) => groupATeamIds.has(match.team_1_id) && groupATeamIds.has(match.team_2_id)
        );
        const groupBMatches = groupMatches.filter(
          (match) => groupBTeamIds.has(match.team_1_id) && groupBTeamIds.has(match.team_2_id)
        );

        if (groupATeams.length < 2 || groupBTeams.length < 2) {
          throw new Error("Two-group tournaments need at least 2 teams in both Group A and Group B.");
        }
        if (!groupAMatches.length || !groupBMatches.length) {
          throw new Error("Both Group A and Group B need completed group matches before creating semifinals.");
        }

        const groupATopTwo = calculateGroupStandings(groupATeams, groupAMatches).slice(0, 2);
        const groupBTopTwo = calculateGroupStandings(groupBTeams, groupBMatches).slice(0, 2);
        if (groupATopTwo.length < 2 || groupBTopTwo.length < 2) {
          throw new Error("Could not find the top 2 teams from both groups.");
        }

        semifinalTeams = [
          groupATopTwo[0].team,
          groupBTopTwo[1].team,
          groupATopTwo[1].team,
          groupBTopTwo[0].team
        ];
      } else {
        const topFour = calculateGroupStandings(tournamentTeamsList, groupMatches).slice(0, 4);
        if (topFour.length < 4) throw new Error("Could not find 4 ranked teams from the group standings.");
        semifinalTeams = [topFour[0].team, topFour[3].team, topFour[1].team, topFour[2].team];
      }

      const { error } = await supabase!.from("matches").insert([
        {
          tournament_id: knockoutTournamentId,
          team_1_id: semifinalTeams[0].id,
          team_2_id: semifinalTeams[1].id,
          stage: "semifinal",
          court_number: 1
        },
        {
          tournament_id: knockoutTournamentId,
          team_1_id: semifinalTeams[2].id,
          team_2_id: semifinalTeams[3].id,
          stage: "semifinal",
          court_number: selectedTournament?.court_count && selectedTournament.court_count > 1 ? 2 : 1
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
        stage: "final",
        court_number: 1
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
      const selectedTournament = tournaments.find((item) => item.id === knockoutTournamentId);

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
        stage: "third_place",
        court_number: selectedTournament?.court_count && selectedTournament.court_count > 1 ? 2 : 1
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
            {checkingSession
              ? "Checking login status..."
              : unauthorizedEmail
                ? `${unauthorizedEmail} is signed in as a participant, not an Admin.`
                : "Please sign in before editing tournament data."}
          </p>
          <p className="mt-1 text-sm text-amber-800">If login fails, the message above will tell you why.</p>
        </section>
      ) : null}

      {signedInEmail ? (
        <>
          <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            {([
              ["people", "People"],
              ["tournament", "Tournament"],
              ["schedule", "Schedule"],
              ["results", "Results"]
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={adminSection === value ? "btn-primary whitespace-nowrap" : "btn-secondary whitespace-nowrap"}
                onClick={() => {
                  setAdminSection(value);
                  window.sessionStorage.setItem("padel_admin_section", value);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
        {adminSection === "people" ? (
          <>
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
          </>
        ) : null}

        {adminSection === "tournament" ? (
          <>
        <Panel title="Create tournament">
          <form onSubmit={createTournament} className="space-y-3">
            <input className="field" name="name" placeholder="Tournament name" required />
            <Select name="friend_circle" label="Friend circle" options={FRIEND_CIRCLES.filter((circle) => circle.value !== "overall").map((circle) => [circle.value, circle.label])} />
            <Select name="group_count" label="Group setup" options={[["1", "One group"], ["2", "Two groups (A and B)"]]} />
            <NumberField name="court_count" label="Number of courts" defaultValue={4} max={20} />
            <input className="field" name="start_date" type="date" required />
            <div className="grid grid-cols-2 gap-3">
              <NumberField name="group_target_points" label="Group points target" defaultValue={15} max={100} />
              <NumberField name="semifinal_target_games" label="Semifinal games target" defaultValue={6} max={10} />
              <NumberField name="final_target_games" label="Final games target" defaultValue={6} max={10} />
              <NumberField name="third_place_target_games" label="Third-place games target" defaultValue={6} max={10} />
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Group matches use points. Knockout matches extend by two games if both teams reach the selected target.
            </p>
            <Select name="status" label="Status" options={[["upcoming", "Upcoming"], ["active", "Active"], ["completed", "Completed"]]} />
            <FileField name="cover" label="Cover image" />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Create tournament</button>
          </form>
        </Panel>

        <Panel title="Add team to tournament">
          <div className="mb-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <Select
              name="selected_tournament"
              label="Tournament"
              value={teamTournamentId}
              onChange={setTeamTournamentId}
              options={tournaments.map((tournament) => [tournament.id, tournament.name])}
            />
            <form onSubmit={updateTournamentSetup} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <Select
                  key={`group-setup-${teamTournamentId}`}
                  name="group_count"
                  label="Group setup"
                  defaultValue={String(teamTournament?.group_count ?? 1)}
                  options={[["1", "One group"], ["2", "Two groups (A and B)"]]}
                />
              </div>
              <div>
                <Select
                  key={`status-setup-${teamTournamentId}`}
                  name="status"
                  label="Tournament status"
                  defaultValue={teamTournament?.status ?? "upcoming"}
                  options={[["upcoming", "Upcoming"], ["active", "Active"], ["completed", "Completed"]]}
                />
              </div>
              <button className="btn-secondary shrink-0" disabled={busy}>
                <Save className="h-4 w-4" /> Save setup
              </button>
            </form>
          </div>
          <form onSubmit={addTeamToTournament} className="space-y-3">
            <input type="hidden" name="tournament_id" value={teamTournamentId} />
            <Select
              name="group_name"
              label="Group"
              options={teamTournament?.group_count === 2 ? [["A", "Group A"], ["B", "Group B"]] : [["A", "Group A"]]}
            />
            <fieldset>
              <legend className="mb-2 text-xs font-black uppercase text-slate-500">Select teams</legend>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                {teams.filter((team) => !selectedTournamentAssignments.some((entry) => entry.team_id === team.id)).map((team) => (
                  <label key={team.id} className="flex cursor-pointer items-center gap-3 rounded-md bg-white p-3 text-sm shadow-sm">
                    <input className="h-4 w-4 accent-emerald-600" type="checkbox" name="team_ids" value={team.id} />
                    <span className="min-w-0 truncate font-bold text-slate-900">{teamLabel(team)}</span>
                  </label>
                ))}
                {teams.length === selectedTournamentAssignments.length ? (
                  <p className="p-3 text-sm font-semibold text-slate-500">All available teams are already in this tournament.</p>
                ) : null}
              </div>
            </fieldset>
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Add selected teams</button>
          </form>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-black text-slate-950">Teams already added</h3>
            <div className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
              {selectedTournamentAssignments.length ? selectedTournamentAssignments.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="min-w-0 truncate font-bold text-slate-900">{teamLabel(entry.team)}</span>
                  {teamTournament?.group_count === 2 ? (
                    <select
                      className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700"
                      value={entry.group_name}
                      disabled={busy}
                      onChange={(event) => void changeTournamentTeamGroup(entry.id, event.target.value)}
                      aria-label={`Change group for ${teamLabel(entry.team)}`}
                    >
                      <option value="A">Group A</option>
                      <option value="B">Group B</option>
                    </select>
                  ) : (
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                      Group A
                    </span>
                  )}
                </div>
              )) : (
                <p className="p-3 text-sm font-semibold text-slate-500">No teams added to this tournament yet.</p>
              )}
            </div>
          </div>
        </Panel>
          </>
        ) : null}

        {adminSection === "schedule" ? (
          <>
        <Panel title="Court YouTube streams">
          <div className="space-y-3">
            <Select
              name="stream_tournament_id"
              label="Tournament"
              value={matchTournamentId}
              onChange={(value) => {
                setMatchTournamentId(value);
                if (tournaments.find((item) => item.id === value)?.group_count !== 2) setMatchGroup("A");
              }}
              options={tournaments.map((tournament) => [tournament.id, tournament.name])}
            />
            <form key={`court-streams-${matchTournamentId}`} onSubmit={saveCourtStreams} className="space-y-3">
              {Array.from({ length: matchTournament?.court_count ?? 0 }, (_, index) => {
                const courtNumber = index + 1;
                const existingUrl = selectedCourtStreams.find((stream) => stream.court_number === courtNumber)?.youtube_url ?? "";
                return (
                  <label key={`court-stream-${courtNumber}`} className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500">
                      <Youtube className="h-4 w-4 text-red-600" /> Court {courtNumber} YouTube link
                    </span>
                    <input
                      className="field"
                      name={`court_stream_${courtNumber}`}
                      type="url"
                      defaultValue={existingUrl}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </label>
                );
              })}
              <button className="btn-primary" disabled={busy || !matchTournament}>
                <Save className="h-4 w-4" /> Save court links
              </button>
            </form>
            <p className="text-xs font-semibold text-slate-500">
              Paste each stream once. Matches automatically use the link matching their court number.
            </p>
          </div>
        </Panel>

        <Panel title="Add match">
          <form onSubmit={addMatch} className="space-y-3">
            <Select
              name="tournament_id"
              label="Tournament"
              value={matchTournamentId}
              onChange={(value) => {
                setMatchTournamentId(value);
                if (tournaments.find((item) => item.id === value)?.group_count !== 2) setMatchGroup("A");
              }}
              options={tournaments.map((tournament) => [tournament.id, tournament.name])}
            />
            <Select
              name="stage"
              label="Stage"
              value={matchStage}
              onChange={(value) => setMatchStage(value as Stage)}
              options={(["group", "semifinal", "final", "third_place"] as Stage[]).map((stage) => [stage, stage.replace("_", " ")])}
            />
            {matchStage === "group" ? (
              <Select
                name="group_name"
                label="Group"
                value={matchGroup}
                onChange={setMatchGroup}
                options={matchTournament?.group_count === 2 ? [["A", "Group A"], ["B", "Group B"]] : [["A", "Group A"]]}
              />
            ) : null}
            <Select
              name="court_number"
              label="Court"
              options={Array.from({ length: matchTournament?.court_count ?? 1 }, (_, index) => [
                String(index + 1),
                `Court ${index + 1}`
              ])}
            />
            <Select name="team_1_id" label="Team 1" options={teams.filter((team) => tournamentTeamIds.has(team.id)).map((team) => [team.id, teamLabel(team)])} />
            <Select name="team_2_id" label="Team 2" options={teams.filter((team) => tournamentTeamIds.has(team.id)).map((team) => [team.id, teamLabel(team)])} />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Add match</button>
          </form>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-black text-slate-950">Matches already created</h3>
            <div className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
              {selectedTournamentMatches.length ? selectedTournamentMatches.map((match) => (
                <div key={match.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-bold text-slate-900">
                      {teamLabel(match.team_1)} vs {teamLabel(match.team_2)}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-black text-court">Court {match.court_number ?? "TBD"}</span>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-md text-red-600 transition hover:bg-red-50"
                        onClick={() => void deleteMatch(match)}
                        disabled={busy}
                        title="Delete match"
                        aria-label={`Delete ${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase text-slate-500">
                    {match.stage.replace("_", " ")}{match.group_name ? ` | Group ${match.group_name}` : ""}
                  </p>
                </div>
              )) : (
                <p className="p-3 text-sm font-semibold text-slate-500">No matches created for this tournament yet.</p>
              )}
            </div>
          </div>
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
          </>
        ) : null}

        {adminSection === "results" ? (
          <>
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
                {selectedResultMatch.stage === "group"
                  ? `The two team scores must total ${selectedResultTarget} points.`
                  : `First to ${selectedResultTarget}. At ${selectedResultTarget}-${selectedResultTarget}, continue until one team reaches ${selectedResultTarget + 2}.`}
              </p>
            ) : null}
            {!resultMatches.length ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                No matches found for this tournament yet.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <input className="field" name="team_1_games" type="number" min={0} max={selectedResultMaximum} placeholder={`Team 1 ${selectedResultMatch?.stage === "group" ? "points" : "games"}`} required />
              <input className="field" name="team_2_games" type="number" min={0} max={selectedResultMaximum} placeholder={`Team 2 ${selectedResultMatch?.stage === "group" ? "points" : "games"}`} required />
            </div>
            {selectedResultMatch?.stage === "group" ? (
              <Select
                key={`deciding-point-${selectedResultMatch.id}`}
                name="deciding_point_winner_team_id"
                label="Golden point winner (only when tied)"
                required={false}
                options={[
                  ["", "Not needed"],
                  [selectedResultMatch.team_1_id, teamLabel(selectedResultMatch.team_1)],
                  [selectedResultMatch.team_2_id, teamLabel(selectedResultMatch.team_2)]
                ]}
              />
            ) : null}
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
          </>
        ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function messageClass(type: "info" | "success" | "error") {
  const base = "rounded-lg border p-3 text-sm font-semibold";
  if (type === "success") return `${base} border-emerald-200 bg-emerald-50 text-emerald-900`;
  if (type === "error") return `${base} border-red-200 bg-red-50 text-red-900`;
  return `${base} border-slate-200 bg-white text-slate-700`;
}

function isAdminSection(value: string | null): value is AdminSection {
  return value === "people" || value === "tournament" || value === "schedule" || value === "results";
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
  defaultValue,
  onChange
}: {
  name: string;
  label: string;
  options: string[][];
  required?: boolean;
  value?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      >
        {options.map(([value, text]) => <option key={`${name}-${value}`} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
  max
}: {
  name: string;
  label: string;
  defaultValue: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase text-slate-500">{label}</span>
      <input className="field" name={name} type="number" min={1} max={max} defaultValue={defaultValue} required />
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
