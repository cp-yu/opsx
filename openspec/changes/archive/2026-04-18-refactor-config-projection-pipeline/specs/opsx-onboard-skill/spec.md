## ADDED Requirements

### Requirement: Onboard-guided artifact drafting SHALL consume prompt projection
When `/opsx:onboard` guides users through drafting proposal, specs, design, or tasks artifacts, the skill SHALL consume the same prompt projection contract used by standard artifact workflows.

#### Scenario: Onboarding drafts honor projected prose policy
- **WHEN** onboarding drafts an OpenSpec artifact under project config that defines authoring constraints
- **THEN** the skill SHALL apply the projected prose policy to newly authored natural-language text
- **AND** SHALL preserve canonical artifact structure tokens and normative keywords
