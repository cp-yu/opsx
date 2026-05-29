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
      expect(template).toContain('read the JSON report path it returned before summarizing impact findings');
      expect(template).toContain('Do not claim proposal readiness until those scope-affecting questions are resolved or explicitly deferred by the user');
    }
  });

  it('supports repeated independent concept sweeps', () => {
    for (const template of templates) {
      expect(template).toContain('the user introduces a new module, workflow, command, configuration key, project concept, or unfamiliar domain term');
      expect(template).toContain('Call the sweeper once per concept');
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
});
