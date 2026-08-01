import { PlayerAvatar, TeamAvatar } from "./Avatar";
import type { AmericanoStanding } from "@/lib/types";

export function AmericanoLeaderboard({ rows }: { rows: AmericanoStanding[] }) {
  return (
    <div className="sport-card overflow-hidden">
      <div className="grid grid-cols-[48px_minmax(0,1fr)_52px_58px] bg-ink px-2 py-3 text-[10px] font-black uppercase text-slate-300 md:grid-cols-[56px_minmax(220px,1fr)_repeat(7,72px)]">
        <span>Rank</span><span>Participant</span><span className="text-center">W</span><span className="text-center">Pts</span>
        {['MP', 'D', 'L', 'Against', 'Diff'].map((label) => <span key={label} className="hidden text-center md:block">{label}</span>)}
      </div>
      {rows.map((row, index) => (
        <details key={row.id} className={`rank-row rank-row--${index + 1} group border-b border-slate-100 last:border-0 md:pointer-events-none`}>
          <summary className="grid min-h-[66px] cursor-pointer list-none grid-cols-[48px_minmax(0,1fr)_52px_58px] items-center px-2 py-2 [&::-webkit-details-marker]:hidden md:grid-cols-[56px_minmax(220px,1fr)_repeat(7,72px)]">
            <span className={`rank-badge--${index + 1} grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600`}>#{index + 1}</span>
            <span className="flex min-w-0 items-center gap-2">
              {row.player ? <PlayerAvatar player={row.player} size={38} /> : <TeamAvatar team={row.team} size={38} />}
              <span className="min-w-0 truncate text-sm font-black text-slate-950">{row.name}</span>
            </span>
            <Metric value={row.wins} />
            <Metric value={row.pointsFor} featured />
            <span className="hidden md:contents">
              <Metric value={row.played} />
              <Metric value={row.draws} />
              <Metric value={row.losses} />
              <Metric value={row.pointsAgainst} />
              <Metric value={signed(row.pointDiff)} />
            </span>
          </summary>
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50 p-3 md:hidden">
            <Detail label="Played" value={row.played} />
            <Detail label="Draws" value={row.draws} />
            <Detail label="Losses" value={row.losses} />
            <Detail label="Against" value={row.pointsAgainst} />
            <Detail label="Difference" value={signed(row.pointDiff)} />
          </div>
        </details>
      ))}
    </div>
  );
}

function Metric({ value, featured = false }: { value: string | number; featured?: boolean }) {
  return <span className={`text-center text-sm font-black ${featured ? "text-court" : "text-slate-700"}`}>{value}</span>;
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-white p-2 text-center ring-1 ring-slate-200"><p className="text-[9px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : value;
}
