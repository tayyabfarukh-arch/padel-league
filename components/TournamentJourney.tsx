"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, Crown, MapPin, Maximize2, Minimize2, Trophy } from "lucide-react";
import { teamLabel } from "@/lib/format";
import { calculateGroupStandings } from "@/lib/scoring";
import { groupNamesForCount } from "@/lib/tournament-format";
import type { Match, Stage, Team, Tournament, TournamentTeam } from "@/lib/types";

type BracketFixture = { label: string; match?: Match };
type JourneyView = "groups" | "knockout";
type KnockoutStage = "prequarterfinal" | "quarterfinal" | "semifinal" | "final";

export function TournamentJourney({ tournament, tournamentTeams, matches }: { tournament: Tournament; tournamentTeams: TournamentTeam[]; matches: Match[] }) {
  const hasPrequarters = tournament.knockout_format === "prequarterfinal" || matches.some((match) => match.stage === "prequarterfinal");
  const hasQuarterfinals = hasPrequarters || tournament.knockout_format === "quarterfinal" || matches.some((match) => match.stage === "quarterfinal");
  const knockoutStages = useMemo<KnockoutStage[]>(() => [
    ...(hasPrequarters ? ["prequarterfinal" as const] : []),
    ...(hasQuarterfinals ? ["quarterfinal" as const] : []),
    "semifinal",
    "final"
  ], [hasPrequarters, hasQuarterfinals]);
  const [view, setView] = useState<JourneyView>("groups");
  const [selectedStage, setSelectedStage] = useState<KnockoutStage>(knockoutStages[0]);
  const [isExpanded, setIsExpanded] = useState(false);
  const bracketScrollRef = useRef<HTMLDivElement>(null);
  const stageTabsRef = useRef<HTMLElement>(null);
  const groupMatches = matches.filter((match) => match.stage === "group");
  const completedMatchCount = matches.filter(isComplete).length;
  const progress = matches.length ? Math.round((completedMatchCount / matches.length) * 100) : 0;
  const groups = groupNamesForCount(tournament.group_count).map((groupName) => ({
    groupName,
    standings: standingsForGroup(groupName, tournamentTeams, groupMatches)
  }));
  const qualifierCount = hasPrequarters || hasQuarterfinals ? 4 : tournament.group_count === 2 ? 2 : 4;

  useEffect(() => {
    const selectedTab = stageTabsRef.current?.querySelector<HTMLElement>(`[data-stage="${selectedStage}"]`);
    selectedTab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedStage]);

  function selectKnockoutStage(stage: KnockoutStage) {
    setSelectedStage(stage);
    const index = knockoutStages.indexOf(stage);
    bracketScrollRef.current?.scrollTo({ left: index * 280, behavior: "smooth" });
  }

  function syncStageToScroll() {
    const scroller = bracketScrollRef.current;
    if (!scroller || scroller.clientWidth > 700) return;
    const stageIndex = Math.min(knockoutStages.length - 1, Math.max(0, Math.round(scroller.scrollLeft / 280)));
    const stage = knockoutStages[stageIndex];
    if (stage && stage !== selectedStage) setSelectedStage(stage);
  }

  return (
    <section className="tournament-bracket sport-card overflow-hidden" aria-label="Road to the title">
      <header className="bracket-summary">
        <button
          type="button"
          className="bracket-summary__top w-full text-left"
          aria-expanded={isExpanded}
          aria-controls={`tournament-journey-${tournament.id}`}
          onClick={() => setIsExpanded((current) => !current)}
          title={isExpanded ? "Minimize tournament journey" : "Expand tournament journey"}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-limeball"><Trophy className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase text-court">Tournament journey</span><span className="block truncate text-base font-black text-slate-950">Road to the title</span><span className="mt-0.5 block text-[11px] font-bold text-slate-500">{isExpanded ? "Select a stage to follow the tournament route" : "Select to view groups and the knockout bracket"}</span></span>
          <span className="hidden min-w-[150px] sm:block"><span className="block text-right text-[10px] font-black uppercase text-slate-500">{completedMatchCount}/{matches.length} matches</span><span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-court transition-all duration-500" style={{ width: `${progress}%` }} /></span></span>
          <span className={`bracket-summary__action ${isExpanded ? "is-expanded" : ""}`}>
            {isExpanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{isExpanded ? "Minimize" : "Expand"}</span>
          </span>
        </button>
      </header>

      <div id={`tournament-journey-${tournament.id}`} className="border-t border-slate-200" hidden={!isExpanded}>
        <nav className="journey-primary-tabs" aria-label="Tournament stage">
          <button type="button" className={view === "groups" ? "is-active" : ""} onClick={() => setView("groups")}>Group stage</button>
          <button type="button" className={view === "knockout" ? "is-active" : ""} onClick={() => setView("knockout")}>Knockout stage</button>
        </nav>

        {view === "groups" ? (
          <section className="journey-panel journey-panel--groups px-4 py-5 sm:px-5">
            <div className="mb-4"><p className="text-[10px] font-black uppercase text-court">Group stage</p><h3 className="text-lg font-black text-slate-950">Qualification standings</h3><p className="mt-1 text-xs font-semibold text-slate-500">Highlighted positions advance to the {hasPrequarters ? "pre-quarter-finals" : hasQuarterfinals ? "quarter-finals" : "semi-finals"}.</p></div>
            <div className={`grid gap-3 ${groups.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : groups.length === 2 ? "md:grid-cols-2" : ""}`}>
              {groups.map(({ groupName, standings }) => <GroupSnapshot key={groupName} groupName={groupName} standings={standings} qualifierCount={qualifierCount} />)}
            </div>
          </section>
        ) : (
          <section className="journey-panel journey-panel--knockout bg-slate-50/70">
            <nav ref={stageTabsRef} className="knockout-stage-tabs" aria-label="Knockout round">
              {knockoutStages.map((stage) => (
                <button key={stage} data-stage={stage} type="button" className={selectedStage === stage ? "is-active" : ""} onClick={() => selectKnockoutStage(stage)}>
                  {stage === "prequarterfinal" ? "Pre-quarter-finals" : stage === "quarterfinal" ? "Quarter-finals" : stage === "semifinal" ? "Semi-finals" : "Final"}
                </button>
              ))}
            </nav>
            <div className="px-3 py-5 sm:px-5">
              <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-court">Knockout bracket</p><h3 className="text-lg font-black text-slate-950">{stageTitle(selectedStage)}</h3></div><p className="hidden text-xs font-semibold text-slate-500 sm:block">Scroll sideways to follow the route</p></div>
              <div ref={bracketScrollRef} className="bracket-scroll knockout-map-scroll overflow-x-auto pb-3" onScroll={syncStageToScroll}>
                <CompleteBracket selectedStage={selectedStage} hasPrequarters={hasPrequarters} hasQuarterfinals={hasQuarterfinals} matches={matches} champion={tournament.champion ?? winner(fixtures(matches, "final", 1, "Final")[0].match)} />
              </div>
              {(selectedStage === "semifinal" || selectedStage === "final") ? <ThirdPlaceMatch match={fixtures(matches, "third_place", 1, "Third place")[0].match} /> : null}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function CompleteBracket({ selectedStage, hasPrequarters, hasQuarterfinals, matches, champion }: { selectedStage: KnockoutStage; hasPrequarters: boolean; hasQuarterfinals: boolean; matches: Match[]; champion: Team | null | undefined }) {
  const prequarters = fixtures(matches, "prequarterfinal", 8, "PQF");
  const quarterfinals = fixtures(matches, "quarterfinal", 4, "QF");
  const semifinals = fixtures(matches, "semifinal", 2, "SF");
  const final = fixtures(matches, "final", 1, "Final");
  const orderedPrequarters = [prequarters[0], prequarters[5], prequarters[1], prequarters[4], prequarters[2], prequarters[7], prequarters[3], prequarters[6]];
  const orderedQuarterfinals = hasPrequarters ? quarterfinals : [quarterfinals[0], quarterfinals[2], quarterfinals[1], quarterfinals[3]];
  const boardClass = hasPrequarters ? "bracket-board--prequarters" : hasQuarterfinals ? "bracket-board--quarters" : "bracket-board--semis";

  return (
    <div className={`bracket-board ${boardClass} bracket-view--${selectedStage}`}>
      <CompleteConnectors selectedStage={selectedStage} format={hasPrequarters ? "prequarters" : hasQuarterfinals ? "quarters" : "semis"} />
      {hasPrequarters ? <BracketColumn title="Pre-quarter-finals" subtitle="Top four from Groups A-D" className="bracket-column--prequarterfinals" fixtures={orderedPrequarters} /> : null}
      {hasQuarterfinals ? <BracketColumn title="Quarter-finals" subtitle={hasPrequarters ? "Pre-quarter-final winners" : "Top four from each group"} className="bracket-column--quarterfinals" fixtures={orderedQuarterfinals} /> : null}
      <BracketColumn title="Semi-finals" subtitle={hasPrequarters ? "Q1 vs Q2 · Q3 vs Q4" : hasQuarterfinals ? "Q1 vs Q3 · Q2 vs Q4" : "Four teams remain"} className="bracket-column--semifinals" fixtures={semifinals} />
      <BracketColumn title="Final" subtitle="Semi-final winners" className="bracket-column--final" fixtures={final} />
      <section className="bracket-column bracket-column--champion"><StageHeading title="Champion" subtitle="Tournament winner" /><ChampionCard champion={champion} /></section>
    </div>
  );
}

function CompleteConnectors({ selectedStage, format }: { selectedStage: KnockoutStage; format: "prequarters" | "quarters" | "semis" }) {
  const semifinalX = format === "prequarters" ? 560 : format === "quarters" ? 280 : 0;
  const finalX = semifinalX + 280;
  const championX = finalX + 280;
  const boardWidth = format === "prequarters" ? 1340 : format === "quarters" ? 1060 : 780;
  if (selectedStage === "final") return <svg className="bracket-connectors" viewBox={`0 0 ${boardWidth} 300`} aria-hidden="true"><path d={`M${finalX + 220} 141 H${championX}`} /></svg>;
  if (selectedStage === "semifinal") return <svg className="bracket-connectors" viewBox={`0 0 ${boardWidth} 420`} aria-hidden="true"><path d={`M${semifinalX + 220} 126 H${semifinalX + 250} V211 H${finalX} M${semifinalX + 220} 296 H${semifinalX + 250} V211`} /><path d={`M${finalX + 220} 211 H${championX}`} /></svg>;
  if (selectedStage === "quarterfinal" && format === "prequarters") return <svg className="bracket-connectors" viewBox="0 0 1340 580" aria-hidden="true"><path d="M500 126 H530 V191 H560 M500 256 H530 V191 M500 386 H530 V451 H560 M500 516 H530 V451" /><path d="M780 191 H810 V321 H840 M780 451 H810 V321" /><path d="M1060 321 H1120" /></svg>;
  if (format === "prequarters") return <svg className="bracket-connectors" viewBox="0 0 1340 1120" aria-hidden="true"><path d="M220 126 H250 V191 H280 M220 256 H250 V191 M220 386 H250 V451 H280 M220 516 H250 V451 M220 646 H250 V711 H280 M220 776 H250 V711 M220 906 H250 V971 H280 M220 1036 H250 V971" /><path d="M500 191 H530 V321 H560 M500 451 H530 V321 M500 711 H530 V841 H560 M500 971 H530 V841" /><path d="M780 321 H810 V581 H840 M780 841 H810 V581" /><path d="M1060 581 H1120" /></svg>;
  if (format === "quarters") return <svg className="bracket-connectors" viewBox="0 0 1060 580" aria-hidden="true"><path d="M220 126 H250 V191 H280 M220 256 H250 V191" /><path d="M220 386 H250 V451 H280 M220 516 H250 V451" /><path d="M500 191 H530 V321 H560 M500 451 H530 V321" /><path d="M780 321 H840" /></svg>;
  return <svg className="bracket-connectors" viewBox="0 0 780 580" aria-hidden="true"><path d="M220 191 H250 V321 H280 M220 451 H250 V321" /><path d="M500 321 H560" /></svg>;
}

function GroupSnapshot({ groupName, standings, qualifierCount }: { groupName: string; standings: ReturnType<typeof calculateGroupStandings>; qualifierCount: number }) {
  return <span className="group-snapshot"><span className="group-snapshot__heading"><span>Group {groupName}</span><small>{standings.length} teams</small></span><span className="group-snapshot__labels"><span>Team</span><span>W</span><span>PTS</span></span>{standings.map((row, index) => <span key={row.team.id} className={`group-snapshot__row ${index < qualifierCount ? "is-qualifying" : ""}`}><span className="group-snapshot__rank">{index + 1}</span><span className="min-w-0 truncate font-black text-slate-900">{teamLabel(row.team)}</span><strong>{row.wins}</strong><strong>{signed(row.points)}</strong></span>)}</span>;
}

function BracketColumn({ title, subtitle, className, fixtures: stageFixtures }: { title: string; subtitle: string; className: string; fixtures: BracketFixture[] }) {
  return <section className={`bracket-column ${className}`}><StageHeading title={title} subtitle={subtitle} />{stageFixtures.map((fixture) => <BracketMatch key={fixture.label} fixture={fixture} />)}</section>;
}

function StageHeading({ title, subtitle }: { title: string; subtitle: string }) { return <header className="bracket-stage-heading"><p>{title}</p><span>{subtitle}</span></header>; }

function BracketMatch({ fixture }: { fixture: BracketFixture }) {
  const match = fixture.match;
  return <article className={`bracket-match ${isComplete(match) ? "is-complete" : ""}`}><div className="bracket-match__meta"><span>{fixture.label}{match?.played_at ? ` · ${new Date(match.played_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}</span>{match?.court_number ? <span><MapPin className="h-3 w-3" /> Court {match.court_number}</span> : <span>{isComplete(match) ? "FT" : match ? "Scheduled" : "Awaiting teams"}</span>}</div><BracketTeam team={match?.team_1} score={match?.team_1_games} winner={Boolean(match?.winner_team_id && match.winner_team_id === match.team_1_id)} /><BracketTeam team={match?.team_2} score={match?.team_2_games} winner={Boolean(match?.winner_team_id && match.winner_team_id === match.team_2_id)} /></article>;
}

function BracketTeam({ team, score, winner: isWinner }: { team?: Team | null; score?: number | null; winner: boolean }) { return <div className={`bracket-team ${isWinner ? "is-winner" : ""}`}><span className="bracket-team__mark">{initials(teamLabel(team))}</span><span className="min-w-0 flex-1 truncate">{team ? teamLabel(team) : "To be decided"}</span>{isWinner ? <CheckCircle2 className="h-4 w-4 shrink-0 text-court" /> : <Circle className="h-2.5 w-2.5 shrink-0 text-slate-300" />}<strong>{score ?? "–"}</strong></div>; }

function ChampionCard({ champion }: { champion: Team | null | undefined }) { return <div className={`champion-card ${champion ? "is-decided" : ""}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Crown className="h-6 w-6" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase text-amber-700">PPC champion</p><p className="truncate text-sm font-black text-slate-950">{champion ? teamLabel(champion) : "To be decided"}</p></div></div>; }

function ThirdPlaceMatch({ match }: { match?: Match }) { if (!match) return null; return <div className="third-place-route"><div><p className="text-[10px] font-black uppercase text-amber-700">Third-place playoff</p><p className="text-sm font-black text-slate-950">Semi-final runners-up</p></div><div className="w-full max-w-[220px]"><BracketMatch fixture={{ label: "Third place", match }} /></div></div>; }

function fixtures(matches: Match[], stage: Stage, count: number, prefix: string): BracketFixture[] { const stageMatches = matches.filter((match) => match.stage === stage).sort((a, b) => (a.round_number ?? 99) - (b.round_number ?? 99) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); return Array.from({ length: count }, (_, index) => ({ label: prefix === "Final" ? "Championship match" : prefix === "Third place" ? "Third-place match" : `${prefix}${index + 1}`, match: stageMatches[index] })); }
function stageTitle(stage: KnockoutStage) { return stage === "prequarterfinal" ? "Pre-quarter-finals to quarter-finals" : stage === "quarterfinal" ? "Quarter-finals to semi-finals" : stage === "semifinal" ? "Semi-finals to the final" : "The championship match"; }
function winner(match?: Match) { if (!match?.winner_team_id) return null; return match.winner_team_id === match.team_1_id ? match.team_1 : match.winner_team_id === match.team_2_id ? match.team_2 : null; }
function standingsForGroup(groupName: string, tournamentTeams: TournamentTeam[], groupMatches: Match[]) { const assignedTeams = tournamentTeams.filter((entry) => entry.group_name === groupName).map((entry) => entry.team).filter((team): team is Team => Boolean(team)); const teamIds = new Set(assignedTeams.map((team) => team.id)); return calculateGroupStandings(assignedTeams, groupMatches.filter((match) => teamIds.has(match.team_1_id) && teamIds.has(match.team_2_id))); }
function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function isComplete(match?: Match) { return Boolean(match && match.team_1_games !== null && match.team_2_games !== null); }
function initials(value: string) { if (value === "TBD") return "?"; return value.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join(""); }
