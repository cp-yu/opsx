import * as fs from 'node:fs';
import * as path from 'node:path';

export interface TaskStructureIssue {
  code:
    | 'missing-actions-section'
    | 'missing-checks-section'
    | 'malformed-action-id'
    | 'malformed-check-id'
    | 'missing-covers'
    | 'dangling-covers'
    | 'uncovered-action'
    | 'missing-verifies'
    | 'invalid-verifies-path'
    | 'missing-verifies-spec'
    | 'missing-verifies-requirement'
    | 'missing-verifies-scenario'
    | 'verifies-cross-check-skipped'
    | 'missing-evidence-field';
  message: string;
  line?: number;
  severity: 'error' | 'warning';
}

export interface TaskStructureValidation {
  valid: boolean;
  issues: TaskStructureIssue[];
  actions: string[];
  checks: string[];
}

export interface TaskStructureValidationOptions {
  changeDir?: string;
}

interface TaskItem {
  id: string;
  line: number;
  fields: Set<string>;
  covers: string[];
  verifies?: string;
}

interface SpecRequirement {
  name: string;
  scenarios: Set<string>;
}

const CHECKBOX_RE = /^\s*-\s+\[[ xX]\]\s+(\S+)/;
const FIELD_RE = /^\s*-\s+(Covers|Verifies|Command|Evidence|Expect):\s*(.*)$/;
const SPEC_PATH_RE = /`([^`]+)`/;
const REQUIREMENT_RE = /\bRequirement\s+"([^"]+)"/;
const SCENARIOS_RE = /\bScenarios?\s+(.+)$/;
const SCENARIO_NAME_RE = /"([^"]+)"/g;

export function validateTaskStructure(
  content: string,
  options: TaskStructureValidationOptions = {}
): TaskStructureValidation {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const mask = buildCodeFenceMask(lines);
  const sections = findTaskSections(lines, mask);
  const issues: TaskStructureIssue[] = [];
  const specFiles = options.changeDir ? listChangeSpecFiles(options.changeDir) : new Set<string>();

  if (!sections.actions) {
    issues.push(error('missing-actions-section', 'Missing Actions section.'));
  }
  if (!sections.checks) {
    issues.push(error('missing-checks-section', 'Missing Checks section.'));
  }

  const actions = sections.actions ? parseItems(lines, mask, sections.actions) : [];
  const checks = sections.checks ? parseItems(lines, mask, sections.checks) : [];
  const actionIds = new Set(actions.map((item) => item.id));
  const coveredActions = new Set<string>();

  for (const item of actions) {
    if (!/^A\d+$/.test(item.id)) {
      issues.push(error('malformed-action-id', `Action checkbox must use an A-prefixed ID: ${item.id}.`, item.line));
    }
  }

  for (const item of checks) {
    if (!/^C\d+$/.test(item.id)) {
      issues.push(error('malformed-check-id', `Check checkbox must use a C-prefixed ID: ${item.id}.`, item.line));
    }

    if (item.covers.length === 0) {
      issues.push(error('missing-covers', `Check ${item.id} is missing Covers.`, item.line));
    }

    for (const id of item.covers) {
      if (!actionIds.has(id)) {
        issues.push(error('dangling-covers', `Check ${item.id} covers unknown action ${id}.`, item.line));
      } else {
        coveredActions.add(id);
      }
    }

    validateVerifies(item, specFiles, options.changeDir, issues);

    if (!hasEvidenceField(item)) {
      issues.push(error('missing-evidence-field', `Check ${item.id} must include Command, Evidence, or Expect.`, item.line));
    }
  }

  for (const item of actions) {
    if (/^A\d+$/.test(item.id) && !coveredActions.has(item.id)) {
      issues.push(error('uncovered-action', `Action ${item.id} is not covered by any check.`, item.line));
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    actions: actions.map((item) => item.id),
    checks: checks.map((item) => item.id),
  };
}

function error(code: TaskStructureIssue['code'], message: string, line?: number): TaskStructureIssue {
  return { severity: 'error', code, message, line };
}

function warning(code: TaskStructureIssue['code'], message: string, line?: number): TaskStructureIssue {
  return { severity: 'warning', code, message, line };
}

function hasEvidenceField(item: TaskItem): boolean {
  return item.fields.has('Command') || item.fields.has('Evidence') || item.fields.has('Expect');
}

function validateVerifies(
  item: TaskItem,
  specFiles: Set<string>,
  changeDir: string | undefined,
  issues: TaskStructureIssue[]
): void {
  const value = item.verifies?.trim();
  if (!value) {
    issues.push(error('missing-verifies', `Check ${item.id} is missing Verifies.`, item.line));
    return;
  }

  if (!changeDir || specFiles.size === 0) {
    issues.push(
      warning(
        'verifies-cross-check-skipped',
        `Check ${item.id} Verifies could not be cross-checked because this change has no local specs.`,
        item.line
      )
    );
    return;
  }

  const parsed = parseVerifies(value);
  if (!parsed || !isValidChangeSpecPath(parsed.specPath)) {
    issues.push(error('invalid-verifies-path', `Check ${item.id} has an invalid Verifies spec path.`, item.line));
    return;
  }

  if (!specFiles.has(parsed.specPath)) {
    issues.push(
      error(
        'missing-verifies-spec',
        `Check ${item.id} Verifies references missing spec ${parsed.specPath}.`,
        item.line
      )
    );
    return;
  }

  const spec = parseSpecRequirements(fs.readFileSync(path.join(changeDir, parsed.specPath), 'utf8'));
  const requirement = spec.get(parsed.requirement);
  if (!requirement) {
    issues.push(
      error(
        'missing-verifies-requirement',
        `Check ${item.id} Verifies references missing requirement "${parsed.requirement}".`,
        item.line
      )
    );
    return;
  }

  for (const scenario of parsed.scenarios) {
    if (!requirement.scenarios.has(scenario)) {
      issues.push(
        error(
          'missing-verifies-scenario',
          `Check ${item.id} Verifies references missing scenario "${scenario}".`,
          item.line
        )
      );
    }
  }
}

function parseVerifies(value: string): { specPath: string; requirement: string; scenarios: string[] } | undefined {
  const specPath = value.match(SPEC_PATH_RE)?.[1]?.trim();
  const requirement = value.match(REQUIREMENT_RE)?.[1]?.trim();
  const scenarioText = value.match(SCENARIOS_RE)?.[1] ?? '';
  const scenarios = [...scenarioText.matchAll(SCENARIO_NAME_RE)].map((match) => match[1].trim());

  if (!specPath || !requirement || scenarios.length === 0 || scenarios.some((scenario) => !scenario)) {
    return undefined;
  }

  return { specPath, requirement, scenarios };
}

function listChangeSpecFiles(changeDir: string): Set<string> {
  const specsDir = path.join(changeDir, 'specs');
  if (!fs.existsSync(specsDir)) {
    return new Set();
  }

  const files = new Set<string>();
  for (const capability of fs.readdirSync(specsDir, { withFileTypes: true })) {
    if (!capability.isDirectory()) {
      continue;
    }

    const specPath = path.join(specsDir, capability.name, 'spec.md');
    if (fs.existsSync(specPath)) {
      files.add(path.posix.join('specs', capability.name, 'spec.md'));
    }
  }

  return files;
}

function isValidChangeSpecPath(specPath: string): boolean {
  if (
    specPath.includes('\\') ||
    specPath.startsWith('/') ||
    path.win32.isAbsolute(specPath) ||
    specPath.startsWith('openspec/') ||
    specPath.includes('../')
  ) {
    return false;
  }

  const parts = specPath.split('/');
  return parts.length === 3 && parts[0] === 'specs' && parts[1] !== '' && parts[2] === 'spec.md';
}

function parseSpecRequirements(content: string): Map<string, SpecRequirement> {
  const requirements = new Map<string, SpecRequirement>();
  let current: SpecRequirement | undefined;

  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    const requirement = line.match(/^###\s+Requirement:\s+(.+?)\s*$/);
    if (requirement) {
      current = { name: requirement[1], scenarios: new Set() };
      requirements.set(current.name, current);
      continue;
    }

    const scenario = line.match(/^####\s+Scenario:\s+(.+?)\s*$/);
    if (scenario && current) {
      current.scenarios.add(scenario[1]);
    }
  }

  return requirements;
}

function parseItems(
  lines: string[],
  mask: boolean[],
  range: { start: number; end: number }
): TaskItem[] {
  const items: TaskItem[] = [];
  let current: TaskItem | undefined;

  for (let i = range.start; i < range.end; i++) {
    if (mask[i]) {
      continue;
    }

    const checkbox = lines[i].match(CHECKBOX_RE);
    if (checkbox) {
      current = { id: checkbox[1], line: i + 1, fields: new Set(), covers: [] };
      items.push(current);
      continue;
    }

    const field = lines[i].match(FIELD_RE);
    if (!field || !current) {
      continue;
    }

    const name = field[1];
    current.fields.add(name);
    if (name === 'Covers') {
      current.covers.push(...field[2].split(',').map((part) => part.trim()).filter(Boolean));
    } else if (name === 'Verifies') {
      current.verifies = field[2];
    }
  }

  return items;
}

function findTaskSections(lines: string[], mask: boolean[]) {
  const headings: Array<{ title: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    if (mask[i]) {
      continue;
    }
    const match = lines[i].match(/^##\s+(.+)$/);
    if (match) {
      headings.push({ title: normalizeHeading(match[1]), line: i });
    }
  }

  return {
    actions: sectionRange(headings, 'actions', lines.length),
    checks: sectionRange(headings, 'checks', lines.length),
  };
}

function sectionRange(
  headings: Array<{ title: string; line: number }>,
  title: string,
  lineCount: number
): { start: number; end: number } | undefined {
  const index = headings.findIndex((heading) => heading.title === title);
  if (index < 0) {
    return undefined;
  }
  return {
    start: headings[index].line + 1,
    end: headings[index + 1]?.line ?? lineCount,
  };
}

function normalizeHeading(title: string): string {
  return title.trim().replace(/^\d+\.\s+/, '').toLowerCase();
}

function buildCodeFenceMask(lines: string[]): boolean[] {
  const mask = new Array(lines.length).fill(false);
  let active: { marker: string; length: number } | undefined;

  for (let i = 0; i < lines.length; i++) {
    const fence = lines[i].match(/^\s*(`{3,}|~{3,})/);
    if (!active) {
      if (fence) {
        active = { marker: fence[1][0], length: fence[1].length };
        mask[i] = true;
      }
      continue;
    }

    mask[i] = true;
    const closing = lines[i].match(/^\s*(`{3,}|~{3,})\s*$/);
    if (closing && closing[1][0] === active.marker && closing[1].length >= active.length) {
      active = undefined;
    }
  }

  return mask;
}
