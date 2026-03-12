# OPSX Programmatic Integration

## Overview

OpenSpec now includes **programmatic OPSX infrastructure** that maintains a machine-readable representation of your project's architecture alongside human-readable specs.

**Key file:** `openspec/project.opsx.yaml`

This file tracks:
- **Domains** — logical boundaries in your system
- **Capabilities** — what your system can do
- **Relations** — how components connect
- **Code references** — links to implementation
- **Spec references** — links to documentation

## Why This Exists

**Problem:** Specs drift from code. Documentation becomes outdated. Architecture knowledge lives only in people's heads.

**Solution:** Maintain a single source of truth that:
1. **Stays in sync** — updated automatically during changes
2. **Validates integrity** — catches broken references and inconsistencies
3. **Enables automation** — machine-readable for tooling
4. **Guides AI** — provides context for code generation

## File Structure

### Single File Mode (Default)

For small projects, everything lives in one file:

```yaml
# openspec/project.opsx.yaml
project:
  name: my-app
  version: 1.0.0

domains:
  - id: dom.auth
    type: domain
    intent: User authentication and authorization
    code_refs:
      - path: src/auth/index.ts
        line_start: 1

capabilities:
  - id: cap.auth.login
    type: capability
    intent: User login with email/password
    code_refs:
      - path: src/auth/login.ts
        line_start: 15
        line_end: 45
    spec_refs:
      - path: specs/auth/login.md

relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains
```

### Sharded Mode (Automatic)

When the file exceeds 1000 lines, it automatically shards by domain:

```
openspec/
├── project.opsx.yaml          # Metadata + relations
├── project.opsx.dom.auth.yaml # Auth domain nodes
└── project.opsx.dom.api.yaml  # API domain nodes
```

**You don't manage this manually** — the system handles sharding transparently.

## Node Types

### Domains

Logical boundaries in your system:

```yaml
domains:
  - id: dom.auth           # Must start with 'dom.'
    type: domain
    intent: Authentication and authorization
    code_refs:
      - path: src/auth/
    spec_refs:
      - path: specs/auth/
```

### Capabilities

What your system can do:

```yaml
capabilities:
  - id: cap.user.create    # Must start with 'cap.'
    type: capability
    intent: Create new user account
    code_refs:
      - path: src/users/create.ts
        line_start: 20
        line_end: 85
    spec_refs:
      - path: specs/users/create-user.md
```

### Relations

How components connect:

```yaml
relations:
  - from: cap.user.create
    to: dom.user
    type: contains         # Capability belongs to domain

  - from: cap.user.create
    to: cap.email.send
    type: depends_on       # Needs email capability

  - from: cap.user.create
    to: req.gdpr.consent
    type: constrains       # Must satisfy GDPR
```

**Relation types:**
- `contains` — hierarchical ownership
- `depends_on` — runtime dependency
- `constrains` — requirement/constraint
- `implemented_by` — code implements spec
- `verified_by` — test verifies behavior
- `relates_to` — general association

## Workflow Integration

### During `/opsx:propose`

When you propose a change, the system generates `opsx-delta.yaml`:

```yaml
# openspec/changes/add-auth/opsx-delta.yaml
ADDED:
  domains:
    - id: dom.auth
      type: domain
      intent: Authentication domain

  capabilities:
    - id: cap.auth.login
      type: capability
      intent: User login

  relations:
    - from: cap.auth.login
      to: dom.auth
      type: contains
```

### During `/opsx:apply`

The system:
1. **Loads context** — reads `project.opsx.yaml` to understand existing architecture
2. **Guides implementation** — shows how new code fits into the system
3. **Updates references** — adds `code_refs` as you implement

### During `/opsx:archive`

The system:
1. **Merges delta** — applies changes from `opsx-delta.yaml` to `project.opsx.yaml`
2. **Validates integrity** — ensures all references are valid
3. **Checks alignment** — verifies specs match the delta

## Validation

### Referential Integrity

All relations must reference existing nodes:

```yaml
# ✅ Valid
relations:
  - from: cap.auth.login  # Exists in capabilities
    to: dom.auth          # Exists in domains
    type: contains

# ❌ Invalid
relations:
  - from: cap.auth.login
    to: dom.nonexistent   # Error: node not found
    type: contains
```

### Spec References

All `spec_refs` must point to existing files:

```yaml
# ✅ Valid
capabilities:
  - id: cap.auth.login
    spec_refs:
      - path: specs/auth/login.md  # File exists

# ❌ Invalid
capabilities:
  - id: cap.auth.login
    spec_refs:
      - path: specs/missing.md     # Error: file not found
```

## Bootstrap Workflow

For existing projects without OPSX structure:

```bash
# Generate initial project.opsx.yaml from codebase
/opsx:bootstrap
```

This creates a **[DRAFT]** structure by:
1. **Discovering domains** — from directory structure
2. **Finding capabilities** — from exports and APIs
3. **Detecting relations** — from imports and calls
4. **Linking code** — adding `code_refs`

**You review and refine** — the AI marks it `[DRAFT]` for your approval.

## Property-Based Testing

The infrastructure is tested with property-based tests that verify:

### YAML Structure Preservation
- Round-trip serialization maintains data
- Schema validation catches invalid structures
- Type safety enforced at runtime

### Referential Integrity
- All relation endpoints exist
- No dangling references
- Circular dependencies detected

### Merge Idempotency
- Writing same data twice produces identical result
- Read-write-read cycle preserves data
- Multiple writes maintain consistency

### File Size Boundaries
- Small data stays in single file
- Large data triggers sharding
- Sharding preserves all data
- Reads work regardless of sharding

### Atomic Write Guarantees
- No partial writes visible
- No temporary files left behind
- Sequential writes maintain consistency

### Spec References Alignment
- Valid refs pass validation
- Missing files fail validation
- Mixed valid/invalid refs report correctly

## Migration Guide

### From Root `project.opsx.yaml`

If you have an old `project.opsx.yaml` at project root:

```bash
# Move to new location
mv project.opsx.yaml openspec/project.opsx.yaml

# Update any hardcoded paths in your code
# Old: path.join(projectRoot, 'project.opsx.yaml')
# New: path.join(projectRoot, 'openspec', 'project.opsx.yaml')
```

The system now uses `openspec/project.opsx.yaml` as the canonical location.

### From Manual OPSX Management

If you've been manually editing OPSX files:

1. **Let the workflow manage it** — use `/opsx:propose` and `/opsx:archive`
2. **Validate your structure** — run `/opsx:verify` to check integrity
3. **Fix any issues** — the validator will report problems

## Best Practices

### 1. Let the Workflow Manage OPSX

**Don't manually edit** `project.opsx.yaml` — let the workflow update it:

```bash
# ✅ Good
/opsx:propose "add user management"
# ... implement ...
/opsx:archive

# ❌ Avoid
# Manually editing project.opsx.yaml
```

### 2. Use Meaningful IDs

```yaml
# ✅ Good
- id: dom.user-management
- id: cap.user.create-account

# ❌ Avoid
- id: dom.thing1
- id: cap.do-stuff
```

### 3. Add Intent Descriptions

```yaml
# ✅ Good
- id: cap.auth.login
  intent: Authenticate user with email/password, create session

# ❌ Avoid
- id: cap.auth.login
  # No intent
```

### 4. Link Code and Specs

```yaml
# ✅ Good
- id: cap.user.create
  code_refs:
    - path: src/users/create.ts
      line_start: 20
      line_end: 85
  spec_refs:
    - path: specs/users/create-user.md

# ❌ Avoid
- id: cap.user.create
  # No references
```

### 5. Validate Before Archiving

```bash
# Always verify before archiving
/opsx:verify
/opsx:archive
```

## Troubleshooting

### "Referential integrity violation"

**Problem:** A relation references a non-existent node.

**Solution:** Check the `from` and `to` IDs in your relations. Ensure all referenced nodes exist in `domains` or `capabilities`.

### "Spec reference not found"

**Problem:** A `spec_refs` path doesn't exist.

**Solution:** Either create the missing spec file or remove the reference.

### "Failed to parse OPSX file"

**Problem:** Invalid YAML syntax.

**Solution:** Check for:
- Proper indentation (2 spaces)
- Quoted strings with special characters
- Valid YAML structure

### "Sharding threshold exceeded"

**Problem:** File is too large but sharding failed.

**Solution:** This is usually automatic. If it fails, check:
- Write permissions in `openspec/` directory
- Disk space available
- No file locks on OPSX files

## API Reference

### Reading OPSX

```typescript
import { readProjectOpsx } from './utils/opsx-utils.js';

const opsx = await readProjectOpsx(projectRoot);
if (opsx) {
  console.log(opsx.domains);
  console.log(opsx.capabilities);
  console.log(opsx.relations);
}
```

### Writing OPSX

```typescript
import { writeProjectOpsx } from './utils/opsx-utils.js';

await writeProjectOpsx(projectRoot, {
  project: { name: 'my-app', version: '1.0.0' },
  domains: [{ id: 'dom.core', type: 'domain' }],
});
```

### Validation

```typescript
import {
  validateReferentialIntegrity,
  validateSpecRefs
} from './utils/opsx-utils.js';

// Check relations
const integrityResult = validateReferentialIntegrity(opsx);
if (!integrityResult.valid) {
  console.error(integrityResult.errors);
}

// Check spec files
const specResult = await validateSpecRefs(projectRoot, opsx);
if (!specResult.valid) {
  console.error(specResult.errors);
}
```

## Next Steps

- Read [OPSX Workflow](./opsx.md) for the full workflow
- See [Bootstrap Guide](./opsx-bootstrap.md) for existing projects
- Check [PBT Properties](./opsx-testing.md) for testing guarantees
