import { CheckCircle2, ChevronDown, Circle, Crown, MapPin, Trophy } from "lucide-react";
import { teamLabel } from "@/lib/format";
import { calculateGroupStandings } from "@/lib/scoring";
import type { Match, Stage, Team, Tournament, TournamentTeam } from "@/lib/types";

type BracketFixture = {
  label: string;
  match?: Match;
};

export function TournamentJourney({ tournament, tournamentTeams, matches }: { tournament: Tournament; tournamentTeams: TournamentTeam[]; matches: Match[] }) {
  const hasQuarterfinals = tournament.knockout_format === "quarterfinal" || matches.some((match) => match.stage === "quarterfinal");
  const groupMatches = matches.filter((match) => match.stage === "group");
  const completedMatches = matches.filter(isComplete).length;
  const progress = matches.length ? Math.round((completedMatches / matches.length) * 100) : 0;
  const quarterfinals = fixtures(matches, "quarterfinal", 4, "QF");
  const orderedQuarterfinals = [quarterfinals[0], quarterfinals[2], quarterfinals[1], quarterfinals[3]];
  const semifinals = fixtures(matches, "semifinal", 2, "SF");
  const final = fixtures(matches, "final", 1, "Final");
  const finalMatch = final[0].match;
  const champion = tournament.champion ?? winner(finalMatch);
  const groups = (tournament.group_count === 2 ? ["A", "B"] : ["A"]).map((groupName) => ({
    groupName,
    standings: standingsForGroup(groupName, tournamentTeams, groupMatches)
  }));

  return (
    <details className="tournament-bracket sport-card group overflow-hidden" aria-label="Road to the title">
      <summary className="bracket-summary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="bracket-summary__top">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-limeball"><Trophy className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase text-court">Tournament journey</span>
            <span className="block truncate text-base font-black text-slate-950">Road to the title</span>
          </span>
          <span className="hidden min-w-[150px] sm:block">
            <span className="block text-right text-[10px] font-black uppercase text-slate-500">{completedMatches}/{matches.length} matches</span>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full bg-court transition-all duration-500" style={{ width: `${progress}%` }} />
            </span>
          </span>
          <span className="bracket-summary__action">
            <span className="bracket-action-open hidden sm:inline">View knockout bracket</span>
            <span className="bracket-action-close hidden sm:inline">Hide knockout bracket</span>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
          </span>
        </span>
        <span className={`bracket-collapsed-groups ${groups.length === 2 ? "sm:grid-cols-2" : ""}`}>
          {groups.map(({ groupName, standings }) => (
            <GroupSnapshot key={groupName} groupName={groupName} standings={standings} qualifierCount={hasQuarterfinals ? 4 : tournament.group_count === 2 ? 2 : 4} />
          ))}
        </span>
      </summary>

      <div className="border-t border-slate-200">
        <JourneyRules tournament={tournament} groupMatches={groupMatches} hasQuarterfinals={hasQuarterfinals} />

        <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-5 sm:px-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-[10px] font-black uppercase text-court">Knockout bracket</p><h3 className="text-lg font-black text-slate-950">Every step to the championship</h3></div>
            <p className="text-xs font-semibold text-slate-500">Scroll sideways to see the complete bracket</p>
          </div>
          <div className="bracket-scroll overflow-x-auto pb-3">
            <div className={`bracket-board ${hasQuarterfinals ? "bracket-board--quarters" : "bracket-board--semis"}`}>
              <BracketConnectors hasQuarterfinals={hasQuarterfinals} />

              {hasQuarterfinals ? (
                <BracketColumn title="Quarter-finals" subtitle="Top four from each group" className="bracket-column--quarterfinals" fixtures={orderedQuarterfinals} />
              ) : null}
              <BracketColumn title="Semi-finals" subtitle={hasQuarterfinals ? "Q1 vs Q3 · Q2 vs Q4" : qualificationCopy(tournament)} className="bracket-column--semifinals" fixtures={semifinals} />
              <BracketColumn title="Final" subtitle="Semi-final winners" className="bracket-column--final" fixtures={final} />

              <section className="bracket-column bracket-column--champion">
                <StageHeading title="Champion" subtitle="Tournament winner" />
                <div className={`champion-card ${champion ? "is-decided" : ""}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Crown className="h-6 w-6" /></span>
                  <div className="min-w-0"><p className="text-[10px] font-black uppercase text-amber-700">PPC champion</p><p className="truncate text-sm font-black text-slate-950">{champion ? teamLabel(champion) : "To be decided"}</p></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

function GroupSnapshot({ groupName, standings, qualifierCount }: { groupName: string; standings: ReturnType<typeof calculateGroupStandings>; qualifierCount: number }) {
  return (
    <span className="group-snapshot">
      <span className="group-snapshot__heading"><span>Group {groupName}</span><small>{standings.length} teams</small></span>
      <span className="group-snapshot__labels"><span>Team</span><span>W</span><span>PTS</span></span>
      {standings.map((row, index) => (
        <span key={row.team.id} className={`group-snapshot__row ${index < qualifierCount ? "is-qualifying" : ""}`}>
          <span className="group-snapshot__rank">{index + 1}</span>
          <span className="min-w-0 truncate font-black text-slate-900">{teamLabel(row.team)}</span>
          <strong>{row.wins}</strong>
          <strong>{signed(row.points)}</strong>
        </span>
      ))}
    </span>
  );
}

function JourneyRules({ tournament, groupMatches, hasQuarterfinals }: { tournament: Tournament; groupMatches: Match[]; hasQuarterfinals: boolean }) {
  const completedGroups = groupMatches.filter(isComplete).length;
  const steps = hasQuarterfinals
    ? [
        ["1", "Group stage", `${completedGroups}/${groupMatches.length} group matches complete. The top four teams in Group A and Group B qualify.`],
        ["2", "Quarter-finals", "Q1: A1 vs B4 · Q2: A2 vs B3 · Q3: A3 vs B2 · Q4: A4 vs B1."],
        ["3", "Semi-finals", "SF1: winner of Q1 vs winner of Q3 · SF2: winner of Q2 vs winner of Q4."],
        ["4", "The final", "The two semi-final winners meet for the PPC championship."]
      ]
    : [
        ["1", "Group stage", `${completedGroups}/${groupMatches.length} group matches complete. ${qualificationCopy(tournament)} qualify.`],
        ["2", "Semi-finals", tournament.group_count === 2 ? "SF1: A1 vs B2 · SF2: A2 vs B1." : "SF1: 1st vs 4th · SF2: 2nd vs 3rd."],
        ["3", "The final", "The two semi-final winners meet for the PPC championship."]
      ];

  return (
    <div className="journey-rules px-4 py-5 sm:px-5">
      <div className="mb-4"><p className="text-[10px] font-black uppercase text-court">How qualification works</p><h3 className="text-lg font-black text-slate-950">From the groups to the final</h3></div>
      <div className={`grid gap-3 ${hasQuarterfinals ? "lg:grid-cols-4" : "md:grid-cols-3"}`}>
        {steps.map(([number, title, description]) => (
          <div key={number} className="journey-rule">
            <span className="journey-rule__number">{number}</span>
            <div><p className="text-sm font-black text-slate-950">{title}</p><p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{description}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketColumn({ title, subtitle, className, fixtures: stageFixtures }: { title: string; subtitle: string; className: string; fixtures: BracketFixture[] }) {
  return (
    <section className={`bracket-column ${className}`}>
      <StageHeading title={title} subtitle={subtitle} />
      {stageFixtures.map((fixture) => <BracketMatch key={fixture.label} fixture={fixture} />)}
    </section>
  );
}

function StageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="bracket-stage-heading"><p>{title}</p><span>{subtitle}</span></header>;
}

function BracketMatch({ fixture }: { fixture: BracketFixture }) {
  const match = fixture.match;
  const complete = isComplete(match);
  return (
    <article className={`bracket-match ${complete ? "is-complete" : ""}`}>
      <div className="bracket-match__meta">
        <span>{fixture.label}</span>
        {match?.court_number ? <span><MapPin className="h-3 w-3" /> Court {match.court_number}</span> : <span>{match ? "Scheduled" : "Awaiting teams"}</span>}
      </div>
      <BracketTeam team={match?.team_1} score={match?.team_1_games} winner={Boolean(match?.winner_team_id && match.winner_team_id === match.team_1_id)} />
      <BracketTeam team={match?.team_2} score={match?.team_2_games} winner={Boolean(match?.winner_team_id && match.winner_team_id === match.team_2_id)} />
    </article>
  );
}

function BracketTeam({ team, score, winner: isWinner }: { team?: Team | null; score?: number | null; winner: boolean }) {
  return (
    <div className={`bracket-team ${isWinner ? "is-winner" : ""}`}>
      <span className="bracket-team__mark">{initials(teamLabel(team))}</span>
      <span className="min-w-0 flex-1 truncate">{team ? teamLabel(team) : "To be decided"}</span>
      {isWinner ? <CheckCircle2 className="h-4 w-4 shrink-0 text-court" /> : <Circle className="h-2.5 w-2.5 shrink-0 text-slate-300" />}
      <strong>{score ?? "–"}</strong>
    </div>
  );
}

function BracketConnectors({ hasQuarterfinals }: { hasQuarterfinals: boolean }) {
  return hasQuarterfinals ? (
    <svg className="bracket-connectors" viewBox="0 0 1060 580" aria-hidden="true">
      <path d="M220 126 H250 V191 H280 M220 256 H250 V191" />
      <path d="M220 386 H250 V451 H280 M220 516 H250 V451" />
      <path d="M500 191 H530 V321 H560 M500 451 H530 V321" />
      <path d="M780 321 H840" />
    </svg>
  ) : (
    <svg className="bracket-connectors" viewBox="0 0 780 580" aria-hidden="true">
      <path d="M220 191 H250 V321 H280 M220 451 H250 V321" />
      <path d="M500 321 H560" />
    </svg>
  );
}

function fixtures(matches: Match[], stage: Stage, count: number, prefix: string): BracketFixture[] {
  const stageMatches = matches
    .filter((match) => match.stage === stage)
    .sort((a, b) => (a.round_number ?? 99) - (b.round_number ?? 99) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return Array.from({ length: count }, (_, index) => ({
    label: prefix === "Final" ? "Championship match" : `${prefix}${index + 1}`,
    match: stageMatches[index]
  }));
}

function winner(match?: Match) {
  if (!match?.winner_team_id) return null;
  return match.winner_team_id === match.team_1_id ? match.team_1 : match.winner_team_id === match.team_2_id ? match.team_2 : null;
}

function qualificationCopy(tournament: Tournament) {
  return tournament.group_count === 2 ? "Top two from each group" : "Top four in the standings";
}

function standingsForGroup(groupName: string, tournamentTeams: TournamentTeam[], groupMatches: Match[]) {
  const assignedTeams = tournamentTeams
    .filter((entry) => entry.group_name === groupName)
    .map((entry) => entry.team)
    .filter((team): team is Team => Boolean(team));
  const teamIds = new Set(assignedTeams.map((team) => team.id));
  const relevantMatches = groupMatches.filter((match) => teamIds.has(match.team_1_id) && teamIds.has(match.team_2_id));
  return calculateGroupStandings(assignedTeams, relevantMatches);
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function isComplete(match?: Match) {
  return Boolean(match && match.team_1_games !== null && match.team_2_games !== null);
}

function initials(value: string) {
  if (value === "TBD") return "?";
  return value.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}
