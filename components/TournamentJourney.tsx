import { Check, ChevronRight, Circle, Flag, Trophy } from "lucide-react";
import { stageLabel, teamLabel } from "@/lib/format";
import type { Match, Stage, Tournament } from "@/lib/types";

type JourneyStage = {
  key: string;
  label: string;
  matches: Match[];
};

export function TournamentJourney({ tournament, matches }: { tournament: Tournament; matches: Match[] }) {
  const stages: JourneyStage[] = [
    { key: "group", label: "Group stage", matches: matches.filter((match) => match.stage === "group") },
    ...(tournament.knockout_format === "quarterfinal" || matches.some((match) => match.stage === "quarterfinal")
      ? [{ key: "quarterfinal", label: "Quarter-finals", matches: matches.filter((match) => match.stage === "quarterfinal") }]
      : []),
    { key: "semifinal", label: "Semi-finals", matches: matches.filter((match) => match.stage === "semifinal") },
    { key: "final", label: "Final", matches: matches.filter((match) => match.stage === "final") }
  ];
  const finalMatch = matches.find((match) => match.stage === "final");
  const champion = tournament.champion ?? (finalMatch
    ? finalMatch.winner_team_id === finalMatch.team_1_id
      ? finalMatch.team_1
      : finalMatch.winner_team_id === finalMatch.team_2_id
        ? finalMatch.team_2
        : null
    : null);
  const completedMatches = matches.filter((match) => isComplete(match)).length;
  const progress = matches.length ? Math.round((completedMatches / matches.length) * 100) : 0;

  return (
    <section className="sport-card tournament-journey overflow-hidden" aria-label="Tournament progress">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase text-court">Tournament journey</p>
          <h2 className="text-base font-black text-slate-950">Road to the title</h2>
        </div>
        <div className="min-w-[150px] text-right">
          <p className="text-xs font-black text-slate-700">{completedMatches}/{matches.length} matches</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-court transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="journey-scroll overflow-x-auto px-4 py-4">
        <div className="flex min-w-max items-stretch">
          {stages.map((stage, index) => (
            <div key={stage.key} className="flex items-center">
              <JourneyStep stage={stage} index={index} />
              <ChevronRight className="mx-2 h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
            </div>
          ))}
          <div className={`journey-step journey-step--champion ${champion ? "is-complete" : ""}`}>
            <span className="journey-step__icon"><Trophy className="h-4 w-4" /></span>
            <p className="journey-step__eyebrow">Champion</p>
            <p className="journey-step__title">{champion ? teamLabel(champion) : "To be decided"}</p>
            <p className="journey-step__meta">{champion ? "Tournament winner" : "Final result pending"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function JourneyStep({ stage, index }: { stage: JourneyStage; index: number }) {
  const completed = stage.matches.filter((match) => isComplete(match)).length;
  const isCompleteStage = stage.matches.length > 0 && completed === stage.matches.length;
  const isActive = stage.matches.length > 0 && !isCompleteStage;
  const fixture = stage.key === "group" ? null : stage.matches[0];

  return (
    <div className={`journey-step ${isCompleteStage ? "is-complete" : ""} ${isActive ? "is-active" : ""}`} style={{ animationDelay: `${index * 70}ms` }}>
      <span className="journey-step__icon">
        {isCompleteStage ? <Check className="h-4 w-4" /> : isActive ? <Flag className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
      </span>
      <p className="journey-step__eyebrow">{stage.label}</p>
      <p className="journey-step__title">
        {fixture ? `${teamLabel(fixture.team_1)} vs ${teamLabel(fixture.team_2)}` : stage.matches.length ? `${completed}/${stage.matches.length} complete` : "Not generated"}
      </p>
      <p className="journey-step__meta">
        {fixture && fixture.team_1_games !== null && fixture.team_2_games !== null
          ? `${fixture.team_1_games}-${fixture.team_2_games}`
          : stage.matches.length
            ? `${stage.matches.length} ${stage.matches.length === 1 ? "match" : "matches"}`
            : stageLabel(stage.key as Stage)}
      </p>
    </div>
  );
}

function isComplete(match: Match) {
  return match.team_1_games !== null && match.team_2_games !== null;
}
