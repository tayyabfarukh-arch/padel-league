import { AccountPanel } from "@/components/AccountPanel";

export default function AccountPage() {
  return (
    <div className="space-y-5">
      <section className="court-panel rounded-lg px-5 py-4 text-white">
        <p className="text-xs font-black uppercase text-limeball">Player area</p>
        <h1 className="mt-1 text-xl font-black">Account and profile</h1>
        <p className="mt-1 text-sm text-slate-300">Your private details, public player profile, and career overview in one place.</p>
      </section>
      <AccountPanel />
    </div>
  );
}
