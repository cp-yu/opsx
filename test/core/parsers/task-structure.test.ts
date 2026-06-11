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

  it('accepts coarse Task sections with Goal, Files, Requirements, and Checks', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## ADDED Requirements

### Requirement: Parser behavior

#### Scenario: Valid tasks pass
`,
    });

    try {
      const result = validateTaskStructure(
        `### Task 1: Parser support

**Goal**: Parse coarse tasks.

**Files**:
- Modify: \`src/core/parsers/task-structure.ts\`
- Test: \`test/core/parsers/task-structure.test.ts\`

**Requirements**:
- Read Goal, Files, Requirements, and Checks
- Keep requirements bounded

#### Checks

- [ ] C1 Verify coarse task parsing
  - Verifies: \`specs/example/spec.md\` / Requirement "Parser behavior" / Scenario "Valid tasks pass"
  - Command: \`pnpm test test/core/parsers/task-structure.test.ts\`
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(true);
      expect(result.format).toBe('coarse-tasks');
      expect(result.actions).toEqual(['Task 1']);
      expect(result.checks).toEqual(['C1']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports missing coarse Task fields and excessive requirements', () => {
    const result = validateTaskStructure(`### Task 1: Missing fields

**Requirements**:
- one
- two
- three
- four
- five
- six

#### Checks

- [ ] C1 Verify
  - Verifies: manual verification
  - Expect: done
`);

    expect(result.valid).toBe(false);
    expect(result.format).toBe('coarse-tasks');
    expect(result.issues.map((issue) => issue.code)).toContain('missing-task-goal');
    expect(result.issues.map((issue) => issue.code)).toContain('missing-task-files');
    expect(result.issues.map((issue) => issue.code)).toContain('too-many-task-requirements');
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

describe('REMOVED requirement anchoring', () => {
  it('accepts Verifies with REMOVED Requirement without Scenario', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## REMOVED Requirements

### Requirement: Deprecated feature
`,
    });

    try {
      const result = validateTaskStructure(
        `### Task 1: Remove feature

**Goal**: Remove deprecated feature.

**Files**:
- Delete: \`src/deprecated.ts\`

**Requirements**:
- Remove all traces of deprecated feature

#### Checks

- [ ] C1 Verify feature removed
  - Verifies: \`specs/example/spec.md\` / REMOVED Requirement "Deprecated feature"
  - Command: \`grep -r "deprecated" src/ || true\`
  - Expect: no matches found
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(true);
      expect(result.checks).toEqual(['C1']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports error when REMOVED requirement is missing from spec', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## REMOVED Requirements

### Requirement: Deprecated feature
`,
    });

    try {
      const result = validateTaskStructure(
        `### Task 1: Remove feature

**Goal**: Remove missing feature.

**Files**:
- Delete: \`src/missing.ts\`

**Requirements**:
- Remove all traces

#### Checks

- [ ] C1 Verify feature removed
  - Verifies: \`specs/example/spec.md\` / REMOVED Requirement "Missing feature"
  - Command: \`grep -r "missing" src/ || true\`
  - Expect: no matches found
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain('missing-verifies-requirement');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('still requires Scenario for non-REMOVED Verifies', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## ADDED Requirements

### Requirement: New feature

#### Scenario: Feature works
`,
    });

    try {
      const result = validateTaskStructure(
        `### Task 1: Add feature

**Goal**: Implement new feature.

**Files**:
- Create: \`src/feature.ts\`

**Requirements**:
- Implement feature

#### Checks

- [ ] C1 Verify feature
  - Verifies: \`specs/example/spec.md\` / Requirement "New feature"
  - Command: \`pnpm test\`
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain('invalid-verifies-path');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('Preserves field anchoring', () => {
  it('accepts Preserves with main spec path and Scenario', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## ADDED Requirements

### Requirement: Temp spec
`,
    });

    const projectRoot = path.dirname(tempDir);
    const mainSpecPath = path.join(projectRoot, 'openspec', 'specs', 'auth', 'spec.md');
    fs.mkdirSync(path.dirname(mainSpecPath), { recursive: true });
    fs.writeFileSync(
      mainSpecPath,
      `## Requirements

### Requirement: Login behavior

#### Scenario: User authenticates
`
    );

    try {
      const result = validateTaskStructure(
        `### Task 1: Refactor login

**Goal**: Refactor login code without behavior change.

**Files**:
- Modify: \`src/auth/login.ts\`

**Requirements**:
- Keep behavior unchanged

#### Checks

- [ ] C1 Verify behavior preserved
  - Preserves: \`openspec/specs/auth/spec.md\` / Requirement "Login behavior" / Scenario "User authenticates"
  - Command: \`pnpm test src/auth/login.test.ts\`
  - Expect: old function loginUser no longer exists
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(true);
      expect(result.checks).toEqual(['C1']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.rmSync(path.join(projectRoot, 'openspec'), { recursive: true, force: true });
    }
  });

  it('rejects Preserves with change-local path', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## ADDED Requirements

### Requirement: Temp spec

#### Scenario: Test
`,
    });

    try {
      const result = validateTaskStructure(
        `### Task 1: Refactor

**Goal**: Refactor code.

**Files**:
- Modify: \`src/code.ts\`

**Requirements**:
- Keep behavior unchanged

#### Checks

- [ ] C1 Verify behavior
  - Preserves: \`specs/example/spec.md\` / Requirement "Temp spec" / Scenario "Test"
  - Command: \`pnpm test\`
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain('invalid-verifies-path');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects Preserves with absolute path', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## ADDED Requirements

### Requirement: Temp spec
`,
    });

    try {
      const result = validateTaskStructure(
        `### Task 1: Refactor

**Goal**: Refactor code.

**Files**:
- Modify: \`src/code.ts\`

**Requirements**:
- Keep behavior unchanged

#### Checks

- [ ] C1 Verify behavior
  - Preserves: \`/openspec/specs/auth/spec.md\` / Requirement "Test" / Scenario "Test"
  - Command: \`pnpm test\`
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain('invalid-verifies-path');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects Preserves with parent traversal', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## ADDED Requirements

### Requirement: Temp spec
`,
    });

    try {
      const result = validateTaskStructure(
        `### Task 1: Refactor

**Goal**: Refactor code.

**Files**:
- Modify: \`src/code.ts\`

**Requirements**:
- Keep behavior unchanged

#### Checks

- [ ] C1 Verify behavior
  - Preserves: \`openspec/../specs/auth/spec.md\` / Requirement "Test" / Scenario "Test"
  - Command: \`pnpm test\`
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain('invalid-verifies-path');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects Preserves with backslash path', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## ADDED Requirements

### Requirement: Temp spec
`,
    });

    try {
      const result = validateTaskStructure(
        `### Task 1: Refactor

**Goal**: Refactor code.

**Files**:
- Modify: \`src/code.ts\`

**Requirements**:
- Keep behavior unchanged

#### Checks

- [ ] C1 Verify behavior
  - Preserves: \`openspec\\specs\\auth\\spec.md\` / Requirement "Test" / Scenario "Test"
  - Command: \`pnpm test\`
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain('invalid-verifies-path');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not relax Verifies path rules', () => {
    const tempDir = createChangeDir({
      'example/spec.md': `## ADDED Requirements

### Requirement: Temp spec

#### Scenario: Test
`,
    });

    const projectRoot = path.dirname(tempDir);
    const mainSpecPath = path.join(projectRoot, 'openspec', 'specs', 'auth', 'spec.md');
    fs.mkdirSync(path.dirname(mainSpecPath), { recursive: true });
    fs.writeFileSync(
      mainSpecPath,
      `## Requirements

### Requirement: Login

#### Scenario: Works
`
    );

    try {
      const result = validateTaskStructure(
        `### Task 1: Add feature

**Goal**: Add new feature.

**Files**:
- Create: \`src/feature.ts\`

**Requirements**:
- Implement feature

#### Checks

- [ ] C1 Verify feature
  - Verifies: \`openspec/specs/auth/spec.md\` / Requirement "Login" / Scenario "Works"
  - Command: \`pnpm test\`
`,
        { changeDir: tempDir }
      );

      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain('invalid-verifies-path');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.rmSync(path.join(projectRoot, 'openspec'), { recursive: true, force: true });
    }
  });
});
