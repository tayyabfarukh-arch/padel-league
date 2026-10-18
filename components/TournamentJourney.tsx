"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Circle, Crown, MapPin, Trophy } from "lucide-react";
import { teamLabel } from "@/lib/format";
import { calculateGroupStandings } from "@/lib/scoring";
import { groupNamesForCount } from "@/lib/tournament-format";
import type { Match, Stage, Team, Tournament, TournamentTeam } from "@/lib/types";

type BracketFixture = { label: string; match?: Match };

export function TournamentJourney({ tournament, tournamentTeams, matches }: { tournament: Tournament; tournamentTeams: TournamentTeam[]; matches: Match[] }) {
  const [view, setView] = useState<"groups" | "knockout">("groups");
  const hasPrequarters = tournament.knockout_format === "prequarterfinal" || matches.some((match) => match.stage === "prequarterfinal");
  const hasQuarterfinals = hasPrequarters || tournament.knockout_format === "quarterfinal" || matches.some((match) => match.stage === "quarterfinal");
  const groupMatches = matches.filter((match) => match.stage === "group");
  const completedMatchCount = matches.filter(isComplete).length;
  const progress = matches.length ? Math.round((completedMatchCount / matches.length) * 100) : 0;
  const prequarters = fixtures(matches, "prequarterfinal", 8, "PQF");
  const orderedPrequarters = [prequarters[0], prequarters[5], prequarters[1], prequarters[4], prequarters[2], prequarters[7], prequarters[3], prequarters[6]];
  const quarterfinals = fixtures(matches, "quarterfinal", 4, "QF");
  const orderedQuarterfinals = hasPrequarters ? quarterfinals : [quarterfinals[0], quarterfinals[2], quarterfinals[1], quarterfinals[3]];
  const semifinals = fixtures(matches, "semifinal", 2, "SF");
  const final = fixtures(matches, "final", 1, "Final");
  const champion = tournament.champion ?? winner(final[0].match);
  const groups = groupNamesForCount(tournament.group_count).map((groupName) => ({ groupName, standings: standingsForGroup(groupName, tournamentTeams, groupMatches) }));
  const qualifierCount = hasPrequarters || hasQuarterfinals ? 4 : tournament.group_count === 2 ? 2 : 4;

  return (
    <details className="tournament-bracket sport-card group overflow-hidden" aria-label="Road to the title" onToggle={(event) => { if (!event.currentTarget.open) setView("groups"); }}>
      <summary className="bracket-summary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="bracket-summary__top">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-limeball"><Trophy className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase text-court">Tournament journey</span><span className="block truncate text-base font-black text-slate-950">Road to the title</span></span>
          <span className="hidden min-w-[150px] sm:block"><span className="block text-right text-[10px] font-black uppercase text-slate-500">{completedMatchCount}/{matches.length} matches</span><span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-court transition-all duration-500" style={{ width: `${progress}%` }} /></span></span>
          <span className="bracket-summary__action"><span className="bracket-action-open hidden sm:inline">Open journey</span><span className="bracket-action-close hidden sm:inline">Close journey</span><ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" /></span>
        </span>
      </summary>
      <div className="border-t border-slate-200">
        {view === "groups" ? (
          <div key="groups" className="journey-stage-view px-4 py-5 sm:px-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-court">Stage 1 of 2</p><h3 className="text-lg font-black text-slate-950">Group stage</h3><p className="mt-1 text-xs font-semibold text-slate-500">Review every group and the highlighted qualifying positions.</p></div><JourneyDots active="groups" /></div>
            <div className={`grid gap-3 ${groups.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : groups.length === 2 ? "md:grid-cols-2" : ""}`}>
              {groups.map(({ groupName, standings }) => <GroupSnapshot key={groupName} groupName={groupName} standings={standings} qualifierCount={qualifierCount} />)}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"><p className="text-xs font-semibold text-slate-500">Highlighted teams advance to the {hasPrequarters ? "pre-quarter-finals" : hasQuarterfinals ? "quarter-finals" : "semi-finals"}.</p><button type="button" className="btn-primary" onClick={() => setView("knockout")}>Next: Knockout bracket <ArrowRight className="h-4 w-4" /></button></div>
          </div>
        ) : (
          <div key="knockout" className="journey-stage-view bg-slate-50/70 px-3 py-5 sm:px-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div className="flex items-center gap-3"><button type="button" className="btn-secondary h-10 w-10 px-0" onClick={() => setView("groups")} aria-label="Back to group stage"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[10px] font-black uppercase text-court">Stage 2 of 2 · Knockout bracket</p><h3 className="text-lg font-black text-slate-950">Every step to the championship</h3></div></div><div className="flex items-center gap-4"><JourneyDots active="knockout" /><p className="hidden text-xs font-semibold text-slate-500 sm:block">Scroll sideways to see the complete bracket</p></div></div>
            <div className="bracket-scroll overflow-x-auto pb-3">
              <div className={`bracket-board ${hasPrequarters ? "bracket-board--prequarters" : hasQuarterfinals ? "bracket-board--quarters" : "bracket-board--semis"}`}>
                <BracketConnectors format={hasPrequarters ? "prequarters" : hasQuarterfinals ? "quarters" : "semis"} />
                {hasPrequarters ? <BracketColumn title="Pre-quarter-finals" subtitle="Top four from Groups A-D" className="bracket-column--prequarterfinals" fixtures={orderedPrequarters} /> : null}
                {hasQuarterfinals ? <BracketColumn title="Quarter-finals" subtitle={hasPrequarters ? "Pre-quarter-final winners" : "Top four from each group"} className="bracket-column--quarterfinals" fixtures={orderedQuarterfinals} /> : null}
                <BracketColumn title="Semi-finals" subtitle={hasPrequarters ? "Q1 vs Q2 · Q3 vs Q4" : hasQuarterfinals ? "Q1 vs Q3 · Q2 vs Q4" : qualificationCopy(tournament)} className="bracket-column--semifinals" fixtures={semifinals} />
                <BracketColumn title="Final" subtitle="Semi-final winners" className="bracket-column--final" fixtures={final} />
                <section className="bracket-column bracket-column--champion"><StageHeading title="Champion" subtitle="Tournament winner" /><div className={`champion-card ${champion ? "is-decided" : ""}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Crown className="h-6 w-6" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase text-amber-700">PPC champion</p><p className="truncate text-sm font-black text-slate-950">{champion ? teamLabel(champion) : "To be decided"}</p></div></div></section>
              </div>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function JourneyDots({ active }: { active: "groups" | "knockout" }) { return <span className="journey-dots" aria-label={`Showing ${active === "groups" ? "group stage" : "knockout bracket"}`}><span className={active === "groups" ? "is-active" : ""}>1</span><i /><span className={active === "knockout" ? "is-active" : ""}>2</span></span>; }
function GroupSnapshot({ groupName, standings, qualifierCount }: { groupName: string; standings: ReturnType<typeof calculateGroupStandings>; qualifierCount: number }) { return <span className="group-snapshot"><span className="group-snapshot__heading"><span>Group {groupName}</span><small>{standings.length} teams</small></span><span className="group-snapshot__labels"><span>Team</span><span>W</span><span>PTS</span></span>{standings.map((row, index) => <span key={row.team.id} className={`group-snapshot__row ${index < qualifierCount ? "is-qualifying" : ""}`}><span className="group-snapshot__rank">{index + 1}</span><span className="min-w-0 truncate font-black text-slate-900">{teamLabel(row.team)}</span><strong>{row.wins}</strong><strong>{signed(row.points)}</strong></span>)}</span>; }
function BracketColumn({ title, subtitle, className, fixtures: stageFixtures }: { title: string; subtitle: string; className: string; fixtures: BracketFixture[] }) { return <section className={`bracket-column ${className}`}><StageHeading title={title} subtitle={subtitle} />{stageFixtures.map((fixture) => <BracketMatch key={fixture.label} fixture={fixture} />)}</section>; }
function StageHeading({ title, subtitle }: { title: string; subtitle: string }) { return <header className="bracket-stage-heading"><p>{title}</p><span>{subtitle}</span></header>; }
function BracketMatch({ fixture }: { fixture: BracketFixture }) { const match = fixture.match; return <article className={`bracket-match ${isComplete(match) ? "is-complete" : ""}`}><div className="bracket-match__meta"><span>{fixture.label}</span>{match?.court_number ? <span><MapPin className="h-3 w-3" /> Court {match.court_number}</span> : <span>{match ? "Scheduled" : "Awaiting teams"}</span>}</div><BracketTeam team={match?.team_1} score={match?.team_1_games} winner={Boolean(match?.winner_team_id && match.winner_team_id === match.team_1_id)} /><BracketTeam team={match?.team_2} score={match?.team_2_games} winner={Boolean(match?.winner_team_id && match.winner_team_id === match.team_2_id)} /></article>; }
function BracketTeam({ team, score, winner: isWinner }: { team?: Team | null; score?: number | null; winner: boolean }) { return <div className={`bracket-team ${isWinner ? "is-winner" : ""}`}><span className="bracket-team__mark">{initials(teamLabel(team))}</span><span className="min-w-0 flex-1 truncate">{team ? teamLabel(team) : "To be decided"}</span>{isWinner ? <CheckCircle2 className="h-4 w-4 shrink-0 text-court" /> : <Circle className="h-2.5 w-2.5 shrink-0 text-slate-300" />}<strong>{score ?? "–"}</strong></div>; }

function BracketConnectors({ format }: { format: "prequarters" | "quarters" | "semis" }) {
  if (format === "prequarters") return <svg className="bracket-connectors" viewBox="0 0 1340 1120" aria-hidden="true"><path d="M220 126 H250 V191 H280 M220 256 H250 V191 M220 386 H250 V451 H280 M220 516 H250 V451 M220 646 H250 V711 H280 M220 776 H250 V711 M220 906 H250 V971 H280 M220 1036 H250 V971" /><path d="M500 191 H530 V321 H560 M500 451 H530 V321 M500 711 H530 V841 H560 M500 971 H530 V841" /><path d="M780 321 H810 V581 H840 M780 841 H810 V581" /><path d="M1060 581 H1120" /></svg>;
  if (format === "quarters") return <svg className="bracket-connectors" viewBox="0 0 1060 580" aria-hidden="true"><path d="M220 126 H250 V191 H280 M220 256 H250 V191" /><path d="M220 386 H250 V451 H280 M220 516 H250 V451" /><path d="M500 191 H530 V321 H560 M500 451 H530 V321" /><path d="M780 321 H840" /></svg>;
  return <svg className="bracket-connectors" viewBox="0 0 780 580" aria-hidden="true"><path d="M220 191 H250 V321 H280 M220 451 H250 V321" /><path d="M500 321 H560" /></svg>;
}

function fixtures(matches: Match[], stage: Stage, count: number, prefix: string): BracketFixture[] { const stageMatches = matches.filter((match) => match.stage === stage).sort((a, b) => (a.round_number ?? 99) - (b.round_number ?? 99) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); return Array.from({ length: count }, (_, index) => ({ label: prefix === "Final" ? "Championship match" : `${prefix}${index + 1}`, match: stageMatches[index] })); }
function winner(match?: Match) { if (!match?.winner_team_id) return null; return match.winner_team_id === match.team_1_id ? match.team_1 : match.winner_team_id === match.team_2_id ? match.team_2 : null; }
function qualificationCopy(tournament: Tournament) { return tournament.group_count === 2 ? "Top two from each group" : "Top four in the standings"; }
function standingsForGroup(groupName: string, tournamentTeams: TournamentTeam[], groupMatches: Match[]) { const assignedTeams = tournamentTeams.filter((entry) => entry.group_name === groupName).map((entry) => entry.team).filter((team): team is Team => Boolean(team)); const teamIds = new Set(assignedTeams.map((team) => team.id)); return calculateGroupStandings(assignedTeams, groupMatches.filter((match) => teamIds.has(match.team_1_id) && teamIds.has(match.team_2_id))); }
function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function isComplete(match?: Match) { return Boolean(match && match.team_1_games !== null && match.team_2_games !== null); }
function initials(value: string) { if (value === "TBD") return "?"; return value.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join(""); }
