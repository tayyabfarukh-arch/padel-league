"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Camera, Check, CheckCircle2, ChevronDown, KeyRound, LogIn, LogOut, Mail, Search, ShieldCheck, UserPlus } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import { StatsGrid } from "@/components/StatsGrid";
import { calculatePlayerStats } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import type { AppUser, Match, Player, PlayerClaim, PlayerStats, Team, Tournament } from "@/lib/types";

export function AccountPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<AppUser | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [claim, setClaim] = useState<PlayerClaim | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [mode, setMode] = useState<"signin" | "signup" | "recover">("signin");
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);
  const [claimPickerOpen, setClaimPickerOpen] = useState(false);
  const [claimSearch, setClaimSearch] = useState("");
  const [selectedClaimPlayerId, setSelectedClaimPlayerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAccount = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setAccount(null);
    setPlayer(null);
    setStats(null);
    setClaim(null);
    if (!supabase || !nextSession) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userId = nextSession.user.id;
    const [{ data: accountData }, { data: playerData }, { data: claimData }, { data: playersData }] = await Promise.all([
      supabase.from("app_users").select("*").eq("id", userId).maybeSingle(),
      supabase.from("players").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("player_claims").select("*, player:players(*)").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("players").select("*").is("user_id", null).order("name")
    ]);
    setAccount((accountData as AppUser | null) ?? null);
    setPlayer((playerData as Player | null) ?? null);
    setClaim((claimData as PlayerClaim | null) ?? null);
    setAvailablePlayers((playersData as Player[] | null) ?? []);
    if (playerData) {
      const teamSelect = "*, player_1:players!teams_player_1_id_fkey(*), player_2:players!teams_player_2_id_fkey(*)";
      const [{ data: allPlayers }, { data: allTeams }, { data: allMatches }, { data: allTournaments }] = await Promise.all([
        supabase.from("players").select("*").order("name"),
        supabase.from("teams").select(teamSelect),
        supabase.from("matches").select("*"),
        supabase.from("tournaments").select("*")
      ]);
      const calculated = calculatePlayerStats(
        (allPlayers as Player[] | null) ?? [],
        (allTeams as Team[] | null) ?? [],
        (allMatches as Match[] | null) ?? [],
        (allTournaments as Tournament[] | null) ?? []
      ).find((item) => item.player.id === playerData.id) ?? null;
      setStats(calculated);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (new URLSearchParams(window.location.search).get("recovery") === "1") {
      setPasswordRecoveryActive(true);
    }
    supabase.auth.getSession().then(({ data }) => void loadAccount(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecoveryActive(true);
      void loadAccount(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadAccount]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? "")
    });
    setBusy(false);
    if (signInError) setError(signInError.message);
    else setMessage("Signed in successfully.");
  }

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError("");
    setMessage("");

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setError("Username must be 3 to 24 letters, numbers, or underscores.");
      setBusy(false);
      return;
    }

    const { data: duplicate } = await supabase.from("app_users").select("id").eq("username", username).maybeSingle();
    if (duplicate) {
      setError("That username is already in use. Please choose another one.");
      setBusy(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setMessage("Account created. Open the confirmation email from Supabase, then return here and sign in.");
      setMode("signin");
    } else {
      setMessage("Account created. Now claim your existing profile or create a new player profile below.");
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setBusy(true);
    setError("");
    setMessage("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account?recovery=1`
    });
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setMessage("If an account exists for that email, Supabase has sent a password-reset link. Please check the inbox and spam folder.");
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    setError("");
    setMessage("");
    if (password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError(updateError.message);
    else {
      setPasswordRecoveryActive(false);
      window.history.replaceState({}, "", window.location.pathname);
      setMessage("Your password has been changed successfully.");
    }
  }

  async function requestClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;
    if (!selectedClaimPlayerId) {
      setError("Please select your player profile first.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: claimError } = await supabase.from("player_claims").insert({
      user_id: session.user.id,
      player_id: selectedClaimPlayerId
    });
    setBusy(false);
    if (claimError) setError(claimError.message);
    else {
      setMessage("Claim requested. The Admin will approve it from the Admin panel.");
      await loadAccount(session);
    }
  }

  async function createNewProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const photo = form.get("photo") as File | null;
    setBusy(true);
    setError("");
    setMessage("");
    let photoUrl: string | null = null;

    if (photo?.size) {
      const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("player-photos").upload(path, photo);
      if (uploadError) {
        setError(uploadError.message);
        setBusy(false);
        return;
      }
      photoUrl = supabase.storage.from("player-photos").getPublicUrl(path).data.publicUrl;
    }

    const { error: createError } = await supabase.rpc("create_new_player_profile", {
      p_name: name,
      p_photo_url: photoUrl
    });
    setBusy(false);
    if (createError) setError(createError.message);
    else {
      setMessage("Your new player profile is ready. You can now register a tournament team.");
      await loadAccount(session);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !player) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const photo = form.get("photo") as File | null;
    setBusy(true);
    setError("");
    setMessage("");
    let photoUrl = player.photo_url;

    if (photo?.size) {
      const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("player-photos").upload(path, photo);
      if (uploadError) {
        setError(uploadError.message);
        setBusy(false);
        return;
      }
      photoUrl = supabase.storage.from("player-photos").getPublicUrl(path).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("players")
      .update({ name, photo_url: photoUrl })
      .eq("id", player.id)
      .eq("user_id", session.user.id);
    setBusy(false);
    if (updateError) setError(updateError.message);
    else {
      setMessage("Your profile has been updated.");
      await loadAccount(session);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMessage("You are signed out.");
  }

  if (loading) return <p className="sport-card p-5 text-sm font-bold text-slate-600">Loading your account...</p>;

  const selectedClaimPlayer = availablePlayers.find((item) => item.id === selectedClaimPlayerId);
  const filteredClaimPlayers = availablePlayers.filter((item) =>
    item.name.toLowerCase().includes(claimSearch.trim().toLowerCase())
  );

  if (passwordRecoveryActive && session) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <form onSubmit={updatePassword} className="sport-card space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-emerald-50 text-court"><KeyRound className="h-5 w-5" /></span>
            <div><p className="text-xs font-black uppercase text-court">Password recovery</p><h2 className="text-xl font-black text-slate-950">Choose a new password</h2></div>
          </div>
          <label className="block"><span className="field-label">New password</span><input className="field" name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
          <label className="block"><span className="field-label">Confirm new password</span><input className="field" name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></label>
          <button className="btn-primary w-full" disabled={busy}><KeyRound className="h-4 w-4" /> {busy ? "Updating..." : "Set new password"}</button>
        </form>
        <Status message={message} error={error} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-ink p-2">
          <button className={mode === "signin" ? "btn-primary" : "btn-secondary border-transparent bg-white/10 text-white"} onClick={() => setMode("signin")}>Sign in</button>
          <button className={mode === "signup" ? "btn-primary" : "btn-secondary border-transparent bg-white/10 text-white"} onClick={() => setMode("signup")}>Create account</button>
        </div>
        <form onSubmit={mode === "signin" ? signIn : mode === "signup" ? signUp : requestPasswordReset} className="sport-card space-y-4 p-5">
          <h2 className="text-xl font-black text-slate-950">{mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your player account" : "Recover your password"}</h2>
          {mode === "recover" ? <p className="text-sm font-semibold text-slate-600">Enter the email used for your account. Supabase will send you a secure link for choosing a new password.</p> : null}
          {mode === "signup" ? <label className="block"><span className="field-label">Username</span><input className="field" name="username" autoCapitalize="none" placeholder="example: tayyab_farukh" required /></label> : null}
          <label className="block"><span className="field-label">Email</span><input className="field" name="email" type="email" autoComplete="email" required /></label>
          {mode !== "recover" ? <label className="block"><span className="field-label">Password</span><input className="field" name="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /></label> : null}
          <button className="btn-primary w-full" disabled={busy}>{mode === "signin" ? <LogIn className="h-4 w-4" /> : mode === "signup" ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />}{busy ? "Please wait..." : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</button>
          {mode === "signin" ? <button type="button" className="w-full text-center text-sm font-black text-court hover:underline" onClick={() => { setMode("recover"); setError(""); setMessage(""); }}>Forgot password?</button> : null}
          {mode === "recover" ? <button type="button" className="btn-secondary w-full" onClick={() => { setMode("signin"); setError(""); setMessage(""); }}><LogIn className="h-4 w-4" /> Back to sign in</button> : null}
        </form>
        <Status message={message} error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="sport-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-court">Signed in</p>
          <p className="font-black text-slate-950">@{account?.username ?? "player"}</p>
          <p className="text-sm text-slate-500">{session.user.email}</p>
        </div>
        <button className="btn-secondary" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</button>
      </section>
      <Status message={message} error={error} />

      {player ? (
        <div className="space-y-5">
          <form onSubmit={updateProfile} className="sport-card space-y-4 p-5">
            <div className="flex items-center gap-4">
              <PlayerAvatar player={player} size={72} />
              <div><p className="text-xs font-black uppercase text-court">Linked player profile</p><h2 className="text-xl font-black text-slate-950">{player.name}</h2></div>
            </div>
            <label className="block"><span className="field-label">Player name</span><input className="field" name="name" defaultValue={player.name} required /></label>
            <label className="block"><span className="field-label">New profile picture</span><input className="field" name="photo" type="file" accept="image/*" /></label>
            <button className="btn-primary" disabled={busy}><Camera className="h-4 w-4" /> Save profile</button>
          </form>

          {stats ? (
            <section className="space-y-4">
              <div>
                <h2 className="section-title mb-1">Career statistics</h2>
                <p className="text-sm font-semibold text-slate-500">These are linked to your existing player history and update after match results are submitted.</p>
              </div>
              <StatsGrid stats={stats} />
              <div className="grid gap-3 md:grid-cols-3">
                <PartnerSummary label="Best partner" value={stats.bestPartner?.name} />
                <PartnerSummary label="Most played partner" value={stats.mostPlayedPartner?.name} />
                <PartnerSummary label="Most successful partner" value={stats.mostSuccessfulPartner?.name} />
              </div>
            </section>
          ) : (
            <p className="sport-card p-4 text-sm font-semibold text-slate-500">No completed match statistics are available for this player yet.</p>
          )}
        </div>
      ) : claim?.status === "pending" ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 font-black text-amber-950"><ShieldCheck className="h-5 w-5" /> Waiting for Admin approval</p>
          <p className="mt-1 text-sm text-amber-800">You requested the profile <strong>{claim.player?.name}</strong>. Once approved, your history and statistics will appear here.</p>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={requestClaim} className="sport-card space-y-4 p-5">
          <div><p className="text-xs font-black uppercase text-court">Already played here</p><h2 className="mt-1 text-xl font-black text-slate-950">Claim your existing player</h2><p className="mt-1 text-sm text-slate-600">Choose your existing profile to keep its matches and statistics. Admin approval protects that history.</p></div>
          <div className="block">
            <span className="field-label">Your player profile</span>
            <button
              type="button"
              className="field flex items-center gap-3 text-left"
              aria-expanded={claimPickerOpen}
              onClick={() => setClaimPickerOpen((open) => !open)}
            >
              {selectedClaimPlayer ? <PlayerAvatar player={selectedClaimPlayer} size={38} /> : <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-500">?</span>}
              <span className={`min-w-0 flex-1 truncate font-bold ${selectedClaimPlayer ? "text-slate-950" : "text-slate-500"}`}>
                {selectedClaimPlayer?.name ?? "Select your name"}
              </span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${claimPickerOpen ? "rotate-180" : ""}`} />
            </button>

            {claimPickerOpen ? (
              <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <label className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
                    value={claimSearch}
                    onChange={(event) => setClaimSearch(event.target.value)}
                    placeholder="Search player name"
                    autoFocus
                  />
                </label>
                <div className="max-h-72 overflow-y-auto p-1">
                  {filteredClaimPlayers.map((item) => {
                    const selected = item.id === selectedClaimPlayerId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${selected ? "bg-emerald-50 text-emerald-950" : "hover:bg-slate-50"}`}
                        onClick={() => {
                          setSelectedClaimPlayerId(item.id);
                          setClaimPickerOpen(false);
                          setClaimSearch("");
                          setError("");
                        }}
                      >
                        <PlayerAvatar player={item} size={40} />
                        <span className="min-w-0 flex-1 truncate font-bold">{item.name}</span>
                        {selected ? <Check className="h-5 w-5 shrink-0 text-court" /> : null}
                      </button>
                    );
                  })}
                  {!filteredClaimPlayers.length ? <p className="p-4 text-center text-sm font-semibold text-slate-500">No matching player found.</p> : null}
                </div>
              </div>
            ) : null}
          </div>
          <button className="btn-primary" disabled={busy || !availablePlayers.length || !selectedClaimPlayerId}><CheckCircle2 className="h-4 w-4" /> Request profile</button>
        </form>
        <form onSubmit={createNewProfile} className="sport-card space-y-4 p-5">
          <div><p className="text-xs font-black uppercase text-court">First time here</p><h2 className="mt-1 text-xl font-black text-slate-950">Create a new player</h2><p className="mt-1 text-sm text-slate-600">Use this only if you have no existing profile or match history on the website. No Admin approval is required.</p></div>
          <label className="block"><span className="field-label">Player name</span><input className="field" name="name" minLength={2} maxLength={80} placeholder="Your full player name" required /></label>
          <label className="block"><span className="field-label">Profile picture (optional)</span><input className="field" name="photo" type="file" accept="image/*" /></label>
          <button className="btn-primary" disabled={busy}><UserPlus className="h-4 w-4" /> {busy ? "Creating..." : "Create my player profile"}</button>
        </form>
        </div>
      )}
    </div>
  );
}

function Status({ message, error }: { message: string; error: string }) {
  if (!message && !error) return null;
  return <p className={`rounded-md border p-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || message}</p>;
}

function PartnerSummary({ label, value }: { label: string; value?: string }) {
  return (
    <div className="sport-card p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 font-black text-slate-950">{value ?? "TBD"}</p>
    </div>
  );
}
