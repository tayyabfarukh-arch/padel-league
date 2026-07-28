import { Crown } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MatchCard } from "@/components/MatchCard";
import { ScoreEntryPanel } from "@/components/ScoreEntryPanel";
import { TeamAvatar } from "@/components/Avatar";
import { TournamentGroups } from "@/components/TournamentGroups";
import { getMatches, getTournamentTeams, getTournaments } from "@/lib/data";
import { stageLabel, teamLabel } from "@/lib/format";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CurrentTournamentPage() {
  const tournaments = await getTournaments();
  const tournament = tournaments.find((item) => item.status === "active") ?? tournaments.find((item) => item.status === "upcoming");
  if (!tournament) return <EmptyState title="No current tournament" body="Create a tournament in Admin and set it active." />;

  const [tournamentTeams, matches] = await Promise.all([getTournamentTeams(tournament.id), getMatches(tournament.id)]);
  const teams = tournamentTeams.map((item) => item.team).filter((team): team is Team => Boolean(team));

  return (
    <div className="space-y-6">
      <section className="court-panel rounded-lg p-5 text-white">
        <p className="text-sm font-bold uppercase text-limeball">{tournament.status}</p>
        <h1 className="mt-1 text-3xl font-black">{tournament.name}</h1>
        <p className="mt-2 text-sm text-slate-300">{teams.length} teams | {matches.length} matches</p>
        <p className="mt-3 text-xs font-bold text-slate-300">
          Group match total: {tournament.group_target_points} points | Semifinal: first to {tournament.semifinal_target_games} games | Final: first to {tournament.final_target_games} games
        </p>
      </section>

      {tournament.status === "active" ? (
        <section>
          <h2 className="section-title">Add a score</h2>
          <ScoreEntryPanel tournament={tournament} matches={matches} />
        </section>
      ) : (
        <section className="sport-card border-amber-200 bg-amber-50 p-4">
          <h2 className="font-black text-amber-950">Score entry is not open yet</h2>
          <p className="mt-1 text-sm font-semibold text-amber-800">
            Set this tournament to Active in Admin. The score boxes will then appear here for everyone.
          </p>
        </section>
      )}

      {tournament.champion ? (
        <section className="sport-card border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-4">
            <TeamAvatar team={tournament.champion} size={64} />
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase text-yellow-700">
                <Crown className="h-4 w-4" /> Champion
              </p>
              <h2 className="text-xl font-black text-slate-950">{teamLabel(tournament.champion)}</h2>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="section-title">Teams</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="sport-card flex items-center gap-3 p-3">
              <TeamAvatar team={team} size={48} />
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950">{teamLabel(team)}</p>
                {tournament.group_count === 2 ? (
                  <p className="text-xs font-black uppercase text-court">
                    Group {tournamentTeams.find((entry) => entry.team_id === team.id)?.group_name}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <TournamentGroups
        tournament={tournament}
        tournamentTeams={tournamentTeams}
        matches={matches}
        allowScoreEntry={tournament.status === "active"}
      />

      {(["semifinal", "final", "third_place"] as const).map((stage) => {
        const stageMatches = matches.filter((match) => match.stage === stage);
        if (!stageMatches.length) return null;
        return (
          <section key={stage}>
            <h2 className="section-title">{stageLabel(stage)}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {stageMatches.map((match) => (
                <MatchCard key={match.id} match={match} allowScoreEntry={tournament.status === "active"} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
