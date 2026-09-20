import { AmericanoDashboard } from "@/components/AmericanoDashboard";
import { TournamentDashboard } from "@/components/TournamentDashboard";
import { TournamentRegistrationPanel } from "@/components/TournamentRegistrationPanel";
import {
  getAmericanoMatches,
  getCourtStreams,
  getMatches,
  getPlayers,
  getTeams,
  getTournamentPlayers,
  getTournamentTeams
} from "@/lib/data";
import type { Tournament } from "@/lib/types";

type Props = {
  tournament: Tournament;
  allowScoreEntry: boolean;
  showRegistration?: boolean;
};

export async function TournamentExperience({ tournament, allowScoreEntry, showRegistration = false }: Props) {
  if (tournament.tournament_format !== "regular") {
    const registrationPhase = showRegistration && tournament.tournament_format === "team_americano" && tournament.registration_open !== false;
    const [tournamentPlayers, tournamentTeams, matches, courtStreams, teams, players] = await Promise.all([
      getTournamentPlayers(tournament.id),
      getTournamentTeams(tournament.id),
      getAmericanoMatches(tournament.id),
      getCourtStreams(tournament.id),
      registrationPhase ? getTeams() : Promise.resolve([]),
      registrationPhase ? getPlayers() : Promise.resolve([])
    ]);

    return (
      <AmericanoDashboard
        tournament={tournament}
        tournamentPlayers={tournamentPlayers}
        tournamentTeams={tournamentTeams}
        matches={matches}
        courtStreams={courtStreams}
        allowScoreEntry={allowScoreEntry}
        registrationOnly={registrationPhase}
        registrationContent={registrationPhase ? <TournamentRegistrationPanel tournament={tournament} teams={teams} players={players} /> : undefined}
      />
    );
  }

  const registrationPhase = showRegistration && tournament.registration_open !== false;
  const [tournamentTeams, matches, courtStreams, teams, players] = await Promise.all([
    getTournamentTeams(tournament.id),
    getMatches(tournament.id),
    getCourtStreams(tournament.id),
    registrationPhase ? getTeams() : Promise.resolve([]),
    registrationPhase ? getPlayers() : Promise.resolve([])
  ]);

  return (
    <TournamentDashboard
      tournament={tournament}
      tournamentTeams={tournamentTeams}
      matches={matches}
      courtStreams={courtStreams}
      allowScoreEntry={allowScoreEntry}
      registrationOnly={registrationPhase}
      registrationContent={registrationPhase ? <TournamentRegistrationPanel tournament={tournament} teams={teams} players={players} /> : undefined}
    />
  );
}
