import { AccountPanel } from "@/components/AccountPanel";

export default function AccountPage() {
  return (
    <div className="space-y-5">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-xs font-black uppercase text-limeball">Player area</p>
        <h1 className="mt-1 text-2xl font-black">Your account</h1>
        <p className="mt-1 text-sm text-slate-300">Manage your player profile and identity.</p>
      </section>
      <AccountPanel />
    </div>
  );
}
