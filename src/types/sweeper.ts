export interface ImpactSweepEvidenceItem {
  target: string;
  reason: string;
  evidence: string[];
}

export interface ImpactSweepReport {
  concept: string;
  projectRoot: string;
  termMappings: Array<{
    userTerm: string;
    projectTerms: string[];
    evidence: string[];
  }>;
  opsx: {
    nodes: Array<{
      id: string;
      reason: string;
    }>;
    relationsExpanded: Array<{
      from: string;
      to: string;
      type: string;
    }>;
    coverageGaps: string[];
  };
  mustChange: ImpactSweepEvidenceItem[];
  mustCheck: ImpactSweepEvidenceItem[];
  coverageGaps: string[];
  questions: string[];
  /**
   * 术语观察结果，用于检测用户输入与 specs 中术语的一致性。
   *
   * Example:
   * {
   *   "terminologyObservations": {
   *     "userInput": "流程",
   *     "foundInSpecs": [
   *       {
   *         "term": "工作流",
   *         "specs": ["apply-change-workflow"],
   *         "count": 3
   *       }
   *     ]
   *   }
   * }
   */
  terminologyObservations?: TerminologyObservations;
}

export interface TerminologyObservations {
  userInput: string;
  foundInSpecs: TerminologyOccurrence[];
}

export interface TerminologyOccurrence {
  term: string;
  specs: string[];
  count: number;
}
