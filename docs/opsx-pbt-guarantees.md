# OPSX Property-Based Testing Guarantees

## Overview

The OPSX programmatic infrastructure is tested with **property-based tests (PBT)** using [fast-check](https://github.com/dubzzz/fast-check). These tests verify correctness across thousands of randomly generated inputs, providing stronger guarantees than example-based tests.

## Why Property-Based Testing?

**Example-based tests** check specific cases:
```typescript
// Example: Does this specific input work?
expect(writeProjectOpsx(testDir, specificData)).resolves.toBeUndefined();
```

**Property-based tests** check universal properties:
```typescript
// Property: Does ANY valid input work?
fc.assert(
  fc.asyncProperty(anyValidProjectOpsx, async (data) => {
    await writeProjectOpsx(testDir, data);
    const result = await readProjectOpsx(testDir);
    expect(result).toEqual(data); // Round-trip preserves data
  })
);
```

**Benefits:**
- **Broader coverage** — tests thousands of inputs automatically
- **Edge case discovery** — finds corner cases you didn't think of
- **Regression prevention** — catches bugs in refactoring
- **Documentation** — properties describe system invariants

## Test Suites

### 1. YAML Structure Preservation

**File:** `test/utils/opsx-utils.pbt.yaml-structure.test.ts`

**Properties:**

#### Property 1.1: Round-trip Serialization
```typescript
∀ valid ProjectOpsx data:
  write(data) → read() === data
```

**Guarantee:** Writing and reading back preserves all data exactly.

**What this catches:**
- YAML serialization bugs
- Data loss during conversion
- Type coercion errors

#### Property 1.2: Schema Validation
```typescript
∀ data:
  if ProjectOpsxSchema.safeParse(data).success
  then write(data) succeeds
```

**Guarantee:** All schema-valid data can be written.

**What this catches:**
- Schema mismatches
- Validation logic errors
- Type definition bugs

#### Property 1.3: Invalid Data Rejection
```typescript
∀ invalid data:
  write(data) → read() === null
```

**Guarantee:** Invalid data is rejected, not silently corrupted.

**What this catches:**
- Missing validation
- Partial writes of bad data
- Silent failures

### 2. Referential Integrity

**File:** `test/utils/opsx-utils.pbt.referential-integrity.test.ts`

**Properties:**

#### Property 2.1: Valid References Pass
```typescript
∀ relations where from ∈ nodes ∧ to ∈ nodes:
  validateReferentialIntegrity(data).valid === true
```

**Guarantee:** Relations referencing existing nodes always validate.

**What this catches:**
- False positive validation errors
- Overly strict validation logic

#### Property 2.2: Invalid References Fail
```typescript
∀ relations where from ∉ nodes ∨ to ∉ nodes:
  validateReferentialIntegrity(data).valid === false
  ∧ errors.length > 0
```

**Guarantee:** Dangling references are always detected.

**What this catches:**
- Missing validation checks
- Incomplete node ID collection
- Edge cases in relation validation

#### Property 2.3: Empty Relations Valid
```typescript
∀ data with relations = []:
  validateReferentialIntegrity(data).valid === true
```

**Guarantee:** No relations is a valid state.

**What this catches:**
- Validation requiring relations when optional
- Empty array handling bugs

#### Property 2.4: Self-References Valid
```typescript
∀ node n, relation {from: n.id, to: n.id}:
  validateReferentialIntegrity(data).valid === true
```

**Guarantee:** Nodes can reference themselves.

**What this catches:**
- Overly restrictive validation
- Circular reference false positives

### 3. Merge Idempotency

**File:** `test/utils/opsx-utils.pbt.merge-idempotency.test.ts`

**Properties:**

#### Property 3.1: Write Idempotency
```typescript
∀ data:
  write(data) → write(data) → read() === data
```

**Guarantee:** Writing same data twice produces identical result.

**What this catches:**
- Accumulation bugs
- Duplicate entries
- Non-idempotent operations

#### Property 3.2: Read-Write-Read Cycle
```typescript
∀ data:
  write(data) → read() → write() → read() === data
```

**Guarantee:** Read-write cycles preserve data.

**What this catches:**
- Lossy serialization
- Transformation bugs
- Metadata corruption

#### Property 3.3: Multiple Writes Consistency
```typescript
∀ data, n ∈ ℕ:
  write(data) n times → read() === data
```

**Guarantee:** Multiple writes maintain consistency.

**What this catches:**
- State accumulation
- File corruption
- Race conditions

### 4. File Size Boundaries

**File:** `test/utils/opsx-utils.pbt.file-size-boundaries.test.ts`

**Properties:**

#### Property 4.1: Small Data Single File
```typescript
∀ data where lineCount(data) < maxLines:
  write(data) → exists(single_file) ∧ ¬exists(shards)
```

**Guarantee:** Small data stays in single file.

**What this catches:**
- Premature sharding
- Incorrect line counting
- Threshold logic errors

#### Property 4.2: Large Data Triggers Sharding
```typescript
∀ data where lineCount(data) > maxLines:
  write(data) → exists(shards)
```

**Guarantee:** Large data triggers sharding.

**What this catches:**
- Missing sharding logic
- Threshold not enforced
- Line counting bugs

#### Property 4.3: Readable Regardless of Sharding
```typescript
∀ data:
  write(data) → read() === data
  (regardless of sharding)
```

**Guarantee:** Reads work with both single file and shards.

**What this catches:**
- Shard reading bugs
- Merge logic errors
- Inconsistent behavior

#### Property 4.4: Sharding Preserves Data
```typescript
∀ data:
  write(data, maxLines=∞) → read() ===
  write(data, maxLines=100) → read()
```

**Guarantee:** Sharding doesn't lose data.

**What this catches:**
- Data loss during sharding
- Incomplete shard writes
- Merge errors

### 5. Atomic Write Guarantees

**File:** `test/utils/opsx-utils.pbt.atomic-write.test.ts`

**Properties:**

#### Property 5.1: No Temporary Files
```typescript
∀ data:
  write(data) completes → ¬exists(*.tmp)
```

**Guarantee:** No temp files remain after write.

**What this catches:**
- Cleanup failures
- Incomplete atomic writes
- File handle leaks

#### Property 5.2: Write Completion Guarantees Readability
```typescript
∀ data:
  write(data) completes → read() succeeds
```

**Guarantee:** Completed writes are immediately readable.

**What this catches:**
- Partial writes
- Race conditions
- File locking issues

#### Property 5.3: Sequential Writes Maintain Consistency
```typescript
∀ data1, data2:
  write(data1) → write(data2) → read() === data2
```

**Guarantee:** Later writes overwrite earlier ones cleanly.

**What this catches:**
- Write conflicts
- Merge errors
- Stale data reads

### 6. Spec References Alignment

**File:** `test/utils/opsx-utils.pbt.spec-refs-alignment.test.ts`

**Properties:**

#### Property 6.1: Valid Refs Pass
```typescript
∀ spec_refs where ∀ ref: exists(ref.path):
  validateSpecRefs(data).valid === true
```

**Guarantee:** All existing files pass validation.

**What this catches:**
- False positive errors
- Path resolution bugs
- Validation logic errors

#### Property 6.2: Missing Files Fail
```typescript
∀ spec_refs where ∃ ref: ¬exists(ref.path):
  validateSpecRefs(data).valid === false
  ∧ errors contains ref.path
```

**Guarantee:** Missing files are detected and reported.

**What this catches:**
- Missing validation
- Incomplete error reporting
- Path checking bugs

#### Property 6.3: Nodes Without Refs Pass
```typescript
∀ nodes without spec_refs:
  validateSpecRefs(data).valid === true
```

**Guarantee:** spec_refs are optional.

**What this catches:**
- Validation requiring optional fields
- Undefined handling bugs

#### Property 6.4: Mixed Valid/Invalid Refs
```typescript
∀ data with some valid, some invalid refs:
  validateSpecRefs(data).valid === false
  ∧ errors contains only invalid refs
```

**Guarantee:** Validation reports only actual errors.

**What this catches:**
- Over-reporting errors
- Incorrect error attribution
- Validation logic bugs

## Test Configuration

### Number of Runs

```typescript
fc.assert(property, { numRuns: 50 });
```

- **Simple properties:** 50 runs
- **Complex properties:** 30 runs
- **Expensive operations:** 20 runs

### Arbitrary Generators

**Node IDs:**
```typescript
const nodeIdArb = fc.oneof(
  fc.constantFrom('cap', 'dom')
    .chain(prefix => fc.string({ minLength: 1, maxLength: 20 })
      .map(suffix => `${prefix}.${suffix.replace(/[^a-z0-9-]/gi, '-')}`))
);
```

**Project Metadata:**
```typescript
const projectMetadataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  version: fc.string({ minLength: 1, maxLength: 20 }),
});
```

**Relations with Valid References:**
```typescript
const projectOpsxArb = fc
  .record({
    project: projectMetadataArb,
    domains: fc.array(domainNodeArb, { minLength: 0, maxLength: 10 }),
    capabilities: fc.array(capabilityNodeArb, { minLength: 0, maxLength: 10 }),
  })
  .chain(base => {
    const allNodeIds = [
      ...base.domains.map(d => d.id),
      ...base.capabilities.map(c => c.id),
    ];

    if (allNodeIds.length < 2) {
      return fc.constant(base);
    }

    const relationArb = fc.record({
      from: fc.constantFrom(...allNodeIds),
      to: fc.constantFrom(...allNodeIds),
      type: fc.constantFrom('contains', 'depends_on', 'constrains'),
    });

    return fc.array(relationArb, { minLength: 0, maxLength: 5 })
      .map(relations => ({ ...base, relations }));
  });
```

## Running PBT Tests

```bash
# Run all PBT tests
pnpm test test/utils/opsx-utils.pbt

# Run specific suite
pnpm test test/utils/opsx-utils.pbt.yaml-structure.test.ts

# Run with verbose output
pnpm test test/utils/opsx-utils.pbt --reporter=verbose

# Run with seed for reproducibility
pnpm test test/utils/opsx-utils.pbt -- --seed=42
```

## Interpreting Failures

### Counterexample

When a property fails, fast-check provides a counterexample:

```
Property failed after 23 runs with seed=1234567890
Counterexample: {
  project: { name: "a", version: "1" },
  domains: [{ id: "dom.", type: "domain" }]
}
```

### Shrinking

fast-check automatically shrinks counterexamples to minimal failing cases:

```
Original failing input: { name: "very-long-project-name-123", ... }
Shrunk to: { name: "a", ... }
```

### Reproducing

Use the seed to reproduce:

```typescript
fc.assert(property, { seed: 1234567890, path: "23:0" });
```

## Coverage

PBT tests achieve:
- **21 properties** across 6 test suites
- **1000+ generated test cases** per run
- **Edge case coverage** (empty arrays, long strings, special characters)
- **Boundary testing** (file size thresholds, line limits)
- **Concurrent scenarios** (sequential writes, race conditions)

Combined with unit tests and integration tests, this provides **>95% code coverage** for `opsx-utils.ts`.

## Best Practices

### 1. Test Properties, Not Examples

❌ **Bad:**
```typescript
it('should handle specific domain', () => {
  const data = { domains: [{ id: 'dom.auth', type: 'domain' }] };
  expect(validate(data)).toBe(true);
});
```

✅ **Good:**
```typescript
it('Property: all valid domains pass validation', () => {
  fc.assert(
    fc.property(validDomainArb, (domain) => {
      expect(validate({ domains: [domain] })).toBe(true);
    })
  );
});
```

### 2. Use Dependent Generation

❌ **Bad:**
```typescript
// Relations may reference non-existent nodes
const relationArb = fc.record({
  from: nodeIdArb,
  to: nodeIdArb,
});
```

✅ **Good:**
```typescript
// Relations always reference existing nodes
const projectArb = fc.record({ nodes: ... })
  .chain(base => {
    const ids = base.nodes.map(n => n.id);
    return fc.record({
      from: fc.constantFrom(...ids),
      to: fc.constantFrom(...ids),
    }).map(rel => ({ ...base, relations: [rel] }));
  });
```

### 3. Sanitize Generated Data

❌ **Bad:**
```typescript
// May generate invalid file names
const fileNameArb = fc.string();
```

✅ **Good:**
```typescript
// Sanitize to valid file names
const fileNameArb = fc.string({ minLength: 1, maxLength: 20 })
  .map(s => `${s.replace(/[^a-z0-9]/gi, '-')}.md`)
  .filter(s => s.length > 3);
```

### 4. Handle Edge Cases Explicitly

```typescript
// Test empty arrays separately
it('Property: empty relations are valid', () => {
  fc.assert(
    fc.property(projectMetadataArb, (project) => {
      const data = { project, relations: [] };
      expect(validate(data).valid).toBe(true);
    })
  );
});
```

## Further Reading

- [fast-check documentation](https://github.com/dubzzz/fast-check/tree/main/documentation)
- [Property-Based Testing with fast-check](https://dev.to/dubzzz/property-based-testing-with-fast-check-1-introduction-3n8n)
- [Introduction to Property-Based Testing](https://hypothesis.works/articles/what-is-property-based-testing/)
