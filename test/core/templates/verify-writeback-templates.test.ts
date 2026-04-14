import { describe, expect, it } from 'vitest';

import {
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';

describe('verify write-back workflow templates', () => {
  it('describes verify write-back and persistence semantics in both surfaces', () => {
    const skill = getVerifyChangeSkillTemplate().instructions;
    const command = getOpsxVerifyCommandTemplate().content;

    for (const template of [skill, command]) {
      expect(template).toContain('9. **Write Back CRITICAL Issues**');
      expect(template).toContain('10. **Persist Verification Result**');
      expect(template).toContain("path.join(changeDir, '.verify-result.json')");
      expect(template).toContain('FAIL_NEEDS_REMEDIATION');
      expect(template).toContain('PASS_WITH_WARNINGS');
      expect(template).toContain('PASS');
      expect(template).toContain('## Remediation');
      expect(template).toContain('[code_fix]');
      expect(template).toContain('[artifact_fix]');
      expect(template).toContain('`[x]` to `[ ]`');
    }
  });

  it('describes apply remediation feedback loop in both surfaces', () => {
    const skill = getApplyChangeSkillTemplate().instructions;
    const command = getOpsxApplyCommandTemplate().content;

    for (const template of [skill, command]) {
      expect(template).toContain("path.join(changeDir, '.verify-result.json')");
      expect(template).toContain("result === 'FAIL_NEEDS_REMEDIATION'");
      expect(template).toContain('Summary of prior CRITICAL verify issues');
      expect(template).toContain('## Remediation');
      expect(template).toContain('[code_fix]');
      expect(template).toContain('[artifact_fix]');
      expect(template).toContain('run `/opsx:verify <change-name>` before archiving');
    }
  });

  it('describes expanded verify gate and core inline check in both archive surfaces', () => {
    const skill = getArchiveChangeSkillTemplate().instructions;
    const command = getOpsxArchiveCommandTemplate().content;

    for (const template of [skill, command]) {
      expect(template).toContain('2. **Apply expanded-mode verify gate**');
      expect(template).toContain("path.join(changeDir, '.verify-result.json')");
      expect(template).toContain("result === 'FAIL_NEEDS_REMEDIATION'");
      expect(template).toContain('Core mode inline conformance check (Step 4.5)');
      expect(template).toContain('If no delta specs exist');
      expect(template).toContain('## Remediation');
      expect(template).toContain('[code_fix]');
      expect(template).toContain('[artifact_fix]');
    }
  });
});
