import type { ReactNode } from "react";

export function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="sport-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase text-slate-500">{label}</p>
        {icon ? <div className="rounded-md bg-limeball/50 p-1.5 text-ink">{icon}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}
