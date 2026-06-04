import type { TerminologyObservations, TerminologyOccurrence } from '../../types/sweeper.js';

export interface SpecText {
  name: string;
  content: string;
}

export interface TerminologyExtractorOptions {
  getCandidateTerms?: (concept: string) => string[];
}

const DEFAULT_TERM_GROUPS = [
  {
    signals: ['流程', '工作流', 'workflow', 'process', 'flow'],
    terms: ['流程', '工作流', 'workflow', '工作流程', 'process', 'flow'],
  },
  {
    signals: ['变更', 'change'],
    terms: ['变更', 'change'],
  },
];

export function extractTerminologyObservations(
  concept: string,
  specs: SpecText[],
  options: TerminologyExtractorOptions = {}
): TerminologyObservations | undefined {
  try {
    const candidateTerms = options.getCandidateTerms?.(concept) ?? getDefaultCandidateTerms(concept);
    const byTerm = new Map<string, { count: number; specs: Set<string> }>();

    for (const spec of specs) {
      const specName = toSpecName(spec.name);

      for (const term of candidateTerms) {
        const count = countOccurrences(spec.content, term, candidateTerms);

        if (count === 0) {
          continue;
        }

        const current = byTerm.get(term) ?? { count: 0, specs: new Set<string>() };
        current.count += count;
        current.specs.add(specName);
        byTerm.set(term, current);
      }
    }

    const foundInSpecs: TerminologyOccurrence[] = [...byTerm.entries()]
      .map(([term, value]) => ({
        term,
        count: value.count,
        specs: [...value.specs].sort((left, right) => left.localeCompare(right, 'en')),
      }))
      .sort((left, right) => right.count - left.count || compareTerms(left.term, right.term));

    return {
      userInput: concept,
      foundInSpecs,
    };
  } catch {
    return undefined;
  }
}

function getDefaultCandidateTerms(concept: string): string[] {
  const lowered = concept.toLowerCase();
  const terms = new Set<string>();

  for (const group of DEFAULT_TERM_GROUPS) {
    if (group.signals.some((signal) => lowered.includes(signal.toLowerCase()))) {
      for (const term of group.terms) {
        terms.add(term);
      }
    }
  }

  terms.add(concept);

  return [...terms].filter(Boolean);
}

function countOccurrences(content: string, term: string, candidateTerms: string[]): number {
  if (!term) {
    return 0;
  }

  const haystack = content.toLowerCase();
  const needle = term.toLowerCase();
  const longerRanges = candidateTerms
    .filter((candidate) => candidate.length > term.length)
    .flatMap((candidate) => findRanges(haystack, candidate.toLowerCase()));
  let count = 0;

  for (const [index, end] of findRanges(haystack, needle)) {
    if (longerRanges.some(([longerStart, longerEnd]) => longerStart <= index && end <= longerEnd)) {
      continue;
    }

    count += 1;
  }

  return count;
}

function findRanges(haystack: string, needle: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    ranges.push([index, index + needle.length]);
    index = haystack.indexOf(needle, index + needle.length);
  }

  return ranges;
}

function compareTerms(left: string, right: string): number {
  const leftAscii = /^[\x00-\x7F]+$/.test(left);
  const rightAscii = /^[\x00-\x7F]+$/.test(right);

  if (leftAscii !== rightAscii) {
    return leftAscii ? -1 : 1;
  }

  return left.localeCompare(right, 'zh-Hans');
}

function toSpecName(name: string): string {
  const parts = name.split(/[\\/]/).filter(Boolean);
  const rawName = parts.at(-1) === 'spec.md' ? parts.at(-2) ?? name : parts.at(-1) ?? name;
  const withoutExtension = rawName.replace(/\.[^.]+$/, '');

  return withoutExtension
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
