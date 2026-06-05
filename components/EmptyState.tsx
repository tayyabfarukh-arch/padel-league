import { Database } from "lucide-react";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="sport-card border-dashed p-8 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-slate-950 text-limeball">
        <Database className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{body}</p>
    </div>
  );
}
