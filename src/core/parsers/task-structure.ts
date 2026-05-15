export interface TaskStructureIssue {
  code:
    | 'missing-actions-section'
    | 'missing-checks-section'
    | 'malformed-action-id'
    | 'malformed-check-id'
    | 'missing-covers'
    | 'dangling-covers'
    | 'uncovered-action'
    | 'missing-evidence-field';
  message: string;
  line?: number;
}

export interface TaskStructureValidation {
  valid: boolean;
  issues: TaskStructureIssue[];
  actions: string[];
  checks: string[];
}

interface TaskItem {
  id: string;
  line: number;
  fields: Set<string>;
  covers: string[];
}

const CHECKBOX_RE = /^\s*-\s+\[[ xX]\]\s+(\S+)/;
const FIELD_RE = /^\s*-\s+(Covers|Command|Evidence|Expect):\s*(.*)$/;

export function validateTaskStructure(content: string): TaskStructureValidation {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const mask = buildCodeFenceMask(lines);
  const sections = findTaskSections(lines, mask);
  const issues: TaskStructureIssue[] = [];

  if (!sections.actions) {
    issues.push({ code: 'missing-actions-section', message: 'Missing Actions section.' });
  }
  if (!sections.checks) {
    issues.push({ code: 'missing-checks-section', message: 'Missing Checks section.' });
  }

  const actions = sections.actions ? parseItems(lines, mask, sections.actions) : [];
  const checks = sections.checks ? parseItems(lines, mask, sections.checks) : [];
  const actionIds = new Set(actions.map((item) => item.id));
  const coveredActions = new Set<string>();

  for (const item of actions) {
    if (!/^A\d+$/.test(item.id)) {
      issues.push({
        code: 'malformed-action-id',
        message: `Action checkbox must use an A-prefixed ID: ${item.id}.`,
        line: item.line,
      });
    }
  }

  for (const item of checks) {
    if (!/^C\d+$/.test(item.id)) {
      issues.push({
        code: 'malformed-check-id',
        message: `Check checkbox must use a C-prefixed ID: ${item.id}.`,
        line: item.line,
      });
    }

    if (item.covers.length === 0) {
      issues.push({
        code: 'missing-covers',
        message: `Check ${item.id} is missing Covers.`,
        line: item.line,
      });
    }

    for (const id of item.covers) {
      if (!actionIds.has(id)) {
        issues.push({
          code: 'dangling-covers',
          message: `Check ${item.id} covers unknown action ${id}.`,
          line: item.line,
        });
      } else {
        coveredActions.add(id);
      }
    }

    if (!hasEvidenceField(item)) {
      issues.push({
        code: 'missing-evidence-field',
        message: `Check ${item.id} must include Command, Evidence, or Expect.`,
        line: item.line,
      });
    }
  }

  for (const item of actions) {
    if (/^A\d+$/.test(item.id) && !coveredActions.has(item.id)) {
      issues.push({
        code: 'uncovered-action',
        message: `Action ${item.id} is not covered by any check.`,
        line: item.line,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    actions: actions.map((item) => item.id),
    checks: checks.map((item) => item.id),
  };
}

function hasEvidenceField(item: TaskItem): boolean {
  return item.fields.has('Command') || item.fields.has('Evidence') || item.fields.has('Expect');
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
