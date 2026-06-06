import { describe, expect, it } from 'vitest';

import { getExploreSkillTemplate, getOpsxExploreCommandTemplate } from '../../../src/core/templates/skill-templates.js';

describe('explore template impact sweeps', () => {
  const templates = [
    getExploreSkillTemplate().instructions,
    getOpsxExploreCommandTemplate().content,
  ];

  it('invokes the sweeper before proposal readiness', () => {
    for (const template of templates) {
      expect(template).toContain('Invoke `openspec-impact-sweeper`');
      expect(template).toContain('preparing to say the discussion is ready for proposal/change artifacts');
      expect(template).toContain('After the subagent returns the JSON report path');
      expect(template).toContain('read that JSON report and interpret the findings in the explore conversation');
      expect(template).toContain('Do not claim proposal readiness until those scope-affecting questions are resolved or explicitly deferred by the user');
    }
  });

  it('supports repeated independent concept sweeps', () => {
    for (const template of templates) {
      expect(template).toContain('the user introduces a new module, workflow, command, configuration key, project concept, or unfamiliar domain term');
      expect(template).toContain('Use a subagent, not direct reading, for `openspec-impact-sweeper`');
      expect(template).toContain('Do not read `openspec-impact-sweeper/SKILL.md` directly in the main agent');
      expect(template).toContain('Treat each new concept as an independent sweep');
      expect(template).toContain('even if another concept was already swept earlier in the conversation');
    }
  });

  it('passes the lightweight sweeper input fields', () => {
    for (const template of templates) {
      expect(template).toContain('projectRoot');
      expect(template).toContain('concept');
      expect(template).toContain('optional `optionalChangeName`');
      expect(template).toContain('optional `knownUserTerms`');
      expect(template).toContain('optional `focus`');
    }
  });

  it('handles terminology decisions before impact questions', () => {
    for (const template of templates) {
      expect(template).toContain('If the report contains terminology observations, decide before impact questions');
      expect(template).toContain('When the user confirms the terms mean the same concept, record that term group');
      expect(template).toContain('When the user chooses a canonical term, record that canonical term');
      expect(template).toContain('When the user says the terms are different concepts, record the rejected term group');
      expect(template).toContain('For any recorded same-concept, canonical-term, or rejected term group, do not ask again for that same group');
      expect(template).toContain('continue the explore flow');
    }
  });

  it('documents the mandatory six-step brainstorming checklist', () => {
    for (const template of templates) {
      expect(template).toContain('## Brainstorming Checklist');
      expect(template).toContain('Explore MUST run this sequence before saying a proposal is ready');
      expect(template).toContain('1. **Explore project context**');
      expect(template).toContain('If the request spans multiple independent subsystems');
      expect(template).toContain('recommend an implementation order');
      expect(template).toContain('2. **Visual companion when useful**');
      expect(template).toContain('3. **Clarify one question at a time**');
      expect(template).toContain('Ask exactly one question, then wait for the answer');
      expect(template).toContain('4. **Compare 2-3 options**');
      expect(template).toContain('Present 2-3 viable approaches');
      expect(template).toContain('5. **Confirm design in sections**');
      expect(template).toContain('architecture, core components, data flow, technology stack, testing strategy, risks and trade-offs');
      expect(template).toContain('6. **Generate Design Summary**');
      expect(template).toContain('Produce a `Design Summary` in the conversation, not in a file');
    }
  });

  it('routes only observable behavior into specs', () => {
    for (const template of templates) {
      expect(template).toContain('Observable behavior requirement');
      expect(template).toContain('Observable behavior changed');
      expect(template).toContain('Refactor rationale or rejected path');
      expect(template).toContain('Implementation strategy');
      expect(template).toContain('OPSX graph intent changed');
      expect(template).toContain('This is observable behavior. Add it to specs?');
      expect(template).not.toContain('New requirement discovered | `specs/<capability>/spec.md`');
    }
  });
});
