import { Award, Shield, Swords, Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { getMatches, getPlayers, getTeams, getTournaments } from "@/lib/data";
import { calculatePlayerStats, calculateTeamStats } from "@/lib/scoring";
import { formatPercent, teamLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RecordsPage() {
  const [players, teams, matches, tournaments] = await Promise.all([getPlayers(), getTeams(), getMatches(), getTournaments()]);
  const teamStats = calculateTeamStats(teams, matches, tournaments);
  const playerStats = calculatePlayerStats(players, teams, matches, tournaments);
  if (!teamStats.length && !playerStats.length) return <EmptyState title="No records yet" body="Records appear after results are entered." />;

  const completed = matches.filter((match) => match.winner_team_id);
  const pairCount = new Map<string, number>();
  for (const team of teams) pairCount.set(team.id, completed.filter((match) => match.team_1_id === team.id || match.team_2_id === team.id).length);
  const mostPlayedTeam = [...pairCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const knockout = completed.filter((match) => match.stage !== "group");
  const knockoutWins = new Map<string, { wins: number; played: number }>();
  for (const match of knockout) {
    for (const id of [match.team_1_id, match.team_2_id]) {
      const current = knockoutWins.get(id) ?? { wins: 0, played: 0 };
      current.played += 1;
      if (match.winner_team_id === id) current.wins += 1;
      knockoutWins.set(id, current);
    }
  }
  const bestKnockout = [...knockoutWins.entries()].sort((a, b) => b[1].wins / b[1].played - a[1].wins / a[1].played)[0];

  const mostTitles = [...playerStats].sort((a, b) => b.titles - a.titles)[0];
  const mostFinals = [...playerStats].sort((a, b) => b.finalsPlayed - a.finalsPlayed)[0];
  const mostSemis = [...playerStats].sort((a, b) => b.semifinalsPlayed - a.semifinalsPlayed)[0];
  const biggestDiff = [...teamStats].sort((a, b) => b.gameDiff - a.gameDiff)[0];
  const mostMatches = [...playerStats].sort((a, b) => b.played - a.played)[0];

  const cards = [
    ["Most titles", mostTitles?.titles ? `${mostTitles.player.name} (${mostTitles.titles})` : "TBD", Trophy],
    ["Most finals", mostFinals?.finalsPlayed ? `${mostFinals.player.name} (${mostFinals.finalsPlayed})` : "TBD", Award],
    ["Most semifinals", mostSemis?.semifinalsPlayed ? `${mostSemis.player.name} (${mostSemis.semifinalsPlayed})` : "TBD", Shield],
    ["Best player win rate", bestPlayerWinRate(playerStats), Trophy],
    ["Best team win rate", bestTeamWinRate(teamStats), Trophy],
    ["Most played team", mostPlayedTeam ? teamLabel(teams.find((team) => team.id === mostPlayedTeam[0])) : "TBD", Swords],
    ["Most played partnership", mostPlayedTeam ? teamLabel(teams.find((team) => team.id === mostPlayedTeam[0])) : "TBD", Swords],
    ["Biggest game difference", biggestDiff ? `${teamLabel(biggestDiff.team)} (${biggestDiff.gameDiff})` : "TBD", Award],
    ["Most matches played", mostMatches ? `${mostMatches.player.name} (${mostMatches.played})` : "TBD", Shield],
    ["Best knockout win rate", bestKnockout ? `${teamLabel(teams.find((team) => team.id === bestKnockout[0]))} (${formatPercent(bestKnockout[1].wins, bestKnockout[1].played)})` : "TBD", Trophy]
  ] as const;

  return (
    <div className="space-y-4">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">Hall of pressure</p>
        <h1 className="mt-1 text-3xl font-black">Records</h1>
      </section>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="sport-card p-4">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-limeball/60 text-ink">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-black uppercase text-slate-500">{label}</p>
            <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function bestPlayerWinRate(rows: ReturnType<typeof calculatePlayerStats>) {
  const row = rows.filter((item) => item.played > 0).sort((a, b) => b.wins / b.played - a.wins / a.played)[0];
  return row ? `${row.player.name} (${formatPercent(row.wins, row.played)})` : "TBD";
}

function bestTeamWinRate(rows: ReturnType<typeof calculateTeamStats>) {
  const row = rows.filter((item) => item.played > 0).sort((a, b) => b.wins / b.played - a.wins / a.played)[0];
  return row ? `${teamLabel(row.team)} (${formatPercent(row.wins, row.played)})` : "TBD";
}
