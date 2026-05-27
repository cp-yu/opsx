import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { validateTaskStructure } from '../../../src/core/parsers/task-structure.js';

const validTasks = (verifies = '`specs/example/spec.md` / Requirement "Parser behavior" / Scenario "Valid tasks pass"') => `## 1. Actions

- [ ] A1 Implement validation
- [ ] A2 Refactor parser

## 2. Checks

- [ ] C1 Verify invalid input is rejected
  - Covers: A1
  - Verifies: ${verifies}
  - Command: \`pnpm test\`

- [ ] C2 Verify behavior is unchanged
  - Covers: A2
  - Verifies: ${verifies}
  - Evidence: parser fixture output
`;

describe('validateTaskStructure', () => {
  it('accepts Actions and Checks with covered executable checks', () => {
    const result = validateTaskStructure(validTasks('manual verification'));

    expect(result.valid).toBe(true);
    expect(result.actions).toEqual(['A1', 'A2']);
    expect(result.checks).toEqual(['C1', 'C2']);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'verifies-cross-check-skipped',
      'verifies-cross-check-skipped',
    ]);
  });

  it('reports missing sections', () => {
    const result = validateTaskStructure('- [ ] A1 Implement');

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'missing-actions-section',
      'missing-checks-section',
    ]);
  });

  it('reports dangling Covers references', () => {
    const result = validateTaskStructure(`## 1. Actions

- [ ] A1 Implement

## 2. Checks

- [ ] C1 Verify
  - Covers: A2
  - Verifies: manual verification
  - Expect: behavior passes
`);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('dangling-covers');
  });

  it('reports malformed action and check IDs', () => {
    const result = validateTaskStructure(`## 1. Actions

- [ ] 1.1 Implement

## 2. Checks

- [ ] 2.1 Verify
  - Covers: A1
  - Verifies: manual verification
  - Expect: behavior passes
`);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('malformed-action-id');
    expect(result.issues.map((issue) => issue.code)).toContain('malformed-check-id');
  });

  it('reports actions not covered by any check', () => {
    const result = validateTaskStructure(`## 1. Actions

- [ ] A1 Implement
- [ ] A2 Implement more

## 2. Checks

- [ ] C1 Verify
  - Covers: A1
  - Verifies: manual verification
  - Expect: behavior passes
`);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('uncovered-action');
  });

  it('reports checks without Verifies fields', () => {
    const result = validateTaskStructure(`## 1. Actions

- [ ] A1 Implement

## 2. Checks

- [ ] C1 Verify
  - Covers: A1
  - Expect: behavior passes
`);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('missing-verifies');
  });

  it('reports checks without executable evidence fields', () => {
    const result = validateTaskStructure(`## 1. Actions

- [ ] A1 Implement

## 2. Checks

- [ ] C1 Verify
  - Covers: A1
  - Verifies: manual verification
`);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('missing-evidence-field');
  });

  it('validates Verifies references against change-local specs', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## MODIFIED Requirements

### Requirement: Parser behavior

#### Scenario: Valid tasks pass
`,
    });

    try {
      const result = validateTaskStructure(validTasks(), { changeDir: tempDir });

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports invalid Verifies spec paths', () => {
    const tempDir = createChangeDir({ 'example/spec.md': '### Requirement: Parser behavior\n' });

    try {
      for (const verifies of [
        '`openspec/specs/example/spec.md` / Requirement "Parser behavior" / Scenario "Valid tasks pass"',
        '`/tmp/example/spec.md` / Requirement "Parser behavior" / Scenario "Valid tasks pass"',
        '`specs/../example/spec.md` / Requirement "Parser behavior" / Scenario "Valid tasks pass"',
        '`specs\\example\\spec.md` / Requirement "Parser behavior" / Scenario "Valid tasks pass"',
      ]) {
        const result = validateTaskStructure(validTasks(verifies), { changeDir: tempDir });

        expect(result.valid).toBe(false);
        expect(result.issues.map((issue) => issue.code)).toContain('invalid-verifies-path');
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports missing Verifies spec references', () => {
    const tempDir = createChangeDir({ 'example/spec.md': '### Requirement: Parser behavior\n' });

    try {
      const result = validateTaskStructure(
        validTasks('`specs/missing/spec.md` / Requirement "Parser behavior" / Scenario "Valid tasks pass"'),
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain('missing-verifies-spec');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports missing Verifies requirement and scenario references', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## MODIFIED Requirements

### Requirement: Parser behavior

#### Scenario: Valid tasks pass
`,
    });

    try {
      const missingRequirement = validateTaskStructure(
        validTasks('`specs/example/spec.md` / Requirement "Missing" / Scenario "Valid tasks pass"'),
        { changeDir: tempDir }
      );
      const missingScenario = validateTaskStructure(
        validTasks('`specs/example/spec.md` / Requirement "Parser behavior" / Scenario "Missing"'),
        { changeDir: tempDir }
      );

      expect(missingRequirement.valid).toBe(false);
      expect(missingRequirement.issues.map((issue) => issue.code)).toContain('missing-verifies-requirement');
      expect(missingScenario.valid).toBe(false);
      expect(missingScenario.issues.map((issue) => issue.code)).toContain('missing-verifies-scenario');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('downgrades Verifies cross-checking to warning when no change specs exist', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-task-'));

    try {
      const result = validateTaskStructure(validTasks('manual verification'), { changeDir: tempDir });

      expect(result.valid).toBe(true);
      expect(result.issues.every((issue) => issue.severity === 'warning')).toBe(true);
      expect(result.issues.map((issue) => issue.code)).toEqual([
        'verifies-cross-check-skipped',
        'verifies-cross-check-skipped',
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function createChangeDir(specs: Record<string, string>): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-task-'));
  for (const [relativePath, content] of Object.entries(specs)) {
    const target = path.join(tempDir, 'specs', relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return tempDir;
}
