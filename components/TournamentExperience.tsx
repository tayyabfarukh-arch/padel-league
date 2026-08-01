import { AmericanoDashboard } from "@/components/AmericanoDashboard";
import { TournamentDashboard } from "@/components/TournamentDashboard";
import {
  getAmericanoMatches,
  getCourtStreams,
  getMatches,
  getTournamentPlayers,
  getTournamentTeams
} from "@/lib/data";
import type { Tournament } from "@/lib/types";

type Props = {
  tournament: Tournament;
  allowScoreEntry: boolean;
};

export async function TournamentExperience({ tournament, allowScoreEntry }: Props) {
  if (tournament.tournament_format !== "regular") {
    const [tournamentPlayers, tournamentTeams, matches, courtStreams] = await Promise.all([
      getTournamentPlayers(tournament.id),
      getTournamentTeams(tournament.id),
      getAmericanoMatches(tournament.id),
      getCourtStreams(tournament.id)
    ]);

    return (
      <AmericanoDashboard
        tournament={tournament}
        tournamentPlayers={tournamentPlayers}
        tournamentTeams={tournamentTeams}
        matches={matches}
        courtStreams={courtStreams}
        allowScoreEntry={allowScoreEntry}
      />
    );
  }

  const [tournamentTeams, matches, courtStreams] = await Promise.all([
    getTournamentTeams(tournament.id),
    getMatches(tournament.id),
    getCourtStreams(tournament.id)
  ]);

  return (
    <TournamentDashboard
      tournament={tournament}
      tournamentTeams={tournamentTeams}
      matches={matches}
      courtStreams={courtStreams}
      allowScoreEntry={allowScoreEntry}
    />
  );
}
