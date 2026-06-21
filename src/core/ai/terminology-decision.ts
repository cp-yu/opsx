import type { TerminologyObservations, TerminologyOccurrence } from '../../types/sweeper.js';

const MAX_TERMS = 5;
const MAX_SPECS = 2;

export interface TerminologyDecisionState {
  sameConceptGroups: string[][];
  rejectedGroups: string[][];
  canonicalTerms: Record<string, string>;
}

export type TerminologyDecisionAnswer =
  | { type: 'same_concept' }
  | { type: 'canonical_term'; term: string }
  | { type: 'different_concepts' };

export function createTerminologyQuestion(
  observations?: TerminologyObservations,
  state?: TerminologyDecisionState
): string | undefined {
  if (!observations || observations.foundInSpecs.length === 0) {
    return undefined;
  }

  const userInput = observations.userInput;
  const found = observations.foundInSpecs;

  if (state && hasRecordedDecision(state, observations)) {
    return undefined;
  }

  const userMatchesSpecTerm = found.some((item) => item.term === userInput);

  if (!userMatchesSpecTerm) {
    const lines = visibleTerms(found).map(
      (item) => `  - '${item.term}' (${item.count} occurrences, see ${formatSpecs(item.specs)})`
    );

    return [`You used '${userInput}'. Found in related specs:`, ...lines, formatHiddenTermCount(found), 'Do they refer to the same concept?']
      .filter(Boolean)
      .join('\n');
  }

  if (found.length > 1) {
    const lines = visibleTerms(found).map((item) => `  - '${item.term}' (${item.count} occurrences)`);

    return ['Terminology inconsistency detected:', ...lines, formatHiddenTermCount(found), 'Suggest choosing a unified term'].filter(Boolean).join('\n');
  }

  return undefined;
}

export function recordTerminologyDecision(
  state: TerminologyDecisionState | undefined,
  observations: TerminologyObservations,
  answer: TerminologyDecisionAnswer
): TerminologyDecisionState {
  const next: TerminologyDecisionState = {
    sameConceptGroups: state?.sameConceptGroups.map((group) => [...group]) ?? [],
    rejectedGroups: state?.rejectedGroups.map((group) => [...group]) ?? [],
    canonicalTerms: { ...(state?.canonicalTerms ?? {}) },
  };
  const group = observationGroup(observations);
  const key = groupKey(group);

  if (answer.type === 'same_concept') {
    addGroup(next.sameConceptGroups, group);
    return next;
  }

  if (answer.type === 'canonical_term') {
    addGroup(next.sameConceptGroups, group);
    next.canonicalTerms[key] = answer.term;
    return next;
  }

  addGroup(next.rejectedGroups, group);
  return next;
}

function visibleTerms(found: TerminologyOccurrence[]): TerminologyOccurrence[] {
  return found.slice(0, MAX_TERMS);
}

function formatHiddenTermCount(found: TerminologyOccurrence[]): string | undefined {
  return found.length > MAX_TERMS ? `and ${found.length} other expression(s)` : undefined;
}

function formatSpecs(specs: string[]): string {
  const visible = specs.slice(0, MAX_SPECS).join(', ');

  return specs.length > MAX_SPECS ? `${visible} etc.` : visible;
}

function addGroup(groups: string[][], group: string[]): void {
  const key = groupKey(group);

  if (!groups.some((item) => groupKey(item) === key)) {
    groups.push(group);
  }
}

function hasRecordedDecision(state: TerminologyDecisionState, observations: TerminologyObservations): boolean {
  const key = observationGroupKey(observations);

  return (
    state.sameConceptGroups.some((group) => groupKey(group) === key) ||
    state.rejectedGroups.some((group) => groupKey(group) === key) ||
    Object.hasOwn(state.canonicalTerms, key)
  );
}

function observationGroup(observations: TerminologyObservations): string[] {
  return [observations.userInput, ...observations.foundInSpecs.map((item) => item.term)].sort(compareTerms);
}

function observationGroupKey(observations: TerminologyObservations): string {
  return groupKey(observationGroup(observations));
}

function groupKey(group: string[]): string {
  return [...group].sort(compareTerms).join('|');
}

function compareTerms(left: string, right: string): number {
  const leftAscii = /^[\x00-\x7F]+$/.test(left);
  const rightAscii = /^[\x00-\x7F]+$/.test(right);

  if (leftAscii !== rightAscii) {
    return leftAscii ? -1 : 1;
  }

  return left.localeCompare(right, 'zh-Hans');
}
