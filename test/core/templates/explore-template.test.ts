import { describe, expect, it } from 'vitest';

import { getExploreSkillTemplate } from '../../../src/core/templates/skill-templates.js';

describe('explore template impact sweeps', () => {
  const template = getExploreSkillTemplate().instructions;

  it('invokes the sweeper before proposal readiness', () => {
    expect(template).toContain('Invoke `openspec-impact-sweeper`');
    expect(template).toContain('preparing to say the discussion is ready for proposal/change artifacts');
    expect(template).toContain('After the subagent returns the JSON report path');
    expect(template).toContain('read that JSON report and interpret the findings in the explore conversation');
    expect(template).toContain('Do not claim proposal readiness until those scope-affecting questions are resolved or explicitly deferred by the user');
  });

  it('supports repeated independent concept sweeps', () => {
    expect(template).toContain('the user introduces a new module, workflow, command, configuration key, project concept, or unfamiliar domain term');
    expect(template).toContain('delegate it to a subagent');
    expect(template).toContain('Do not read `openspec-impact-sweeper/SKILL.md` directly in the main agent');
    expect(template).toContain('Treat each new concept as an independent sweep');
    expect(template).toContain('even if another concept was already swept earlier in the conversation');
  });

  it('passes the lightweight sweeper input fields', () => {
    expect(template).toContain('projectRoot');
    expect(template).toContain('concept');
    expect(template).toContain('optional `optionalChangeName`');
    expect(template).toContain('optional `knownUserTerms`');
    expect(template).toContain('optional `focus`');
  });

  it('handles terminology decisions before impact questions', () => {
    expect(template).toContain('If the report contains terminology observations, decide before impact questions');
    expect(template).toContain('When the user confirms the terms mean the same concept, record that term group');
    expect(template).toContain('When the user chooses a canonical term, record that canonical term');
    expect(template).toContain('When the user says the terms are different concepts, record the rejected term group');
    expect(template).toContain('For any recorded same-concept, canonical-term, or rejected term group, do not ask again for that same group');
    expect(template).toContain('continue the explore flow');
  });

  it('documents the mandatory six-step brainstorming checklist', () => {
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
    expect(template).toContain('Present it as a visible content block');
    expect(template).toContain('After presenting the Design Summary, STOP');
    expect(template).toContain('Only the user triggers the next workflow');
  });

  it('states the main explore agent is read-only', () => {
    expect(template).toContain('Forbidden');
    expect(template).toContain('Create, edit, delete any file or artifact');
    expect(template).toContain('produce a conversation-only `Design Summary`');
    expect(template).toContain('instruct the user to call `/opsx:propose <change-name>`');
  });

  it('treats design confirmation as direction only', () => {
    expect(template).toContain('User confirmations ("ok", "option 2") approve design direction only, not file modification');
  });

  it('keeps the sweeper report as the only explore write exception', () => {
    expect(template).toContain('Subagent Exception');
    expect(template).toContain('The `openspec-impact-sweeper` subagent may write JSON reports to `openspec/sweeper/`');
    expect(template).toContain('The main explore agent remains read-only');
  });

  it('routes active-change insights to future capture targets', () => {
    expect(template).toContain('Future Capture Target');
    expect(template).toContain('Observable behavior requirement');
    expect(template).toContain('Observable behavior changed');
    expect(template).toContain('Refactor rationale or rejected path');
    expect(template).toContain('Implementation strategy');
    expect(template).toContain('OPSX graph intent changed');
    expect(template).toContain('This is observable behavior for `specs/<capability>/spec.md`; include it in the Design Summary');
    expect(template).toContain('That is a design decision for `design.md`; include it in the Design Summary');
    expect(template).toContain('This changes scope for `proposal.md`; include it in the Design Summary');
  });

  it('uses the generated superpowers reference as the authoritative behavior guide', () => {
    expect(template).toContain('## Required References');
    expect(template).toContain('openspec/references/openspec-explore-supperpowers-style.md');
    expect(template).toContain('authoritative Superpowers brainstorming behavior guide');
    expect(template).toContain('hard gate, context exploration, visual companion judgment, one-question discipline');
    expect(template).toContain('Do not reconstruct or duplicate Superpowers behavior from this prompt');
  });
});

describe('explore supperpowers-style reference', () => {
  it('declares supperpowers-style reference with Superpowers brainstorming discipline', () => {
    const template = getExploreSkillTemplate();
    const ref = (template.referenceFiles || []).find(f => f.path === 'references/explore-supperpowers-style.md');

    expect(ref).toBeDefined();
    expect(ref?.content).toContain('Superpowers brainstorming');
    expect(ref?.content).toContain('Hard gate before implementation');
    expect(ref?.content).toContain('Project context exploration');
    expect(ref?.content).toContain('Just-in-time visual companion');
    expect(ref?.content).toContain('One-question discipline');
    expect(ref?.content).toContain('2-3 approaches');
    expect(ref?.content).toContain('Section-by-section design approval');
    expect(ref?.content).toContain('Design Summary self-review');
    expect(ref?.content).toContain('User review gate');
    expect(ref?.content).toContain('openspec-propose handoff');
  });

  it('preserves the Superpowers design-before-implementation gate', () => {
    const template = getExploreSkillTemplate();
    const ref = (template.referenceFiles || []).find(f => f.path === 'references/explore-supperpowers-style.md');

    expect(ref).toBeDefined();
    expect(ref?.content).toContain('Do not implement before design confirmation is complete');
    expect(ref?.content).toContain('Simple changes still require design confirmation');
    expect(ref?.content).toContain('Only route to openspec-propose after the user reviews and accepts the Design Summary');
  });

  it('reference content routes to propose instead of direct writes', () => {
    const template = getExploreSkillTemplate();
    const ref = (template.referenceFiles || []).find(f => f.path === 'references/explore-supperpowers-style.md');

    expect(ref).toBeDefined();
    // Should NOT contain old direct-write phrasing
    expect(ref?.content).not.toContain('Want me to create a proposal');
    expect(ref?.content).not.toContain('I can create a change proposal');
    expect(ref?.content).not.toContain('Updated design.md');
    expect(ref?.content).not.toContain('write design doc');
    expect(ref?.content).not.toContain('commit the design document');
    expect(ref?.content).not.toContain('invoke writing-plans');

    // Should route to propose by logical workflow name, not tool-specific syntax.
    expect(ref?.content).toContain('openspec-propose');
    expect(ref?.content).not.toContain('$openspec-propose');
    expect(ref?.content).not.toContain('/opsx:propose');
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
