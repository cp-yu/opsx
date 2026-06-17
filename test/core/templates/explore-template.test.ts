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

  it('states the main explore agent is read-only', () => {
    for (const template of templates) {
      expect(template).toContain('Explore is read-only for the main agent');
      expect(template).toContain('Do not create, edit, delete, format, regenerate, or patch any project file or OpenSpec artifact');
      expect(template).toContain('produce a conversation-only `Design Summary`');
      expect(template).toContain('instruct the user to call `$openspec-propose <change-name>`');
    }
  });

  it('routes command-template artifact actions to non-explore workflows', () => {
    const commandTemplate = getOpsxExploreCommandTemplate().content;

    expect(commandTemplate).toContain('Call `$openspec-propose <change-name>` to create artifacts from the Design Summary');
    expect(commandTemplate).toContain('route artifact writes to `$openspec-propose <change-name>` or the appropriate non-explore workflow');
  });

  it('treats design confirmation as direction only', () => {
    for (const template of templates) {
      expect(template).toContain('User selection of an option, confirmation of a design section, or statements such as "可以", "就这样", "选 2", or "拆成多个文件" confirm design direction only');
      expect(template).toContain('They are not authorization to modify files');
    }
  });

  it('keeps the sweeper report as the only explore write exception', () => {
    for (const template of templates) {
      expect(template).toContain('Only the `openspec-impact-sweeper` subagent may write its JSON report under `openspec/sweeper/`');
      expect(template).toContain('the main explore agent may only read and interpret that report');
      expect(template).toContain('The sweeper report write is an internal subagent exception and does not grant the main explore agent permission to create or modify project files or OpenSpec artifacts');
    }
  });

  it('routes active-change insights to future capture targets', () => {
    for (const template of templates) {
      expect(template).toContain('Future Capture Target');
      expect(template).toContain('Observable behavior requirement');
      expect(template).toContain('Observable behavior changed');
      expect(template).toContain('Refactor rationale or rejected path');
      expect(template).toContain('Implementation strategy');
      expect(template).toContain('OPSX graph intent changed');
      expect(template).toContain('This is observable behavior for `specs/<capability>/spec.md`; include it in the Design Summary');
      expect(template).toContain('That is a design decision for `design.md`; include it in the Design Summary');
      expect(template).toContain('This changes scope for `proposal.md`; include it in the Design Summary');
    }
  });
});

describe('explore supperpowers-style reference', () => {
  it('declares supperpowers-style reference with four topics', () => {
    const template = getExploreSkillTemplate();
    const ref = (template.referenceFiles || []).find(f => f.path === 'references/explore-supperpowers-style.md');

    expect(ref).toBeDefined();
    expect(ref?.content).toContain('## The Stance');
    expect(ref?.content).toContain('## What You Might Do');
    expect(ref?.content).toContain('## Handling Different Entry Points');
    expect(ref?.content).toContain('## What We Figured Out');
  });

  it('reference content routes to propose instead of direct writes', () => {
    const template = getExploreSkillTemplate();
    const ref = (template.referenceFiles || []).find(f => f.path === 'references/explore-supperpowers-style.md');

    expect(ref).toBeDefined();
    // Should NOT contain old direct-write phrasing
    expect(ref?.content).not.toContain('Want me to create a proposal');
    expect(ref?.content).not.toContain('I can create a change proposal');
    expect(ref?.content).not.toContain('Updated design.md');

    // Should route to propose
    expect(ref?.content).toContain('$openspec-propose');
  });

  it('reference content does not duplicate main instructions mechanisms', () => {
    const template = getExploreSkillTemplate();
    const ref = (template.referenceFiles || []).find(f => f.path === 'references/explore-supperpowers-style.md');

    expect(ref).toBeDefined();
    // Should NOT contain sweeper delegation protocol details
    expect(ref?.content).not.toContain('openspec-impact-sweeper');
    // Should NOT contain brainstorming checklist numbered flow
    expect(ref?.content).not.toContain('Explore MUST run this sequence');
    // Should NOT contain Future Capture Target routing table
    expect(ref?.content).not.toContain('Future Capture Target');
  });

  it('reference content is self-contained without template variables', () => {
    const template = getExploreSkillTemplate();
    const ref = (template.referenceFiles || []).find(f => f.path === 'references/explore-supperpowers-style.md');

    expect(ref).toBeDefined();
    expect(ref?.content).not.toMatch(/\$\{[^}]+\}/);
  });

  it('reference content is within 500 line limit', () => {
    const template = getExploreSkillTemplate();
    const ref = (template.referenceFiles || []).find(f => f.path === 'references/explore-supperpowers-style.md');

    expect(ref).toBeDefined();
    const lineCount = ref?.content.trim().split('\n').length || 0;
    expect(lineCount).toBeLessThanOrEqual(500);
  });
});
