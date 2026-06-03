import { describe, expect, it } from 'vitest';
import {
  getBootstrapOpsxSkillTemplate,
  getOpsxBootstrapCommandTemplate,
} from '../../../src/core/templates/workflows/bootstrap-opsx.js';

describe('bootstrap OPSX templates', () => {
  it('documents backfill-specs and subagent semantic matching after promote', () => {
    const skill = getBootstrapOpsxSkillTemplate().instructions;

    expect(skill).toContain('openspec bootstrap backfill-specs --json');
    expect(skill).toContain('unmatched specs');
    expect(skill).toContain('spawn a subagent');
    expect(skill).toContain('spec content and OPSX capability intents');
    expect(skill).toContain('write the returned frontmatter mappings');
    expect(skill).toContain('report any specs that still have no match');
  });

  it('lists backfill-specs as a bootstrap CLI subcommand', () => {
    const command = getOpsxBootstrapCommandTemplate().content;

    expect(command).toContain('openspec bootstrap backfill-specs [--json]');
    expect(command).toContain('also runs backfill-specs after promotion');
  });
});
