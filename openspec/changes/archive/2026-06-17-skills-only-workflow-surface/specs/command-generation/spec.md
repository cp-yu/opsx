## REMOVED Requirements

### Requirement: CommandContent interface

**Reason**: Workflow delivery no longer generates command artifacts.
**Migration**: Use workflow skill templates and `SkillTemplate` content for generated workflow surfaces.

### Requirement: ToolCommandAdapter interface

**Reason**: Adapter-backed command generation is no longer an active workflow delivery path.
**Migration**: Tool metadata SHALL describe skills paths and optional skill invocation guidance instead of command adapter behavior.

### Requirement: Command generator function

**Reason**: Active workflow artifact generation is skills-only.
**Migration**: Use manifest-derived skill generation for workflow artifacts.

### Requirement: CommandAdapterRegistry

**Reason**: Active workflow artifact generation no longer resolves command adapters.
**Migration**: Use tool profile metadata for skills generation.

### Requirement: Shared command body content

**Reason**: There are no generated command bodies to keep in parity.
**Migration**: Shared workflow instructions are maintained through generated skills.
