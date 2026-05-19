import { describe, expect, it } from 'vitest';

import {
  getContinueChangeSkillTemplate,
  getOpsxContinueCommandTemplate,
} from '../../../src/core/templates/workflows/continue-change.js';

describe('continue change workflow template', () => {
  it('recommends apply instead of archive when artifacts are complete', () => {
    const skill = getContinueChangeSkillTemplate().instructions;
    const command = getOpsxContinueCommandTemplate().content;

    expect(skill).not.toContain('or archive it');
    expect(skill).toContain('All artifacts created! You can now implement this change with `openspec-apply-change`.');

    expect(command).not.toContain('or archive it');
    expect(command).toContain('All artifacts created! You can now implement this change with `/opsx:apply`.');
  });
});
