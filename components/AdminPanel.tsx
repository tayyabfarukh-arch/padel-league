"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeftRight, Check, Filter, GripVertical, LogIn, LogOut, Plus, RotateCcw, Save, Sparkles, Trash2, Upload, Youtube } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FRIEND_CIRCLES } from "@/lib/friend-circles";
import { AmericanoAdminPanel } from "@/components/AmericanoAdminPanel";
import { PlayerAccountAdmin } from "@/components/PlayerAccountAdmin";
import { teamLabel } from "@/lib/format";
import { calculateGroupStandings, getTargetGamesForStage, validateScore } from "@/lib/scoring";
import { generateRegularGroupSchedule, matchPairKey } from "@/lib/regular-schedule";
import type { CourtScheduleRule } from "@/lib/regular-schedule";
import type { AmericanoMatch, CourtStream, GroupName, Match, Player, Stage, Team, Tournament, TournamentPlayer, TournamentTeam } from "@/lib/types";

type Props = {
  configured: boolean;
  players: Player[];
  teams: Team[];
  tournaments: Tournament[];
  tournamentPlayers: TournamentPlayer[];
  tournamentTeams: TournamentTeam[];
  matches: Match[];
  americanoMatches: AmericanoMatch[];
  courtStreams: CourtStream[];
};

type AdminSection = "accounts" | "people" | "tournament" | "schedule" | "results";

export function AdminPanel({ configured, players, teams, tournaments: allTournaments, tournamentPlayers, tournamentTeams, matches, americanoMatches, courtStreams }: Props) {
  const tournaments = allTournaments.filter((item) => item.tournament_format === "regular");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">("info");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adminWorkspace, setAdminWorkspace] = useState<"regular" | "americano">("regular");
  const [adminSection, setAdminSection] = useState<AdminSection>("people");
  const activeTournament = tournaments.find((item) => item.status === "active") ?? tournaments[0];
  const [knockoutTournamentId, setKnockoutTournamentId] = useState(activeTournament?.id ?? "");
  const [resultTournamentId, setResultTournamentId] = useState(activeTournament?.id ?? "");
  const [resultTeamFilterId, setResultTeamFilterId] = useState("all");
  const [selectedResultMatchId, setSelectedResultMatchId] = useState("");
  const [teamTournamentId, setTeamTournamentId] = useState(activeTournament?.id ?? "");
  const [matchTournamentId, setMatchTournamentId] = useState(activeTournament?.id ?? "");
  const [matchStage, setMatchStage] = useState<Stage>("group");
  const [matchGroup, setMatchGroup] = useState("A");
  const [courtScheduleRules, setCourtScheduleRules] = useState<Record<number, { maxMatches: number; groups: GroupName[] }>>({});
  const [scheduleRoundFilter, setScheduleRoundFilter] = useState("all");
  const [scheduleGroupFilter, setScheduleGroupFilter] = useState("all");
  const [scheduleTeamFilter, setScheduleTeamFilter] = useState("all");
  const [scheduleCourtFilter, setScheduleCourtFilter] = useState("all");
  const [selectedScheduleMatchIds, setSelectedScheduleMatchIds] = useState<string[]>([]);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, { roundNumber: number; courtNumber: number }>>({});
  const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);
  const [swapMatchId, setSwapMatchId] = useState<string | null>(null);
  const [roundSwapFrom, setRoundSwapFrom] = useState("");
  const [roundSwapTo, setRoundSwapTo] = useState("");
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
  const resultTeamOptions = useMemo(() => {
    const tournamentMatches = matches.filter(
      (match) => !resultTournamentId || match.tournament_id === resultTournamentId
    );
    const teamIds = new Set(
      tournamentMatches.flatMap((match) => [match.team_1_id, match.team_2_id])
    );
    return teams.filter((team) => teamIds.has(team.id));
  }, [matches, resultTournamentId, teams]);
  const resultMatches = useMemo(
    () =>
      matches
        .filter(
          (match) =>
            (!resultTournamentId || match.tournament_id === resultTournamentId) &&
            (
              resultTeamFilterId === "all" ||
              match.team_1_id === resultTeamFilterId ||
              match.team_2_id === resultTeamFilterId
            )
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [matches, resultTeamFilterId, resultTournamentId]
  );
  const selectedResultMatch = resultMatches.find((match) => match.id === selectedResultMatchId) ?? resultMatches[0];
  const selectedResultTournament = tournaments.find((tournament) => tournament.id === selectedResultMatch?.tournament_id);
  const selectedResultTarget = selectedResultMatch
    ? getTargetGamesForStage(selectedResultTournament, selectedResultMatch.stage)
    : 3;
  const selectedResultMaximum =
    selectedResultMatch?.stage === "group"
      ? selectedResultTarget
      : selectedResultTarget + 1;
  const selectedTournamentAssignments = tournamentTeams.filter((item) => item.tournament_id === teamTournamentId);
  const selectedTournamentMatches = matches
    .filter((item) => item.tournament_id === matchTournamentId)
    .sort(
      (a, b) =>
        (a.stage === "group" ? 0 : 1) - (b.stage === "group" ? 0 : 1) ||
        (a.round_number ?? Number.MAX_SAFE_INTEGER) - (b.round_number ?? Number.MAX_SAFE_INTEGER) ||
        (a.court_number ?? Number.MAX_SAFE_INTEGER) - (b.court_number ?? Number.MAX_SAFE_INTEGER) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  const selectedMatchAssignments = tournamentTeams.filter((item) => item.tournament_id === matchTournamentId);
  const groupFixtureCount = (matchTournament?.group_count === 2 ? ["A", "B"] : ["A"]).reduce((total, groupName) => {
    const teamCount = selectedMatchAssignments.filter((entry) => entry.group_name === groupName).length;
    return total + (teamCount < 2 ? 0 : teamCount * (teamCount - 1) / 2);
  }, 0);
  const recommendedMatchesPerCourt = Math.max(1, Math.ceil(groupFixtureCount / Math.max(1, matchTournament?.court_count ?? 1)));
  const activeScheduleRules: CourtScheduleRule[] = Array.from(
    { length: matchTournament?.court_count ?? 0 },
    (_, index) => {
      const courtNumber = index + 1;
      const configured = courtScheduleRules[courtNumber];
      return {
        court_number: courtNumber,
        max_matches: configured?.maxMatches ?? recommendedMatchesPerCourt,
        groups: configured?.groups ?? (matchTournament?.group_count === 2 ? ["A", "B"] : ["A"])
      } as CourtScheduleRule;
    }
  );
  let generatedGroupSchedule: ReturnType<typeof generateRegularGroupSchedule> = [];
  let scheduleGenerationError = "";
  if (matchTournament) {
    try {
      generatedGroupSchedule = generateRegularGroupSchedule(
        selectedMatchAssignments,
        matchTournament.group_count,
        matchTournament.court_count,
        activeScheduleRules
      );
    } catch (error) {
      scheduleGenerationError = error instanceof Error ? error.message : "The selected court rules cannot fit the complete schedule.";
    }
  }
  const existingGroupPairKeys = new Set(
    selectedTournamentMatches
      .filter((match) => match.stage === "group")
      .map((match) => matchPairKey(match.team_1_id, match.team_2_id))
  );
  const missingGeneratedMatches = generatedGroupSchedule.filter(
    (match) => !existingGroupPairKeys.has(matchPairKey(match.team_1_id, match.team_2_id))
  );
  const generatedScheduleByPair = new Map(
    generatedGroupSchedule.map((match) => [matchPairKey(match.team_1_id, match.team_2_id), match])
  );
  const groupMatchesMissingRounds = selectedTournamentMatches.filter(
    (match) =>
      match.stage === "group" &&
      !match.round_number &&
      generatedScheduleByPair.has(matchPairKey(match.team_1_id, match.team_2_id))
  );
  const scheduleRoundCount = Math.max(0, ...generatedGroupSchedule.map((match) => match.round_number));
  const selectedCourtStreams = courtStreams.filter((item) => item.tournament_id === matchTournamentId);
  const scheduleFilterTeams = teams.filter((team) => selectedMatchAssignments.some((entry) => entry.team_id === team.id));
  const filteredScheduleMatches = selectedTournamentMatches.filter((match) =>
    (
      scheduleRoundFilter === "all" ||
      (scheduleRoundFilter === "unscheduled"
        ? match.stage === "group" && !match.round_number
        : match.stage === "group" && String(match.round_number) === scheduleRoundFilter)
    ) &&
    (scheduleGroupFilter === "all" || match.group_name === scheduleGroupFilter) &&
    (scheduleTeamFilter === "all" || match.team_1_id === scheduleTeamFilter || match.team_2_id === scheduleTeamFilter) &&
    (scheduleCourtFilter === "all" || String(match.court_number ?? "unassigned") === scheduleCourtFilter)
  );
  const filteredScheduleMatchIds = filteredScheduleMatches.map((match) => match.id);
  const allFilteredScheduleMatchesSelected = Boolean(filteredScheduleMatchIds.length) &&
    filteredScheduleMatchIds.every((id) => selectedScheduleMatchIds.includes(id));
  const availableScheduleRounds = Array.from(
    new Set(selectedTournamentMatches.filter((match) => match.stage === "group" && match.round_number).map((match) => match.round_number as number))
  ).sort((a, b) => a - b);
  const scheduleMatchesByRound = Array.from(
    filteredScheduleMatches.reduce((groups, match) => {
      const key = match.stage === "group" ? String(match.round_number ?? "Unscheduled") : "Knockout matches";
      groups.set(key, [...(groups.get(key) ?? []), match]);
      return groups;
    }, new Map<string, Match[]>())
  );

  useEffect(() => {
    if (!matchTournament) return;
    const defaultGroups: GroupName[] = matchTournament.group_count === 2 ? ["A", "B"] : ["A"];
    setCourtScheduleRules(
      Object.fromEntries(
        Array.from({ length: matchTournament.court_count }, (_, index) => [
          index + 1,
          { maxMatches: recommendedMatchesPerCourt, groups: defaultGroups }
        ])
      )
    );
  }, [groupFixtureCount, matchTournamentId, matchTournament?.court_count, matchTournament?.group_count, recommendedMatchesPerCourt]);

  useEffect(() => {
    setScheduleRoundFilter("all");
    setScheduleGroupFilter("all");
    setScheduleTeamFilter("all");
    setScheduleCourtFilter("all");
    setSelectedScheduleMatchIds([]);
    setScheduleDrafts({});
    setDraggedMatchId(null);
    setSwapMatchId(null);
    setRoundSwapFrom("");
    setRoundSwapTo("");
  }, [matchTournamentId]);

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
    if (window.sessionStorage.getItem("padel_admin_workspace") === "americano") setAdminWorkspace("americano");
  }, []);

  if (!configured || !supabase) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h1 className="text-2xl font-black text-slate-950">Supabase is not connected</h1>
        <p className="mt-2 text-sm text-slate-700">Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`, then restart the app.</p>
      </div>
    );
  }

  async function run(action: () => Promise<void>, successMessage = "Saved. Refreshing data...") {
    setBusy(true);
    setMessage("");
    setMessageType("info");
    try {
      await action();
      setMessageType("success");
      setMessage(successMessage);
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

  async function updatePlayerPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const playerId = String(form.get("player_id") ?? "");
    await run(async () => {
      const photo_url = await uploadPhoto("player-photos", form.get("photo") as File);
      if (!photo_url) throw new Error("Please choose a player photo.");
      const { error } = await supabase!.from("players").update({ photo_url }).eq("id", playerId);
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
        points_scoring_mode: form.get("points_scoring_mode"),
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
    const courtCount = Number(form.get("court_count"));
    if (!Number.isInteger(courtCount) || courtCount < 1 || courtCount > 20) {
      setMessageType("error");
      setMessage("Enter a number of courts between 1 and 20.");
      return;
    }
    await run(async () => {
      const { error } = await supabase!
        .from("tournaments")
        .update({
          group_count: groupCount,
          court_count: courtCount,
          points_scoring_mode: form.get("points_scoring_mode"),
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

      if (courtCount !== teamTournament?.court_count || groupCount !== teamTournament?.group_count) {
        const normalizedAssignments = tournamentTeams
          .filter((entry) => entry.tournament_id === teamTournamentId)
          .map((entry) => groupCount === 1 ? { ...entry, group_name: "A" as const } : entry);
        const regeneratedSchedule = generateRegularGroupSchedule(
          normalizedAssignments,
          groupCount as 1 | 2,
          courtCount
        );
        const regeneratedByPair = new Map(
          regeneratedSchedule.map((match) => [matchPairKey(match.team_1_id, match.team_2_id), match])
        );
        const tournamentMatches = matches.filter((match) => match.tournament_id === teamTournamentId);
        const extraGroupMatches = tournamentMatches.filter(
          (match) => match.stage === "group" && !regeneratedByPair.has(matchPairKey(match.team_1_id, match.team_2_id))
        );
        const generatedRoundCount = Math.max(0, ...regeneratedSchedule.map((match) => match.round_number));
        const updates = await Promise.all(
          tournamentMatches.map((match, index) => {
            const generated = match.stage === "group"
              ? regeneratedByPair.get(matchPairKey(match.team_1_id, match.team_2_id))
              : undefined;
            const extraIndex = extraGroupMatches.findIndex((item) => item.id === match.id);
            const values = generated
              ? {
                  group_name: generated.group_name,
                  round_number: generated.round_number,
                  court_number: generated.court_number
                }
              : match.stage === "group" && extraIndex >= 0
                ? {
                    round_number: generatedRoundCount + Math.floor(extraIndex / courtCount) + 1,
                    court_number: (extraIndex % courtCount) + 1
                  }
                : {
                    round_number: null,
                    court_number: (index % courtCount) + 1
                  };
            return supabase!
              .from("matches")
              .update(values)
              .eq("id", match.id);
          })
        );
        const courtError = updates.find((result) => result.error)?.error;
        if (courtError) throw courtError;
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
        round_number: form.get("stage") === "group" ? Number(form.get("round_number")) : null,
        court_number: Number(form.get("court_number"))
      });
      if (error) throw error;
    });
  }

  async function generateGroupSchedule() {
    if (!matchTournament) {
      setMessageType("error");
      setMessage("Select a tournament first.");
      return;
    }
    if (scheduleGenerationError) {
      setMessageType("error");
      setMessage(scheduleGenerationError);
      return;
    }
    const requiredGroups = matchTournament.group_count === 2 ? ["A", "B"] : ["A"];
    const incompleteGroup = requiredGroups.find(
      (groupName) => selectedMatchAssignments.filter((entry) => entry.group_name === groupName).length < 2
    );
    if (incompleteGroup) {
      setMessageType("error");
      setMessage(`Group ${incompleteGroup} needs at least two teams before its schedule can be generated.`);
      return;
    }
    if (!missingGeneratedMatches.length && !groupMatchesMissingRounds.length) {
      setMessageType("success");
      setMessage("The complete group schedule already exists. You can amend courts, delete matches, or add matches manually below.");
      return;
    }

    await run(async () => {
      if (groupMatchesMissingRounds.length) {
        const updates = await Promise.all(
          groupMatchesMissingRounds.map((match) => {
            const generated = generatedScheduleByPair.get(matchPairKey(match.team_1_id, match.team_2_id))!;
            return supabase!
              .from("matches")
              .update({
                group_name: generated.group_name,
                round_number: generated.round_number,
                court_number: generated.court_number
              })
              .eq("id", match.id);
          })
        );
        const updateError = updates.find((result) => result.error)?.error;
        if (updateError) throw updateError;
      }
      if (missingGeneratedMatches.length) {
        const { error } = await supabase!.from("matches").insert(
          missingGeneratedMatches.map((match) => ({
            tournament_id: matchTournament.id,
            team_1_id: match.team_1_id,
            team_2_id: match.team_2_id,
            stage: "group",
            group_name: match.group_name,
            round_number: match.round_number,
            court_number: match.court_number
          }))
        );
        if (error) throw error;
      }
    });
  }

  async function applyCourtPlanToExistingSchedule() {
    if (!matchTournament || scheduleGenerationError || !generatedGroupSchedule.length) return;
    const existingGeneratedMatches = selectedTournamentMatches.filter(
      (match) => match.stage === "group" && generatedScheduleByPair.has(matchPairKey(match.team_1_id, match.team_2_id))
    );
    if (!existingGeneratedMatches.length) {
      setMessageType("error");
      setMessage("Generate the group matches first, then apply the court plan.");
      return;
    }
    const confirmed = window.confirm(
      `Reassign the round and court for ${existingGeneratedMatches.length} group matches? Existing scores will be preserved.`
    );
    if (!confirmed) return;
    await run(async () => {
      const updates = await Promise.all(
        existingGeneratedMatches.map((match) => {
          const generated = generatedScheduleByPair.get(matchPairKey(match.team_1_id, match.team_2_id))!;
          return supabase!.from("matches").update({
            group_name: generated.group_name,
            round_number: generated.round_number,
            court_number: generated.court_number
          }).eq("id", match.id);
        })
      );
      const error = updates.find((result) => result.error)?.error;
      if (error) throw error;
    });
  }

  async function changeMatchCourt(matchId: string, courtNumber: number) {
    await run(async () => {
      const { error } = await supabase!.from("matches").update({ court_number: courtNumber }).eq("id", matchId);
      if (error) throw error;
    });
  }

  async function changeMatchRound(matchId: string, roundNumber: number) {
    await run(async () => {
      const { error } = await supabase!.from("matches").update({ round_number: roundNumber }).eq("id", matchId);
      if (error) throw error;
    });
  }

  function updateCourtScheduleRule(courtNumber: number, values: Partial<{ maxMatches: number; groups: GroupName[] }>) {
    setCourtScheduleRules((current) => ({
      ...current,
      [courtNumber]: {
        maxMatches: values.maxMatches ?? current[courtNumber]?.maxMatches ?? recommendedMatchesPerCourt,
        groups: values.groups ?? current[courtNumber]?.groups ?? (matchTournament?.group_count === 2 ? ["A", "B"] : ["A"])
      }
    }));
  }

  function toggleCourtGroup(courtNumber: number, groupName: GroupName) {
    const currentGroups = courtScheduleRules[courtNumber]?.groups ?? (matchTournament?.group_count === 2 ? ["A", "B"] : ["A"]);
    const groups = currentGroups.includes(groupName)
      ? currentGroups.filter((item) => item !== groupName)
      : [...currentGroups, groupName];
    updateCourtScheduleRule(courtNumber, { groups });
  }

  function updateScheduleDraft(match: Match, values: Partial<{ roundNumber: number; courtNumber: number }>) {
    setScheduleDrafts((current) => ({
      ...current,
      [match.id]: {
        roundNumber: values.roundNumber ?? current[match.id]?.roundNumber ?? match.round_number ?? 1,
        courtNumber: values.courtNumber ?? current[match.id]?.courtNumber ?? match.court_number ?? 1
      }
    }));
  }

  async function saveMatchSchedule(match: Match) {
    const draft = scheduleDrafts[match.id] ?? {
      roundNumber: match.round_number ?? 1,
      courtNumber: match.court_number ?? 1
    };
    if (match.stage === "group") {
      if (draft.roundNumber !== match.round_number) {
        await moveMatchToRound(match, draft.roundNumber, draft.courtNumber);
        return;
      }
      const roundMatches = selectedTournamentMatches.filter(
        (item) => item.id !== match.id && item.stage === "group" && item.round_number === draft.roundNumber
      );
      const occupiedSlot = roundMatches.find((item) => item.court_number === draft.courtNumber);
      if (occupiedSlot) {
        await swapMatchSlots(match.id, occupiedSlot.id);
        return;
      }
      if (roundMatches.some((item) => [item.team_1_id, item.team_2_id].some((teamId) => teamId === match.team_1_id || teamId === match.team_2_id))) {
        setMessageType("error");
        setMessage(`One of these teams already has another match in Round ${draft.roundNumber}.`);
        return;
      }
    }
    await run(async () => {
      const { data, error } = await supabase!
        .from("matches")
        .update({
          round_number: match.stage === "group" ? draft.roundNumber : null,
          court_number: draft.courtNumber
        })
        .eq("id", match.id)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("The match was not updated. Please sign in again and retry.");
      setScheduleDrafts((current) => {
        const next = { ...current };
        delete next[match.id];
        return next;
      });
    });
  }

  async function moveMatchToRound(match: Match, targetRound: number, preferredCourt: number) {
    const sourceRound = match.round_number;
    if (!sourceRound || sourceRound === targetRound || !matchTournament) return;
    const courtCount = matchTournament.court_count;
    const sourceGroupMatches = selectedTournamentMatches.filter(
      (item) => item.stage === "group" && item.group_name === match.group_name && item.round_number === sourceRound
    );
    const targetGroupMatches = selectedTournamentMatches.filter(
      (item) => item.stage === "group" && item.group_name === match.group_name && item.round_number === targetRound
    );
    const componentMatchIds = new Set<string>([match.id]);
    const componentTeamIds = new Set<string>([match.team_1_id, match.team_2_id]);
    let expanded = true;
    while (expanded) {
      expanded = false;
      [...sourceGroupMatches, ...targetGroupMatches].forEach((item) => {
        if (
          !componentMatchIds.has(item.id) &&
          (componentTeamIds.has(item.team_1_id) || componentTeamIds.has(item.team_2_id))
        ) {
          componentMatchIds.add(item.id);
          componentTeamIds.add(item.team_1_id);
          componentTeamIds.add(item.team_2_id);
          expanded = true;
        }
      });
    }

    const movingFromSource = sourceGroupMatches.filter((item) => componentMatchIds.has(item.id));
    const movingFromTarget = targetGroupMatches.filter((item) => componentMatchIds.has(item.id));
    const sourceRoundMatches = selectedTournamentMatches.filter(
      (item) => item.stage === "group" && item.round_number === sourceRound
    );
    const targetRoundMatches = selectedTournamentMatches.filter(
      (item) => item.stage === "group" && item.round_number === targetRound
    );
    const sourceFinal = [
      ...sourceRoundMatches.filter((item) => !movingFromSource.some((moving) => moving.id === item.id)),
      ...movingFromTarget
    ];
    const targetFinal = [
      ...targetRoundMatches.filter((item) => !movingFromTarget.some((moving) => moving.id === item.id)),
      ...movingFromSource
    ];
    const hasDuplicateTeam = (roundMatches: Match[]) => {
      const teamIds = roundMatches.flatMap((item) => [item.team_1_id, item.team_2_id]);
      return teamIds.length !== new Set(teamIds).size;
    };
    if (hasDuplicateTeam(sourceFinal) || hasDuplicateTeam(targetFinal)) {
      setMessageType("error");
      setMessage("The website could not repair this move without scheduling a team twice. Choose another destination round.");
      return;
    }
    if (sourceFinal.length > courtCount || targetFinal.length > courtCount) {
      setMessageType("error");
      setMessage("This move needs more simultaneous courts than the tournament has. Choose another round or court.");
      return;
    }

    function assignCourts(roundMatches: Match[], preferredMatchId?: string, preferredCourtNumber?: number) {
      const assignments = new Map<string, number>();
      const usedCourts = new Set<number>();
      const orderedMatches = preferredMatchId
        ? [...roundMatches].sort((a, b) => Number(b.id === preferredMatchId) - Number(a.id === preferredMatchId))
        : roundMatches;
      orderedMatches.forEach((item) => {
        const requestedCourt = item.id === preferredMatchId ? preferredCourtNumber : item.court_number;
        const requestedIsAvailable = Boolean(
          requestedCourt &&
          requestedCourt >= 1 &&
          requestedCourt <= courtCount &&
          !usedCourts.has(requestedCourt)
        );
        const courtNumber = requestedIsAvailable
          ? requestedCourt!
          : Array.from({ length: courtCount }, (_, index) => index + 1).find((court) => !usedCourts.has(court));
        if (!courtNumber) throw new Error("No free court is available for the repaired schedule.");
        assignments.set(item.id, courtNumber);
        usedCourts.add(courtNumber);
      });
      return assignments;
    }

    const sourceCourts = assignCourts(sourceFinal);
    const targetCourts = assignCourts(targetFinal, match.id, preferredCourt);
    const desiredSchedule = new Map<string, { roundNumber: number; courtNumber: number }>();
    sourceFinal.forEach((item) => desiredSchedule.set(item.id, { roundNumber: sourceRound, courtNumber: sourceCourts.get(item.id)! }));
    targetFinal.forEach((item) => desiredSchedule.set(item.id, { roundNumber: targetRound, courtNumber: targetCourts.get(item.id)! }));
    const changedMatches = [...sourceRoundMatches, ...targetRoundMatches].filter((item) => {
      const desired = desiredSchedule.get(item.id);
      return desired && (desired.roundNumber !== item.round_number || desired.courtNumber !== item.court_number);
    });
    if (changedMatches.length > 1) {
      const confirmed = window.confirm(
        `Move this match to Round ${targetRound}? The website must adjust ${changedMatches.length - 1} connected matches to prevent duplicate teams. Scores will not change.`
      );
      if (!confirmed) return;
    }

    await run(async () => {
      const updates = await Promise.all(
        changedMatches.map((item) => {
          const desired = desiredSchedule.get(item.id)!;
          return supabase!.from("matches").update({
            round_number: desired.roundNumber,
            court_number: desired.courtNumber
          }).eq("id", item.id).select("id");
        })
      );
      const error = updates.find((result) => result.error)?.error;
      if (error) throw error;
      if (updates.some((result) => !result.data?.length)) {
        throw new Error("Some matches were not updated. Please sign in again and retry.");
      }
      setScheduleDrafts((current) => {
        const next = { ...current };
        delete next[match.id];
        return next;
      });
    }, `Match moved to Round ${targetRound}. ${Math.max(0, changedMatches.length - 1)} connected matches were adjusted to keep every team conflict-free. Refreshing data...`);
  }

  function toggleScheduleMatchSelection(matchId: string) {
    setSelectedScheduleMatchIds((current) =>
      current.includes(matchId) ? current.filter((id) => id !== matchId) : [...current, matchId]
    );
  }

  async function deleteSelectedMatches() {
    if (!selectedScheduleMatchIds.length) return;
    const confirmed = window.confirm(
      `Delete ${selectedScheduleMatchIds.length} selected matches? Any scores entered for them will also be removed from the standings.`
    );
    if (!confirmed) return;
    await run(async () => {
      const { error } = await supabase!.from("matches").delete().in("id", selectedScheduleMatchIds);
      if (error) throw error;
      setSelectedScheduleMatchIds([]);
    });
  }

  async function swapMatchSlots(firstMatchId: string, secondMatchId: string) {
    if (firstMatchId === secondMatchId) return;
    const firstMatch = selectedTournamentMatches.find((match) => match.id === firstMatchId);
    const secondMatch = selectedTournamentMatches.find((match) => match.id === secondMatchId);
    if (!firstMatch || !secondMatch) return;
    if (firstMatch.stage !== "group" || secondMatch.stage !== "group") {
      setMessageType("error");
      setMessage("Only group matches can be swapped on the round schedule.");
      return;
    }
    const excludedIds = new Set([firstMatch.id, secondMatch.id]);
    const causesTeamConflict = (match: Match, targetRound: number | null) =>
      selectedTournamentMatches.some(
        (item) =>
          !excludedIds.has(item.id) &&
          item.stage === "group" &&
          item.round_number === targetRound &&
          [item.team_1_id, item.team_2_id].some((teamId) => teamId === match.team_1_id || teamId === match.team_2_id)
      );
    if (causesTeamConflict(firstMatch, secondMatch.round_number) || causesTeamConflict(secondMatch, firstMatch.round_number)) {
      setMessageType("error");
      setMessage("These two match slots cannot be swapped directly because one team would play twice. Change the selected match's Round dropdown and click Update to let the website repair the connected conflicts automatically.");
      setDraggedMatchId(null);
      return;
    }
    await run(async () => {
      const updates = await Promise.all([
        supabase!.from("matches").update({
          round_number: secondMatch.round_number,
          court_number: secondMatch.court_number
        }).eq("id", firstMatch.id),
        supabase!.from("matches").update({
          round_number: firstMatch.round_number,
          court_number: firstMatch.court_number
        }).eq("id", secondMatch.id)
      ]);
      const error = updates.find((result) => result.error)?.error;
      if (error) throw error;
      setSwapMatchId(null);
      setDraggedMatchId(null);
    });
  }

  function chooseMatchToSwap(matchId: string) {
    if (!swapMatchId) {
      setSwapMatchId(matchId);
      setMessageType("info");
      setMessage("First match selected. Choose Swap on the second match to exchange their round and court.");
      return;
    }
    void swapMatchSlots(swapMatchId, matchId);
  }

  async function swapCompleteRounds() {
    const firstRound = Number(roundSwapFrom);
    const secondRound = Number(roundSwapTo);
    if (!firstRound || !secondRound || firstRound === secondRound) {
      setMessageType("error");
      setMessage("Choose two different rounds to swap.");
      return;
    }
    const firstRoundMatches = selectedTournamentMatches.filter(
      (match) => match.stage === "group" && match.round_number === firstRound
    );
    const secondRoundMatches = selectedTournamentMatches.filter(
      (match) => match.stage === "group" && match.round_number === secondRound
    );
    if (!firstRoundMatches.length || !secondRoundMatches.length) {
      setMessageType("error");
      setMessage("Both selected rounds must contain at least one group match.");
      return;
    }
    const confirmed = window.confirm(
      `Swap every match in Round ${firstRound} with Round ${secondRound}? Court numbers and scores will remain unchanged.`
    );
    if (!confirmed) return;
    await run(async () => {
      const updates = await Promise.all([
        ...firstRoundMatches.map((match) =>
          supabase!.from("matches").update({ round_number: secondRound }).eq("id", match.id).select("id")
        ),
        ...secondRoundMatches.map((match) =>
          supabase!.from("matches").update({ round_number: firstRound }).eq("id", match.id).select("id")
        )
      ]);
      const error = updates.find((result) => result.error)?.error;
      if (error) throw error;
      if (updates.some((result) => !result.data?.length)) {
        throw new Error("Some matches were not updated. Please sign in again and retry.");
      }
      setRoundSwapFrom("");
      setRoundSwapTo("");
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
    const endedDueToTime = form.get("ended_due_to_time") === "true";
    const result = validateScore(
      team1,
      team2,
      targetGames,
      match?.stage ?? "group",
      endedDueToTime,
      selectedResultTournament?.points_scoring_mode ?? "fixed_total"
    );
    const decidingPointWinnerId = emptyToNull(form.get("deciding_point_winner_team_id"));
    if (!match || !result.valid) {
      const isTimedFinishScore =
        Boolean(match) &&
        match?.stage !== "group" &&
        Math.max(team1, team2) === targetGames &&
        Math.min(team1, team2) === targetGames - 1;
      const unit = match?.stage === "group" ? "points" : "games";
      setMessageType("error");
      setMessage(
        match?.stage === "group"
          ? selectedResultTournament?.points_scoring_mode === "race_to"
            ? `One team must reach ${targetGames} points and the other score must be lower.`
            : `The two team scores must total ${targetGames} points. Example: ${Math.ceil(targetGames / 2)}-${Math.floor(targetGames / 2)}.`
          : isTimedFinishScore
            ? `Choose "Closed at ${targetGames} because court time ended" to accept ${team1}-${team2}, or continue the extra game to ${targetGames + 1}.`
          : `Finish at ${targetGames} ${unit}. After ${targetGames - 1}-${targetGames - 1}, continue until one team reaches ${targetGames + 1}.`
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
        ended_due_to_time: match.stage === "group" ? false : endedDueToTime,
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

  async function clearTournamentScores() {
    const tournament = tournaments.find((item) => item.id === resultTournamentId);
    if (!tournament) {
      setMessageType("error");
      setMessage("Select a tournament first.");
      return;
    }

    const confirmed = window.confirm(
      `Reset ${tournament.name}? Group matches will be kept with blank scores. Semifinal, final, and third-place matches will be deleted so they can be created again from fresh standings.`
    );
    if (!confirmed) return;

    await run(async () => {
      const { error: groupMatchError } = await supabase!
        .from("matches")
        .update({
          team_1_games: null,
          team_2_games: null,
          winner_team_id: null,
          deciding_point_winner_team_id: null,
          ended_due_to_time: false,
          submitted_by: null,
          submitted_at: null,
          played_at: null
        })
        .eq("tournament_id", tournament.id)
        .eq("stage", "group");
      if (groupMatchError) throw groupMatchError;

      const { error: knockoutMatchError } = await supabase!
        .from("matches")
        .delete()
        .eq("tournament_id", tournament.id)
        .neq("stage", "group");
      if (knockoutMatchError) throw knockoutMatchError;

      const { error: tournamentError } = await supabase!
        .from("tournaments")
        .update({
          champion_team_id: null,
          runner_up_team_id: null,
          third_place_team_id: null,
          status: tournament.status === "completed" ? "active" : tournament.status,
          end_date: null
        })
        .eq("id", tournament.id);
      if (tournamentError) throw tournamentError;
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
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-ink p-2 shadow-sm">
            <button type="button" className={adminWorkspace === "regular" ? "btn-primary" : "btn-secondary border-transparent bg-white/10 text-white hover:bg-white/20"} onClick={() => { setAdminWorkspace("regular"); window.sessionStorage.setItem("padel_admin_workspace", "regular"); }}>Regular Tournament</button>
            <button type="button" className={adminWorkspace === "americano" ? "btn-primary" : "btn-secondary border-transparent bg-white/10 text-white hover:bg-white/20"} onClick={() => { setAdminWorkspace("americano"); window.sessionStorage.setItem("padel_admin_workspace", "americano"); }}>Americano</button>
          </div>

          <div className={adminWorkspace === "regular" ? "flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm" : "hidden"}>
            {([
              ["accounts", "Accounts"],
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

          <div className={adminWorkspace === "regular" ? "grid gap-5 lg:grid-cols-2" : "hidden"}>
        {adminSection === "accounts" ? <PlayerAccountAdmin /> : null}
        {adminSection === "people" ? (
          <>
        <Panel title="Add player">
          <form onSubmit={addPlayer} className="space-y-3">
            <input className="field" name="name" placeholder="Player name" required />
            <FileField name="photo" label="Player photo" />
            <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" /> Add player</button>
          </form>
        </Panel>

        <Panel title="Update player photo">
          <form onSubmit={updatePlayerPhoto} className="space-y-3">
            <Select name="player_id" label="Player" options={players.map((player) => [player.id, player.name])} />
            <FileField name="photo" label="New player photo" required />
            <button className="btn-primary" disabled={busy}><Upload className="h-4 w-4" /> Update photo</button>
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
            <Select name="points_scoring_mode" label="Group points scoring rule" options={[["race_to", "Race to target (example: 20-19)"], ["fixed_total", "Fixed combined total (example: 12-8 = 20)"]]} />
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
            <form onSubmit={updateTournamentSetup} className="grid gap-2 sm:grid-cols-2">
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
                <NumberField
                  key={`courts-setup-${teamTournamentId}`}
                  name="court_count"
                  label="Number of courts"
                  defaultValue={teamTournament?.court_count ?? 1}
                  max={20}
                />
              </div>
              <div>
                <Select
                  key={`scoring-setup-${teamTournamentId}`}
                  name="points_scoring_mode"
                  label="Group scoring"
                  defaultValue={teamTournament?.points_scoring_mode ?? "fixed_total"}
                  options={[["race_to", "Race to target"], ["fixed_total", "Fixed combined total"]]}
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
              <button className="btn-secondary shrink-0 sm:col-span-2" disabled={busy}>
                <Save className="h-4 w-4" /> Save setup
              </button>
            </form>
            <p className="text-xs font-semibold text-slate-500">
              Changing the number of courts redistributes existing matches evenly across the available courts.
            </p>
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

        <Panel title="Generate group schedule">
          <div className="space-y-4">
            <Select
              name="generator_tournament_id"
              label="Tournament"
              value={matchTournamentId}
              onChange={(value) => {
                setMatchTournamentId(value);
                if (tournaments.find((item) => item.id === value)?.group_count !== 2) setMatchGroup("A");
              }}
              options={tournaments.map((tournament) => [tournament.id, tournament.name])}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {(matchTournament?.group_count === 2 ? ["A", "B"] : ["A"]).map((groupName) => {
                const teamCount = selectedMatchAssignments.filter((entry) => entry.group_name === groupName).length;
                const fixtureCount = teamCount < 2 ? 0 : teamCount * (teamCount - 1) / 2;
                return (
                  <div key={groupName} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Group {groupName}</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{teamCount} teams | {fixtureCount} matches</p>
                  </div>
                );
              })}
            </div>
            <div>
              <p className="field-label">Court schedule rules</p>
              <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
                {activeScheduleRules.map((rule) => {
                  const scheduledCount = generatedGroupSchedule.filter((match) => match.court_number === rule.court_number).length;
                  return (
                    <div key={rule.court_number} className="grid gap-3 border-b border-slate-100 p-3 last:border-b-0 sm:grid-cols-[90px_1fr_1.25fr] sm:items-center">
                      <p className="font-black text-ink">Court {rule.court_number}</p>
                      <label>
                        <span className="mb-1 block text-xs font-black uppercase text-slate-500">Maximum matches</span>
                        <input
                          className="field"
                          type="number"
                          min={1}
                          max={200}
                          value={rule.max_matches}
                          onChange={(event) => updateCourtScheduleRule(rule.court_number, { maxMatches: Math.max(1, Number(event.target.value)) })}
                        />
                      </label>
                      <div>
                        <span className="mb-1 block text-xs font-black uppercase text-slate-500">Allowed groups</span>
                        <div className="flex flex-wrap gap-3">
                          {(matchTournament?.group_count === 2 ? ["A", "B"] as GroupName[] : ["A"] as GroupName[]).map((groupName) => (
                            <label key={`${rule.court_number}-${groupName}`} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={rule.groups.includes(groupName)}
                                onChange={() => toggleCourtGroup(rule.court_number, groupName)}
                              />
                              Group {groupName}
                            </label>
                          ))}
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Planned: {scheduledCount} of {rule.max_matches}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={scheduleGenerationError ? "rounded-md bg-red-50 p-3 text-sm font-bold text-red-700" : "rounded-md bg-limeball/25 p-3 text-sm font-bold text-ink"}>
              {scheduleGenerationError
                ? scheduleGenerationError
                : missingGeneratedMatches.length
                ? `${missingGeneratedMatches.length} missing matches will be added across ${scheduleRoundCount} rounds. Existing scores will not be changed.`
                : groupMatchesMissingRounds.length
                  ? `${groupMatchesMissingRounds.length} existing matches will receive their round numbers.`
                : generatedGroupSchedule.length
                  ? "The complete round-robin schedule already exists."
                  : "Add at least two teams to each group before generating matches."}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => void generateGroupSchedule()}
                disabled={busy || !matchTournament || !generatedGroupSchedule.length || Boolean(scheduleGenerationError)}
              >
                <Sparkles className="h-4 w-4" /> Generate missing matches
              </button>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => void applyCourtPlanToExistingSchedule()}
                disabled={busy || !matchTournament || !generatedGroupSchedule.length || Boolean(scheduleGenerationError)}
              >
                <RotateCcw className="h-4 w-4" /> Apply plan to existing schedule
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Set how many matches each court can hold and which groups may use it. Every team still plays every other team in its own group once.
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
              <div className="grid grid-cols-2 gap-3">
                <Select
                  name="group_name"
                  label="Group"
                  value={matchGroup}
                  onChange={setMatchGroup}
                  options={matchTournament?.group_count === 2 ? [["A", "Group A"], ["B", "Group B"]] : [["A", "Group A"]]}
                />
                <NumberField name="round_number" label="Round" defaultValue={Math.max(1, scheduleRoundCount + 1)} max={200} />
              </div>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">Matches already created</h3>
                <p className="text-xs font-semibold text-slate-500">Drag one group match onto another to swap their round and court.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {swapMatchId ? (
                  <button type="button" className="btn-secondary" onClick={() => setSwapMatchId(null)}>
                    Cancel swap
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-secondary text-red-700"
                  onClick={() => void deleteSelectedMatches()}
                  disabled={busy || !selectedScheduleMatchIds.length}
                >
                  <Trash2 className="h-4 w-4" /> Delete selected ({selectedScheduleMatchIds.length})
                </button>
              </div>
            </div>

            {message ? (
              <div className={messageType === "error" ? "mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700" : messageType === "success" ? "mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-700" : "mt-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700"}>
                {message}
              </div>
            ) : null}

            <div className="mt-3 rounded-md border border-court/20 bg-court/5 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-ink">Swap complete rounds</p>
                  <p className="text-xs font-semibold text-slate-600">Moves every match between two rounds. Courts and saved scores stay unchanged.</p>
                </div>
                <label className="block lg:w-40">
                  <span className="field-label">First round</span>
                  <select className="field" value={roundSwapFrom} onChange={(event) => setRoundSwapFrom(event.target.value)}>
                    <option value="">Choose round</option>
                    {availableScheduleRounds.map((round) => <option key={`swap-from-${round}`} value={String(round)}>Round {round}</option>)}
                  </select>
                </label>
                <ArrowLeftRight className="hidden h-5 w-5 shrink-0 text-court lg:block" />
                <label className="block lg:w-40">
                  <span className="field-label">Second round</span>
                  <select className="field" value={roundSwapTo} onChange={(event) => setRoundSwapTo(event.target.value)}>
                    <option value="">Choose round</option>
                    {availableScheduleRounds.map((round) => <option key={`swap-to-${round}`} value={String(round)}>Round {round}</option>)}
                  </select>
                </label>
                <button type="button" className="btn-primary lg:mb-0.5" onClick={() => void swapCompleteRounds()} disabled={busy || !roundSwapFrom || !roundSwapTo || roundSwapFrom === roundSwapTo}>
                  <ArrowLeftRight className="h-4 w-4" /> Swap rounds
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                <Filter className="h-4 w-4" /> Filter created matches
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <select className="field" value={scheduleRoundFilter} onChange={(event) => setScheduleRoundFilter(event.target.value)}>
                  <option value="all">All rounds</option>
                  {availableScheduleRounds.map((round) => <option key={`filter-round-${round}`} value={String(round)}>Round {round}</option>)}
                  <option value="unscheduled">Unscheduled</option>
                </select>
                <select className="field" value={scheduleGroupFilter} onChange={(event) => setScheduleGroupFilter(event.target.value)}>
                  <option value="all">All groups and stages</option>
                  <option value="A">Group A</option>
                  {matchTournament?.group_count === 2 ? <option value="B">Group B</option> : null}
                </select>
                <select className="field" value={scheduleTeamFilter} onChange={(event) => setScheduleTeamFilter(event.target.value)}>
                  <option value="all">All teams</option>
                  {scheduleFilterTeams.map((team) => <option key={`filter-team-${team.id}`} value={team.id}>{teamLabel(team)}</option>)}
                </select>
                <select className="field" value={scheduleCourtFilter} onChange={(event) => setScheduleCourtFilter(event.target.value)}>
                  <option value="all">All courts</option>
                  {Array.from({ length: matchTournament?.court_count ?? 0 }, (_, index) => <option key={`filter-court-${index + 1}`} value={String(index + 1)}>Court {index + 1}</option>)}
                  <option value="unassigned">Unassigned court</option>
                </select>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={allFilteredScheduleMatchesSelected}
                  onChange={() => setSelectedScheduleMatchIds((current) =>
                    allFilteredScheduleMatchesSelected
                      ? current.filter((id) => !filteredScheduleMatchIds.includes(id))
                      : Array.from(new Set([...current, ...filteredScheduleMatchIds]))
                  )}
                />
                Select all {filteredScheduleMatchIds.length} visible matches
              </label>
            </div>

            <div className="mt-3 space-y-4">
              {scheduleMatchesByRound.length ? scheduleMatchesByRound.map(([round, roundMatches]) => (
                <section key={round} className="overflow-hidden rounded-md border border-slate-200">
                  <div className="flex items-center justify-between bg-ink px-3 py-2 text-white">
                    <h4 className="font-black">{round === "Knockout matches" ? round : round === "Unscheduled" ? "Round not assigned" : `Round ${round}`}</h4>
                    <span className="text-xs font-bold text-slate-200">{roundMatches.length} {roundMatches.length === 1 ? "match" : "matches"}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {roundMatches.map((match) => {
                      const draft = scheduleDrafts[match.id] ?? {
                        roundNumber: match.round_number ?? 1,
                        courtNumber: match.court_number ?? 1
                      };
                      const isSwapSelected = swapMatchId === match.id;
                      return (
                        <div
                          key={match.id}
                          className={isSwapSelected ? "bg-limeball/20 p-3 text-sm" : "bg-white p-3 text-sm"}
                          draggable={match.stage === "group"}
                          onDragStart={() => setDraggedMatchId(match.id)}
                          onDragEnd={() => setDraggedMatchId(null)}
                          onDragOver={(event) => {
                            if (match.stage === "group") event.preventDefault();
                          }}
                          onDrop={() => {
                            if (draggedMatchId && match.stage === "group") void swapMatchSlots(draggedMatchId, match.id);
                          }}
                        >
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex min-w-0 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedScheduleMatchIds.includes(match.id)}
                                onChange={() => toggleScheduleMatchSelection(match.id)}
                                aria-label={`Select ${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)}`}
                              />
                              {match.stage === "group" ? <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-slate-400" /> : null}
                              <div className="min-w-0">
                                <p className="truncate font-black text-slate-950">{teamLabel(match.team_1)} vs {teamLabel(match.team_2)}</p>
                                <p className="text-xs font-bold uppercase text-slate-500">
                                  {match.stage.replace("_", " ")}{match.group_name ? ` | Group ${match.group_name}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {match.stage === "group" ? (
                                <label className="flex items-center gap-1 text-xs font-black text-slate-600">
                                  Round
                                  <select
                                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-black text-slate-800"
                                    value={draft.roundNumber}
                                    onChange={(event) => updateScheduleDraft(match, { roundNumber: Number(event.target.value) })}
                                    disabled={busy}
                                  >
                                    {Array.from({ length: Math.max(scheduleRoundCount + 5, match.round_number ?? 1) }, (_, index) => (
                                      <option key={`${match.id}-round-${index + 1}`} value={index + 1}>{index + 1}</option>
                                    ))}
                                  </select>
                                </label>
                              ) : null}
                              <label className="flex items-center gap-1 text-xs font-black text-court">
                                Court
                                <select
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-black text-slate-800"
                                  value={draft.courtNumber}
                                  onChange={(event) => updateScheduleDraft(match, { courtNumber: Number(event.target.value) })}
                                  disabled={busy}
                                >
                                  {Array.from({ length: matchTournament?.court_count ?? 1 }, (_, index) => (
                                    <option key={`${match.id}-court-${index + 1}`} value={index + 1}>{index + 1}</option>
                                  ))}
                                </select>
                              </label>
                              <button type="button" className="btn-primary px-3 py-2" onClick={() => void saveMatchSchedule(match)} disabled={busy || !scheduleDrafts[match.id]}>
                                <Save className="h-4 w-4" /> Update
                              </button>
                              {match.stage === "group" ? (
                                <button type="button" className="btn-secondary px-3 py-2" onClick={() => chooseMatchToSwap(match.id)} disabled={busy}>
                                  <ArrowLeftRight className="h-4 w-4" /> {isSwapSelected ? "Selected" : "Swap"}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="grid h-9 w-9 place-items-center rounded-md text-red-600 transition hover:bg-red-50"
                                onClick={() => void deleteMatch(match)}
                                disabled={busy}
                                title="Delete match"
                                aria-label={`Delete ${teamLabel(match.team_1)} vs ${teamLabel(match.team_2)}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )) : (
                <p className="rounded-md border border-slate-200 p-3 text-sm font-semibold text-slate-500">No matches found for the selected filters.</p>
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
                  setResultTeamFilterId("all");
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
              name="result_team_filter"
              label="Filter matches by team"
              value={resultTeamFilterId}
              onChange={(value) => {
                setResultTeamFilterId(value);
                setSelectedResultMatchId("");
              }}
              options={[
                ["all", "All teams"],
                ...resultTeamOptions.map((team) => [team.id, teamLabel(team)] as [string, string])
              ]}
            />
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
                  ? selectedResultTournament?.points_scoring_mode === "race_to"
                    ? `Race to ${selectedResultTarget}: one team must finish on ${selectedResultTarget}.`
                    : `The two team scores must total ${selectedResultTarget} points.`
                  : `First to ${selectedResultTarget}. After ${selectedResultTarget - 1}-${selectedResultTarget - 1}, play to ${selectedResultTarget + 1}; a ${selectedResultTarget}-${selectedResultTarget - 1} finish must be marked as ended due to court time.`}
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
            ) : selectedResultMatch ? (
              <Select
                key={`match-ending-${selectedResultMatch.id}`}
                name="ended_due_to_time"
                label="Match ending"
                options={[
                  ["false", `Normal result (after ${selectedResultTarget - 1}-${selectedResultTarget - 1}, continue to ${selectedResultTarget + 1})`],
                  ["true", `Closed at ${selectedResultTarget}-${selectedResultTarget - 1} because court time ended`]
                ]}
              />
            ) : null}
            <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> Save result</button>
          </form>
        </Panel>

        <Panel title="Testing reset">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              Reset test results for <span className="font-black text-slate-950">
                {tournaments.find((item) => item.id === resultTournamentId)?.name ?? "the selected tournament"}
              </span>.
              Group matches stay scheduled with blank scores. Semifinal, final, and third-place matches are removed so you can generate them again from fresh standings.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void clearTournamentScores()}
              disabled={busy || !resultTournamentId}
            >
              <RotateCcw className="h-4 w-4" /> Reset tournament results
            </button>
          </div>
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
          {adminWorkspace === "americano" ? (
            <AmericanoAdminPanel
              players={players}
              teams={teams}
              tournaments={allTournaments}
              tournamentPlayers={tournamentPlayers}
              tournamentTeams={tournamentTeams}
              matches={americanoMatches}
              courtStreams={courtStreams}
            />
          ) : null}
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
  return value === "accounts" || value === "people" || value === "tournament" || value === "schedule" || value === "results";
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

function FileField({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500"><Upload className="h-3.5 w-3.5" /> {label}</span>
      <input className="field" name={name} type="file" accept="image/*" required={required} />
    </label>
  );
}

function emptyToNull(value: FormDataEntryValue | null) {
  return value ? String(value) : null;
}
