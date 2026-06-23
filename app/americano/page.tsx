import { EmptyState } from "@/components/EmptyState";
import { PlayerAvatar } from "@/components/Avatar";
import { getAmericanoMatches, getPlayers, getTournamentPlayers, getTournaments } from "@/lib/data";
import { calculateAmericanoStats } from "@/lib/scoring";
import { playersFromTournamentPlayers } from "@/lib/scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AmericanoPage() {
  const [players, tournamentPlayers, tournaments, matches] = await Promise.all([
    getPlayers(),
    getTournamentPlayers(),
    getTournaments(),
    getAmericanoMatches()
  ]);
  const americanoTournaments = tournaments.filter((tournament) => tournament.tournament_format !== "fixed_teams");
  const scopedPlayers = playersFromTournamentPlayers(players, tournamentPlayers);
  const rows = calculateAmericanoStats(scopedPlayers, matches);

  if (!americanoTournaments.length && !rows.length) {
    return <EmptyState title="No Americano data yet" body="Create an Americano tournament in Admin, add players, then add matches." />;
  }

  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">24-point rotating format</p>
        <h1 className="mt-1 text-3xl font-black">Americano</h1>
        <p className="mt-2 text-sm text-slate-300">
          Rankings are based on total points won, then point difference, wins, draws, and points against.
        </p>
      </section>

      <section>
        <h2 className="section-title">Americano leaderboard</h2>
        <div className="sport-card overflow-hidden">
          {rows.map((row, index) => (
            <div key={row.player.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 p-3 last:border-b-0">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600">#{index + 1}</span>
              <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar player={row.player} size={42} />
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{row.player.name}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {row.wins}W {row.draws}D {row.losses}L | Diff {signed(row.pointDiff)}
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-ink px-3 py-1.5 text-sm font-black text-white">{row.pointsFor}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Americano matches</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {matches.map((match) => (
            <article key={match.id} className="sport-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-limeball px-3 py-1 text-xs font-black text-ink">Round {match.round_number}</span>
                <span className="text-xs font-semibold text-slate-500">{match.played_at ? new Date(match.played_at).toLocaleDateString() : "Upcoming"}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="text-sm font-black text-slate-950">{sideLabel(match.side_1_player_1?.name, match.side_1_player_2?.name)}</p>
                <div className="rounded-md bg-slate-950 px-3 py-2 text-center text-lg font-black text-white">
                  {match.side_1_points === null || match.side_2_points === null ? "vs" : `${match.side_1_points}-${match.side_2_points}`}
                </div>
                <p className="text-right text-sm font-black text-slate-950">{sideLabel(match.side_2_player_1?.name, match.side_2_player_2?.name)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function sideLabel(player1?: string, player2?: string | null) {
  return [player1, player2].filter(Boolean).join(" / ");
}

function signed(value: number) {
  return value > 0 ? `+${value}` : value;
}
