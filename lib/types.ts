export type Stage = "group" | "semifinal" | "final" | "third_place";
export type TournamentStatus = "upcoming" | "active" | "completed";
export type TournamentFormat = "fixed_teams" | "americano_doubles" | "americano_singles";

export type Player = {
  id: string;
  name: string;
  photo_url: string | null;
  created_at: string;
};

export type Team = {
  id: string;
  player_1_id: string;
  player_2_id: string;
  team_name: string;
  team_photo_url: string | null;
  created_at: string;
  player_1?: Player;
  player_2?: Player;
};

export type Tournament = {
  id: string;
  name: string;
  friend_circle: string;
  tournament_format: TournamentFormat;
  group_target_games: number;
  semifinal_target_games: number;
  final_target_games: number;
  third_place_target_games: number;
  status: TournamentStatus;
  start_date: string;
  end_date: string | null;
  champion_team_id: string | null;
  runner_up_team_id: string | null;
  third_place_team_id: string | null;
  cover_image_url: string | null;
  created_at: string;
  champion?: Team | null;
  runner_up?: Team | null;
  third_place?: Team | null;
};

export type TournamentPlayer = {
  id: string;
  tournament_id: string;
  player_id: string;
  created_at: string;
  player?: Player;
};

export type AmericanoMatch = {
  id: string;
  tournament_id: string;
  round_number: number;
  side_1_player_1_id: string;
  side_1_player_2_id: string | null;
  side_2_player_1_id: string;
  side_2_player_2_id: string | null;
  side_1_points: number | null;
  side_2_points: number | null;
  winner_side: number | null;
  played_at: string | null;
  created_at: string;
  side_1_player_1?: Player;
  side_1_player_2?: Player | null;
  side_2_player_1?: Player;
  side_2_player_2?: Player | null;
};

export type AmericanoPlayerStats = {
  player: Player;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};

export type TournamentTeam = {
  id: string;
  tournament_id: string;
  team_id: string;
  created_at: string;
  team?: Team;
};

export type Match = {
  id: string;
  tournament_id: string;
  team_1_id: string;
  team_2_id: string;
  team_1_games: number | null;
  team_2_games: number | null;
  winner_team_id: string | null;
  stage: Stage;
  played_at: string | null;
  created_at: string;
  team_1?: Team;
  team_2?: Team;
};

export type TeamStats = {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  gameDiff: number;
  points: number;
  semifinalsPlayed: number;
  semifinalsWon: number;
  finalsPlayed: number;
  finalsWon: number;
  titles: number;
  bestFinish: string;
};

export type PlayerStats = Omit<TeamStats, "team"> & {
  player: Player;
  bestPartner?: Player;
  mostPlayedPartner?: Player;
  mostSuccessfulPartner?: Player;
};
