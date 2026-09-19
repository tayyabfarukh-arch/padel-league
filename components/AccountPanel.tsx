"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Camera, CheckCircle2, LogIn, LogOut, ShieldCheck, UserPlus } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";
import type { AppUser, Player, PlayerClaim } from "@/lib/types";

export function AccountPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<AppUser | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [claim, setClaim] = useState<PlayerClaim | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAccount = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setAccount(null);
    setPlayer(null);
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
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => void loadAccount(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
      setMessage("Account created. Now claim your existing player profile below.");
    }
  }

  async function requestClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const { error: claimError } = await supabase.from("player_claims").insert({
      user_id: session.user.id,
      player_id: String(form.get("player_id") ?? "")
    });
    setBusy(false);
    if (claimError) setError(claimError.message);
    else {
      setMessage("Claim requested. The Admin will approve it from the Admin panel.");
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

  if (!session) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-ink p-2">
          <button className={mode === "signin" ? "btn-primary" : "btn-secondary border-transparent bg-white/10 text-white"} onClick={() => setMode("signin")}>Sign in</button>
          <button className={mode === "signup" ? "btn-primary" : "btn-secondary border-transparent bg-white/10 text-white"} onClick={() => setMode("signup")}>Create account</button>
        </div>
        <form onSubmit={mode === "signin" ? signIn : signUp} className="sport-card space-y-4 p-5">
          <h2 className="text-xl font-black text-slate-950">{mode === "signin" ? "Welcome back" : "Create your player account"}</h2>
          {mode === "signup" ? <label className="block"><span className="field-label">Username</span><input className="field" name="username" autoCapitalize="none" placeholder="example: tayyab_farukh" required /></label> : null}
          <label className="block"><span className="field-label">Email</span><input className="field" name="email" type="email" autoComplete="email" required /></label>
          <label className="block"><span className="field-label">Password</span><input className="field" name="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /></label>
          <button className="btn-primary w-full" disabled={busy}>{mode === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}</button>
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
        <form onSubmit={updateProfile} className="sport-card space-y-4 p-5">
          <div className="flex items-center gap-4">
            <PlayerAvatar player={player} size={72} />
            <div><p className="text-xs font-black uppercase text-court">Linked player profile</p><h2 className="text-xl font-black text-slate-950">{player.name}</h2></div>
          </div>
          <label className="block"><span className="field-label">Player name</span><input className="field" name="name" defaultValue={player.name} required /></label>
          <label className="block"><span className="field-label">New profile picture</span><input className="field" name="photo" type="file" accept="image/*" /></label>
          <button className="btn-primary" disabled={busy}><Camera className="h-4 w-4" /> Save profile</button>
        </form>
      ) : claim?.status === "pending" ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 font-black text-amber-950"><ShieldCheck className="h-5 w-5" /> Waiting for Admin approval</p>
          <p className="mt-1 text-sm text-amber-800">You requested the profile <strong>{claim.player?.name}</strong>. Once approved, your history and statistics will appear here.</p>
        </section>
      ) : (
        <form onSubmit={requestClaim} className="sport-card space-y-4 p-5">
          <div><h2 className="text-xl font-black text-slate-950">Claim your existing player</h2><p className="mt-1 text-sm text-slate-600">Choose your name. Admin approval protects profiles from being claimed by someone else.</p></div>
          <label className="block"><span className="field-label">Your player profile</span><select className="field" name="player_id" required><option value="">Select your name</option>{availablePlayers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button className="btn-primary" disabled={busy || !availablePlayers.length}><CheckCircle2 className="h-4 w-4" /> Request profile</button>
        </form>
      )}
    </div>
  );
}

function Status({ message, error }: { message: string; error: string }) {
  if (!message && !error) return null;
  return <p className={`rounded-md border p-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || message}</p>;
}
