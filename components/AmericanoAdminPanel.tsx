"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Check, RefreshCcw, Save, Sparkles, Trash2, Youtube } from "lucide-react";
import { FRIEND_CIRCLES } from "@/lib/friend-circles";
import { generateSinglesAmericanoSchedule, generateTeamAmericanoSchedule } from "@/lib/americano-schedule";
import { supabase } from "@/lib/supabase";
import { teamLabel } from "@/lib/format";
import type { AmericanoMatch, CourtStream, Player, Team, Tournament, TournamentPlayer, TournamentTeam } from "@/lib/types";

type Section = "create" | "schedule" | "manage";

type Props = {
  players: Player[];
  teams: Team[];
  tournaments: Tournament[];
  tournamentPlayers: TournamentPlayer[];
  tournamentTeams: TournamentTeam[];
  matches: AmericanoMatch[];
  courtStreams: CourtStream[];
};

export function AmericanoAdminPanel({
  players,
  teams,
  tournaments,
  tournamentPlayers,
  tournamentTeams,
  matches,
  courtStreams
}: Props) {
  const americanoTournaments = tournaments.filter((item) => item.tournament_format !== "regular");
  const [section, setSection] = useState<Section>("create");
  const [tournamentId, setTournamentId] = useState(americanoTournaments.find((item) => item.status === "active")?.id ?? americanoTournaments[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resultMatchId, setResultMatchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedTournament = americanoTournaments.find((item) => item.id === tournamentId);
  const selectedMatches = useMemo(
    () => matches.filter((match) => match.tournament_id === tournamentId).sort((a, b) => a.round_number - b.round_number || (a.court_number ?? 0) - (b.court_number ?? 0)),
    [matches, tournamentId]
  );
  const selectedPlayerAssignments = tournamentPlayers.filter((item) => item.tournament_id === tournamentId);
  const selectedTeamAssignments = tournamentTeams.filter((item) => item.tournament_id === tournamentId);
  const isSingles = selectedTournament?.tournament_format === "singles_americano";

  async function run(action: () => Promise<void>, success: string) {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
      window.sessionStorage.setItem("padel_admin_workspace", "americano");
      setMessage(success);
      setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const cover = form.get("cover") as File;
      let coverImageUrl: string | null = null;
      if (cover?.size) {
        const path = `${crypto.randomUUID()}-${cover.name}`;
        const { error: uploadError } = await supabase!.storage.from("tournament-photos").upload(path, cover);
        if (uploadError) throw uploadError;
        coverImageUrl = supabase!.storage.from("tournament-photos").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase!.from("tournaments").insert({
        name: String(form.get("name")),
        tournament_format: String(form.get("tournament_format")),
        friend_circle: String(form.get("friend_circle")),
        court_count: Number(form.get("court_count")),
        americano_target_points: Number(form.get("target_points")),
        americano_round_count: Number(form.get("round_count")),
        group_count: 1,
        group_target_points: 15,
        semifinal_target_games: 6,
        final_target_games: 6,
        third_place_target_games: 6,
        status: String(form.get("status")),
        start_date: String(form.get("start_date")),
        cover_image_url: coverImageUrl
      });
      if (error) throw error;
    }, "Americano tournament created.");
  }

  function toggleParticipant(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function generateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTournament) return;
    const form = new FormData(event.currentTarget);
    const minimum = isSingles ? 4 : 2;
    if (selectedIds.length < minimum) {
      setMessage(`Select at least ${minimum} ${isSingles ? "players" : "teams"}.`);
      return;
    }
    if (selectedMatches.length && !window.confirm("Replace the existing Americano schedule and clear its scores?")) return;

    await run(async () => {
      const { error: deleteMatchError } = await supabase!.from("americano_matches").delete().eq("tournament_id", tournamentId);
      if (deleteMatchError) throw deleteMatchError;
      const { error: deletePlayerError } = await supabase!.from("tournament_players").delete().eq("tournament_id", tournamentId);
      if (deletePlayerError) throw deletePlayerError;
      const { error: deleteTeamError } = await supabase!.from("tournament_teams").delete().eq("tournament_id", tournamentId);
      if (deleteTeamError) throw deleteTeamError;

      if (isSingles) {
        const roundCount = Number(form.get("round_count"));
        const schedule = generateSinglesAmericanoSchedule(selectedIds, selectedTournament.court_count, roundCount);
        const { error: participantError } = await supabase!.from("tournament_players").insert(
          selectedIds.map((playerId) => ({ tournament_id: tournamentId, player_id: playerId }))
        );
        if (participantError) throw participantError;
        const { error: tournamentError } = await supabase!.from("tournaments").update({ americano_round_count: roundCount }).eq("id", tournamentId);
        if (tournamentError) throw tournamentError;
        const { error: scheduleError } = await supabase!.from("americano_matches").insert(
          schedule.map((match) => ({ ...match, tournament_id: tournamentId }))
        );
        if (scheduleError) throw scheduleError;
      } else {
        const schedule = generateTeamAmericanoSchedule(selectedIds, selectedTournament.court_count);
        const roundCount = Math.max(...schedule.map((match) => match.round_number));
        const { error: participantError } = await supabase!.from("tournament_teams").insert(
          selectedIds.map((teamId) => ({ tournament_id: tournamentId, team_id: teamId, group_name: "A" }))
        );
        if (participantError) throw participantError;
        const { error: tournamentError } = await supabase!.from("tournaments").update({ americano_round_count: roundCount }).eq("id", tournamentId);
        if (tournamentError) throw tournamentError;
        const { error: scheduleError } = await supabase!.from("americano_matches").insert(
          schedule.map((match) => ({ ...match, tournament_id: tournamentId }))
        );
        if (scheduleError) throw scheduleError;
      }
    }, "Participants saved and the complete schedule was generated.");
  }

  async function updateTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const status = String(form.get("status"));
      const { error } = await supabase!.from("tournaments").update({
        status,
        americano_target_points: Number(form.get("target_points")),
        end_date: status === "completed" ? new Date().toISOString().slice(0, 10) : null
      }).eq("id", tournamentId);
      if (error) throw error;
    }, "Americano settings updated.");
  }

  async function saveStreams(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTournament) return;
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const rows = Array.from({ length: selectedTournament.court_count }, (_, index) => ({
        tournament_id: tournamentId,
        court_number: index + 1,
        youtube_url: String(form.get(`court_${index + 1}`) ?? "").trim()
      }));
      const links = rows.filter((row) => row.youtube_url);
      if (links.length) {
        const { error } = await supabase!.from("tournament_court_streams").upsert(links, { onConflict: "tournament_id,court_number" });
        if (error) throw error;
      }
      const emptyCourts = rows.filter((row) => !row.youtube_url).map((row) => row.court_number);
      if (emptyCourts.length) {
        const { error } = await supabase!.from("tournament_court_streams").delete().eq("tournament_id", tournamentId).in("court_number", emptyCourts);
        if (error) throw error;
      }
    }, "Court links saved.");
  }

  async function resetScores() {
    if (!selectedTournament || !window.confirm(`Clear every score in ${selectedTournament.name}? The schedule will stay.`)) return;
    await run(async () => {
      const { error } = await supabase!.from("americano_matches").update({
        side_1_points: null,
        side_2_points: null,
        winner_side: null,
        submitted_at: null,
        played_at: null
      }).eq("tournament_id", tournamentId);
      if (error) throw error;
    }, "All Americano scores were cleared; the schedule was kept.");
  }

  async function correctScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTournament) return;
    const form = new FormData(event.currentTarget);
    const side1 = Number(form.get("side_1_points"));
    const side2 = Number(form.get("side_2_points"));
    if (!Number.isInteger(side1) || !Number.isInteger(side2) || side1 < 0 || side2 < 0 || side1 + side2 !== selectedTournament.americano_target_points) {
      setMessage(`The two scores must be whole numbers totalling ${selectedTournament.americano_target_points}.`);
      return;
    }
    const matchId = resultMatchId || selectedMatches[0]?.id;
    if (!matchId) return;
    await run(async () => {
      const { error } = await supabase!.from("americano_matches").update({
        side_1_points: side1,
        side_2_points: side2,
        winner_side: side1 === side2 ? null : side1 > side2 ? 1 : 2,
        submitted_at: new Date().toISOString(),
        played_at: new Date().toISOString()
      }).eq("id", matchId);
      if (error) throw error;
    }, "Americano result corrected.");
  }

  async function clearOneScore() {
    const matchId = resultMatchId || selectedMatches[0]?.id;
    if (!matchId) return;
    await run(async () => {
      const { error } = await supabase!.from("americano_matches").update({ side_1_points: null, side_2_points: null, winner_side: null, submitted_at: null, played_at: null }).eq("id", matchId);
      if (error) throw error;
    }, "That match score was cleared.");
  }

  async function deleteSchedule() {
    if (!selectedTournament || !window.confirm(`Delete the complete schedule for ${selectedTournament.name}?`)) return;
    await run(async () => {
      const { error } = await supabase!.from("americano_matches").delete().eq("tournament_id", tournamentId);
      if (error) throw error;
    }, "Americano schedule deleted.");
  }

  const participantOptions = isSingles ? players : teams;
  const assignedCount = isSingles ? selectedPlayerAssignments.length : selectedTeamAssignments.length;
  const assignedIds = isSingles ? selectedPlayerAssignments.map((item) => item.player_id) : selectedTeamAssignments.map((item) => item.team_id);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {([[
          "create", "Create event", CalendarPlus
        ], [
          "schedule", "Participants & schedule", Sparkles
        ], [
          "manage", "Manage event", Save
        ]] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" className={section === value ? "btn-primary whitespace-nowrap" : "btn-secondary whitespace-nowrap"} onClick={() => setSection(value)}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {message ? <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800">{message}</p> : null}

      {section === "create" ? (
        <section className="sport-card mx-auto max-w-2xl p-4">
          <h2 className="mb-4 text-lg font-black">Create Americano tournament</h2>
          <form onSubmit={createTournament} className="space-y-3">
            <input className="field" name="name" placeholder="Tournament name" required />
            <FieldSelect name="tournament_format" label="Americano format" options={[["singles_americano", "Singles Americano (rotating partners)"], ["team_americano", "Team Americano (fixed teams)"]]} />
            <FieldSelect name="friend_circle" label="Tournament category" options={FRIEND_CIRCLES.filter((item) => item.value !== "overall").map((item) => [item.value, item.label] as [string, string])} />
            <div className="grid grid-cols-2 gap-3">
              <NumberInput name="court_count" label="Courts" value={4} max={20} />
              <NumberInput name="target_points" label="Total points per match" value={24} max={100} />
              <NumberInput name="round_count" label="Singles rounds" value={5} max={50} />
              <label><span className="field-label">Start date</span><input className="field" name="start_date" type="date" required /></label>
            </div>
            <FieldSelect name="status" label="Status" options={[["upcoming", "Upcoming"], ["active", "Active"]]} />
            <label><span className="field-label">Cover image</span><input className="field" name="cover" type="file" accept="image/*" /></label>
            <button className="btn-primary" disabled={busy}><CalendarPlus className="h-4 w-4" /> Create Americano event</button>
          </form>
        </section>
      ) : null}

      {section !== "create" ? (
        <label className="sport-card block p-3">
          <span className="field-label">Americano tournament</span>
          <select className="field" value={tournamentId} onChange={(event) => { setTournamentId(event.target.value); setSelectedIds([]); }}>
            {americanoTournaments.map((item) => <option key={item.id} value={item.id}>{item.name} | {item.tournament_format === "singles_americano" ? "Singles" : "Teams"}</option>)}
          </select>
          {!americanoTournaments.length ? <p className="mt-2 text-sm font-bold text-amber-700">Create an Americano tournament first.</p> : null}
        </label>
      ) : null}

      {section === "schedule" && selectedTournament ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="sport-card p-4">
            <h2 className="text-lg font-black">Select {isSingles ? "players" : "teams"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{assignedCount} currently assigned | {selectedMatches.length} matches currently scheduled</p>
            <div className="mt-3 max-h-[28rem] divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
              {participantOptions.map((participant) => {
                const label = isSingles ? (participant as Player).name : teamLabel(participant as Team);
                return <label key={participant.id} className="flex cursor-pointer items-center gap-3 bg-white p-3 hover:bg-slate-50"><input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={selectedIds.includes(participant.id)} onChange={() => toggleParticipant(participant.id)} /><span className="min-w-0 truncate font-bold">{label}</span></label>;
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSelectedIds(participantOptions.map((item) => item.id))}>Select all</button>
              {assignedIds.length ? <button type="button" className="btn-secondary" onClick={() => setSelectedIds(assignedIds)}>Use currently assigned</button> : null}
              <button type="button" className="btn-secondary" onClick={() => setSelectedIds([])}>Clear</button>
            </div>
          </section>
          <section className="sport-card p-4">
            <h2 className="text-lg font-black">Generate the schedule</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">{isSingles ? "Partners rotate automatically while repeat partnerships are minimized." : "Every team plays every other team once."} Courts and rounds are assigned automatically.</p>
            <form onSubmit={generateSchedule} className="mt-4 space-y-3">
              {isSingles ? <NumberInput name="round_count" label="Number of rounds" value={selectedTournament.americano_round_count} max={50} /> : null}
              <div className="rounded-md bg-limeball/25 p-3 text-sm font-black text-ink">Selected: {selectedIds.length} | Courts: {selectedTournament.court_count}</div>
              <button className="btn-primary w-full" disabled={busy}><Sparkles className="h-4 w-4" /> {selectedMatches.length ? "Regenerate complete schedule" : "Generate complete schedule"}</button>
            </form>
            {selectedMatches.length ? <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-sm font-black">Schedule preview</p><div className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs font-semibold text-slate-600">{selectedMatches.map((match) => <p key={match.id} className="rounded bg-slate-50 px-2 py-1.5">Round {match.round_number} | Court {match.court_number ?? "TBD"}</p>)}</div></div> : null}
          </section>
        </div>
      ) : null}

      {section === "manage" && selectedTournament ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="sport-card p-4">
            <h2 className="mb-4 text-lg font-black">Event status and scoring</h2>
            <form key={`settings-${tournamentId}`} onSubmit={updateTournament} className="space-y-3">
              <FieldSelect name="status" label="Status" defaultValue={selectedTournament.status} options={[["upcoming", "Upcoming"], ["active", "Active"], ["completed", "Completed"]]} />
              <NumberInput name="target_points" label="Total points per match" value={selectedTournament.americano_target_points} max={100} />
              <button className="btn-primary" disabled={busy}><Check className="h-4 w-4" /> Save settings</button>
            </form>
            <div className="mt-5 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
              <button type="button" className="btn-secondary" onClick={() => void resetScores()} disabled={busy || !selectedMatches.length}><RefreshCcw className="h-4 w-4" /> Clear scores only</button>
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 font-black text-white disabled:opacity-50" onClick={() => void deleteSchedule()} disabled={busy || !selectedMatches.length}><Trash2 className="h-4 w-4" /> Delete schedule</button>
            </div>
          </section>
          <section className="sport-card p-4">
            <h2 className="mb-4 text-lg font-black">Court YouTube streams</h2>
            <form key={`streams-${tournamentId}`} onSubmit={saveStreams} className="space-y-3">
              {Array.from({ length: selectedTournament.court_count }, (_, index) => {
                const court = index + 1;
                const url = courtStreams.find((item) => item.tournament_id === tournamentId && item.court_number === court)?.youtube_url ?? "";
                return <label key={court}><span className="field-label flex items-center gap-1"><Youtube className="h-3.5 w-3.5 text-red-600" /> Court {court}</span><input className="field" name={`court_${court}`} type="url" defaultValue={url} placeholder="Paste YouTube link" /></label>;
              })}
              <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> Save court links</button>
            </form>
          </section>
          <section className="sport-card p-4 lg:col-span-2">
            <h2 className="mb-4 text-lg font-black">Correct one match result</h2>
            {selectedMatches.length ? (
              <form onSubmit={correctScore} className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_120px_120px_auto] md:items-end">
                <label><span className="field-label">Match</span><select className="field" value={resultMatchId || selectedMatches[0].id} onChange={(event) => setResultMatchId(event.target.value)}>{selectedMatches.map((match) => <option key={match.id} value={match.id}>Round {match.round_number} | Court {match.court_number ?? "TBD"} | {americanoMatchLabel(match, isSingles)}</option>)}</select></label>
                <label><span className="field-label">Side 1</span><input className="field" name="side_1_points" type="number" min={0} max={selectedTournament.americano_target_points} required /></label>
                <label><span className="field-label">Side 2</span><input className="field" name="side_2_points" type="number" min={0} max={selectedTournament.americano_target_points} required /></label>
                <div className="flex gap-2"><button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> Save</button><button type="button" className="btn-secondary" onClick={() => void clearOneScore()} disabled={busy}><RefreshCcw className="h-4 w-4" /> Clear</button></div>
              </form>
            ) : <p className="text-sm font-semibold text-slate-500">Generate the schedule before entering results.</p>}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function FieldSelect({ name, label, options, defaultValue }: { name: string; label: string; options: readonly (readonly [string, string])[]; defaultValue?: string }) {
  return <label className="block"><span className="field-label">{label}</span><select className="field" name={name} defaultValue={defaultValue}>{options.map(([value, text]) => <option key={`${name}-${value}`} value={value}>{text}</option>)}</select></label>;
}

function NumberInput({ name, label, value, max }: { name: string; label: string; value: number; max: number }) {
  return <label className="block"><span className="field-label">{label}</span><input className="field" name={name} type="number" min={1} max={max} defaultValue={value} required /></label>;
}

function americanoMatchLabel(match: AmericanoMatch, isSingles: boolean) {
  if (!isSingles) return `${teamLabel(match.side_1_team)} vs ${teamLabel(match.side_2_team)}`;
  const side1 = `${match.side_1_player_1?.name ?? "Player"} / ${match.side_1_player_2?.name ?? "Player"}`;
  const side2 = `${match.side_2_player_1?.name ?? "Player"} / ${match.side_2_player_2?.name ?? "Player"}`;
  return `${side1} vs ${side2}`;
}
