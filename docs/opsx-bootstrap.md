# OPSX Bootstrap Workflow

## Overview

The bootstrap workflow generates an initial `project.opsx.yaml` structure from your existing codebase. This is useful for:

- **Existing projects** — add OPSX tracking to brownfield codebases
- **Migration** — transition from manual documentation to automated tracking
- **Onboarding** — help new team members understand system architecture

## When to Use Bootstrap

**Use bootstrap when:**
- Starting with OpenSpec on an existing project
- You have code but no OPSX structure
- You want to document current architecture

**Don't use bootstrap when:**
- Starting a new project (use `/opsx:propose` instead)
- You already have `project.opsx.yaml`
- You prefer manual structure creation

## Running Bootstrap

```bash
# In your AI coding assistant
/opsx:bootstrap
```

The AI will:
1. **Analyze codebase** — scan directory structure, exports, imports
2. **Discover domains** — identify logical boundaries
3. **Find capabilities** — detect functions, classes, APIs
4. **Generate structure** — create `[DRAFT] project.opsx.yaml`
5. **Request review** — ask you to verify and refine

## What Gets Generated

### Minimal Example

For a simple project:

```yaml
# openspec/project.opsx.yaml
project:
  name: my-app
  version: 1.0.0
  description: "[DRAFT] Generated from codebase analysis"

domains:
  - id: dom.core
    type: domain
    intent: Core application logic
    code_refs:
      - path: src/core/

  - id: dom.api
    type: domain
    intent: API endpoints
    code_refs:
      - path: src/api/
```

### Full Example

For a more complex project:

```yaml
project:
  name: ecommerce-platform
  version: 2.1.0
  description: "[DRAFT] E-commerce platform with auth, products, orders"

domains:
  - id: dom.auth
    type: domain
    intent: User authentication and authorization
    code_refs:
      - path: src/auth/
      - path: src/middleware/auth.ts

  - id: dom.products
    type: domain
    intent: Product catalog and inventory
    code_refs:
      - path: src/products/
      - path: src/inventory/

  - id: dom.orders
    type: domain
    intent: Order processing and fulfillment
    code_refs:
      - path: src/orders/
      - path: src/payments/

capabilities:
  - id: cap.auth.login
    type: capability
    intent: User login with email/password
    code_refs:
      - path: src/auth/login.ts
        line_start: 15
        line_end: 45

  - id: cap.auth.register
    type: capability
    intent: New user registration
    code_refs:
      - path: src/auth/register.ts
        line_start: 20
        line_end: 80

  - id: cap.products.search
    type: capability
    intent: Search products by name, category, price
    code_refs:
      - path: src/products/search.ts
        line_start: 10
        line_end: 120

  - id: cap.orders.create
    type: capability
    intent: Create new order from cart
    code_refs:
      - path: src/orders/create.ts
        line_start: 25
        line_end: 150

relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains

  - from: cap.auth.register
    to: dom.auth
    type: contains

  - from: cap.products.search
    to: dom.products
    type: contains

  - from: cap.orders.create
    to: dom.orders
    type: contains

  - from: cap.orders.create
    to: cap.auth.login
    type: depends_on
```

## Review and Refinement

The generated structure is marked `[DRAFT]` because:

1. **AI inference is imperfect** — it guesses based on code patterns
2. **Business context is missing** — only you know the true intent
3. **Relations may be incomplete** — static analysis can't catch everything

### Review Checklist

- [ ] **Domain boundaries** — do they match your mental model?
- [ ] **Capability intents** — are descriptions accurate?
- [ ] **Code references** — do they point to the right files?
- [ ] **Relations** — are dependencies captured correctly?
- [ ] **Missing pieces** — what did the AI miss?

### Common Refinements

**1. Fix domain boundaries**

```yaml
# AI generated (too granular)
domains:
  - id: dom.user.auth
  - id: dom.user.profile
  - id: dom.user.settings

# After refinement (better grouping)
domains:
  - id: dom.user
    intent: User management including auth, profiles, settings
```

**2. Add missing relations**

```yaml
# AI missed this dependency
relations:
  - from: cap.orders.create
    to: cap.products.validate
    type: depends_on
```

**3. Link to existing specs**

```yaml
# Add spec_refs if you have documentation
capabilities:
  - id: cap.auth.login
    spec_refs:
      - path: docs/auth/login.md
      - path: docs/api/auth-endpoints.md
```

**4. Clarify intents**

```yaml
# AI generated (vague)
intent: Handle user data

# After refinement (specific)
intent: Manage user profiles including avatar, bio, preferences, and privacy settings
```

## Incremental Bootstrap

For large codebases, bootstrap in phases:

### Phase 1: Core Domains

```bash
# Focus on main business logic first
/opsx:bootstrap --focus src/core src/api
```

### Phase 2: Add Capabilities

After reviewing domains, add capabilities:

```bash
# Discover capabilities within domains
/opsx:bootstrap --extend --capabilities
```

### Phase 3: Map Relations

Finally, map dependencies:

```bash
# Analyze imports and calls
/opsx:bootstrap --extend --relations
```

## Integration with Existing Specs

If you already have documentation:

### 1. Link Existing Specs

```yaml
domains:
  - id: dom.auth
    spec_refs:
      - path: docs/architecture/auth.md
      - path: docs/api/auth-api.md
```

### 2. Create Missing Specs

For undocumented areas, create specs:

```bash
/opsx:propose document-orders-domain
```

### 3. Verify Alignment

Check that specs match the structure:

```bash
openspec verify --change document-orders-domain
```

## After Bootstrap

Once you've reviewed and refined:

1. **Remove [DRAFT] marker** — edit `project.opsx.yaml` and remove `[DRAFT]` from description
2. **Commit the structure** — `git add openspec/project.opsx.yaml && git commit`
3. **Start using OPSX** — new changes will now update this structure

## Maintenance

### Keeping Structure Updated

**During development:**
- `/opsx:propose` generates deltas automatically
- `/opsx:archive` merges deltas into `project.opsx.yaml`

**Periodic review:**
```bash
# Check for drift
openspec verify --all

# Regenerate if needed
/opsx:bootstrap --refresh
```

### Handling Refactors

When you refactor code:

1. **Update code_refs** — point to new file locations
2. **Adjust relations** — reflect new dependencies
3. **Validate** — ensure referential integrity

```bash
# After refactor
openspec verify --check-refs
```

## Troubleshooting

### "Too many domains generated"

**Problem:** AI created 50+ domains for a medium project.

**Solution:** Consolidate related domains:

```yaml
# Before (too granular)
- id: dom.user.auth
- id: dom.user.profile
- id: dom.user.settings
- id: dom.user.preferences

# After (consolidated)
- id: dom.user
  intent: User management (auth, profile, settings, preferences)
```

### "Missing key capabilities"

**Problem:** AI didn't detect important functions.

**Solution:** Add them manually:

```yaml
capabilities:
  - id: cap.payment.process
    type: capability
    intent: Process credit card payments via Stripe
    code_refs:
      - path: src/payments/stripe.ts
        line_start: 45
        line_end: 120
```

### "Relations are incomplete"

**Problem:** Static analysis missed runtime dependencies.

**Solution:** Add relations based on your knowledge:

```yaml
relations:
  # AI missed this because it's a runtime dependency
  - from: cap.orders.create
    to: cap.inventory.reserve
    type: depends_on
```

### "Code refs are wrong"

**Problem:** AI pointed to wrong files or line numbers.

**Solution:** Fix the references:

```yaml
# Before (wrong)
code_refs:
  - path: src/old-location/auth.ts

# After (correct)
code_refs:
  - path: src/auth/login.ts
    line_start: 15
    line_end: 45
```

## Best Practices

1. **Start small** — bootstrap core domains first, expand later
2. **Review immediately** — don't let [DRAFT] structure sit unreviewed
3. **Link existing docs** — add `spec_refs` to leverage current documentation
4. **Validate often** — run `openspec verify` after changes
5. **Iterate** — refine structure as you learn more about the codebase

## Examples

### Monorepo Bootstrap

```yaml
project:
  name: my-monorepo
  version: 1.0.0

domains:
  - id: dom.frontend
    code_refs:
      - path: packages/web/
      - path: packages/mobile/

  - id: dom.backend
    code_refs:
      - path: packages/api/
      - path: packages/workers/

  - id: dom.shared
    code_refs:
      - path: packages/common/
      - path: packages/types/
```

### Microservices Bootstrap

```yaml
project:
  name: microservices-platform
  version: 2.0.0

domains:
  - id: dom.auth-service
    code_refs:
      - path: services/auth/

  - id: dom.user-service
    code_refs:
      - path: services/users/

  - id: dom.order-service
    code_refs:
      - path: services/orders/

relations:
  - from: dom.order-service
    to: dom.user-service
    type: depends_on

  - from: dom.order-service
    to: dom.auth-service
    type: depends_on
```

## Next Steps

After bootstrap:

1. **Create your first change** — `/opsx:propose <feature>`
2. **See delta generation** — check `openspec/changes/<name>/opsx-delta.yaml`
3. **Implement and archive** — `/opsx:apply` then `/opsx:archive`
4. **Watch structure grow** — `project.opsx.yaml` stays in sync

## Feedback

Bootstrap workflow is experimental. Found issues? Have ideas? Join us on [Discord](https://discord.gg/YctCnvvshC).
