import { describe, expect, it } from 'vitest';

import { getReviewerSkillTemplate } from '../../src/core/templates/workflows/reviewer.js';

describe('reviewer cleanliness dimension contract', () => {
  it('defines cleanliness checks after coherence and before OPSX alignment', () => {
    const instructions = getReviewerSkillTemplate().instructions;
    const coherence = instructions.indexOf('### Coherence');
    const cleanliness = instructions.indexOf('### Cleanliness');
    const opsx = instructions.indexOf('### OPSX Alignment');

    expect(coherence).toBeGreaterThanOrEqual(0);
    expect(cleanliness).toBeGreaterThan(coherence);
    expect(opsx).toBeGreaterThan(cleanliness);
    expect(instructions).toContain('orphaned code after refactor');
    expect(instructions).toContain('stale TODO/FIXME/HACK markers');
    expect(instructions).toContain('dead imports introduced by this change');
    expect(instructions).toContain('half migrations');
    expect(instructions).toContain('unreachable code paths introduced by this change');
  });

  it('uses tool-neutral detection strategy', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('Possible approaches');
    expect(instructions).toContain('Prioritize speed and reliability');
    expect(instructions).not.toContain('Run tsc');
  });

  it('maps cleanliness residue to blocking severity except unreachable code', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('Orphaned code, dead imports, stale TODOs, and half migrations: CRITICAL');
    expect(instructions).toContain('Unreachable code: WARNING');
  });

  it('defines unaccounted change detection with attribution universe', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('unaccounted');
    expect(instructions).toContain('attribution universe');
    expect(instructions).toContain('Files');
    expect(instructions).toContain('openspec/changes/');
  });

  it('escalates behavior code to CRITICAL and downgrades mechanical changes', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('behavior code');
    expect(instructions).toContain('lockfile');
    expect(instructions).toContain('WARNING');
  });

  it('requires POSIX path normalization for cross-platform attribution', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('POSIX');
    expect(instructions).toContain('normalize');
  });

  it('supports directory-level attribution for generated files', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('directory');
  });
});
