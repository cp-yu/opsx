import { describe, expect, it } from 'vitest';

import { validateTaskStructure } from '../../../src/core/parsers/task-structure.js';

const validTasks = `## 1. Actions

- [ ] A1 Implement validation
- [ ] A2 Refactor parser

## 2. Checks

- [ ] C1 Verify invalid input is rejected
  - Covers: A1
  - Command: \`pnpm test\`

- [ ] C2 Verify behavior is unchanged
  - Covers: A2
  - Evidence: parser fixture output
`;

describe('validateTaskStructure', () => {
  it('accepts Actions and Checks with covered executable checks', () => {
    const result = validateTaskStructure(validTasks);

    expect(result.valid).toBe(true);
    expect(result.actions).toEqual(['A1', 'A2']);
    expect(result.checks).toEqual(['C1', 'C2']);
    expect(result.issues).toEqual([]);
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
  - Expect: behavior passes
`);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('uncovered-action');
  });

  it('reports checks without executable evidence fields', () => {
    const result = validateTaskStructure(`## 1. Actions

- [ ] A1 Implement

## 2. Checks

- [ ] C1 Verify
  - Covers: A1
`);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('missing-evidence-field');
  });
});
