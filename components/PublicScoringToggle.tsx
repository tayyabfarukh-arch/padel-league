export function PublicScoringToggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-950">Public score entry</span>
        <span className="mt-0.5 block text-xs font-semibold text-slate-600">
          When off, results can only be entered from the Admin panel.
        </span>
      </span>
      <span className="relative shrink-0">
        <input
          className="peer sr-only"
          name="public_scoring_enabled"
          type="checkbox"
          defaultChecked={defaultChecked}
        />
        <span className="block h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
