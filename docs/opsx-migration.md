# OPSX Migration Guide

## Overview

This guide helps you migrate from the old OPSX path structure to the new standardized location.

## What Changed

### Old Structure (Before)
```
project-root/
├── project.opsx.yaml          # ❌ Root level
└── openspec/
    └── changes/
```

### New Structure (After)
```
project-root/
└── openspec/
    ├── project.opsx.yaml      # ✅ Inside openspec/
    ├── project.opsx.dom.*.yaml (if sharded)
    └── changes/
```

## Why This Change?

**Benefits:**
1. **Consistency** — all OpenSpec artifacts in one directory
2. **Cleaner root** — less clutter in project root
3. **Better organization** — easier to find and manage
4. **Tooling alignment** — matches other OpenSpec conventions

## Migration Steps

### Automatic Migration

The easiest way is to let OpenSpec handle it:

```bash
# Run this in your project root
openspec migrate opsx-path
```

This will:
1. Check if `project.opsx.yaml` exists at root
2. Move it to `openspec/project.opsx.yaml`
3. Move any shards (`project.opsx.dom.*.yaml`)
4. Update internal references
5. Verify integrity after migration

### Manual Migration

If you prefer manual control:

#### Step 1: Move Files

```bash
# Move main file
mv project.opsx.yaml openspec/project.opsx.yaml

# Move shards (if any)
mv project.opsx.dom.*.yaml openspec/
```

#### Step 2: Verify Structure

```bash
# Check that files are in the right place
ls -la openspec/project.opsx.yaml
ls -la openspec/project.opsx.dom.*.yaml
```

#### Step 3: Validate Integrity

```bash
# Ensure nothing broke
openspec verify --opsx
```

#### Step 4: Update Git

```bash
# Stage the changes
git add openspec/project.opsx.yaml
git add openspec/project.opsx.dom.*.yaml
git rm project.opsx.yaml
git rm project.opsx.dom.*.yaml

# Commit
git commit -m "chore: migrate OPSX files to openspec/ directory"
```

## Handling Active Changes

If you have active changes with `opsx-delta.yaml`:

### Option 1: Migrate Before Archiving

```bash
# 1. Migrate the main file
openspec migrate opsx-path

# 2. Archive active changes (they'll use new path)
openspec archive --change "your-change"
```

### Option 2: Archive First, Then Migrate

```bash
# 1. Archive all active changes
openspec bulk-archive

# 2. Migrate the main file
openspec migrate opsx-path
```

**Recommendation:** Use Option 1 to ensure deltas merge correctly.

## Troubleshooting

### Issue: "File not found" after migration

**Cause:** Old path still referenced somewhere.

**Fix:**
```bash
# Search for old references
rg "project\.opsx\.yaml" --type yaml

# Update any hardcoded paths in config
vim openspec/config.yaml
```

### Issue: Shards not found

**Cause:** Shards weren't moved with main file.

**Fix:**
```bash
# Find any remaining shards at root
ls project.opsx.dom.*.yaml

# Move them
mv project.opsx.dom.*.yaml openspec/
```

### Issue: Validation fails after migration

**Cause:** File corruption or incomplete move.

**Fix:**
```bash
# Check file integrity
cat openspec/project.opsx.yaml | head -20

# If corrupted, restore from git
git checkout HEAD -- project.opsx.yaml
mv project.opsx.yaml openspec/

# Re-validate
openspec verify --opsx
```

### Issue: Git shows file as deleted and added

**Cause:** Git doesn't recognize it as a move.

**Fix:**
```bash
# Use git mv instead
git mv project.opsx.yaml openspec/project.opsx.yaml
git commit -m "chore: migrate OPSX to openspec/ directory"
```

## Backward Compatibility

### Reading Old Paths

The system still reads from old paths for backward compatibility:

```typescript
// Priority order:
1. openspec/project.opsx.yaml  (new, preferred)
2. project.opsx.yaml           (old, deprecated)
```

**Warning:** This fallback will be removed in a future version.

### Writing Always Uses New Path

All write operations use the new path:

```typescript
// Always writes to openspec/project.opsx.yaml
await writeProjectOpsx(projectRoot, data);
```

## Team Migration

For teams with multiple developers:

### Step 1: Coordinate

```bash
# Announce migration in team chat
"Migrating OPSX files to openspec/ directory.
Please pull latest changes after migration."
```

### Step 2: Migrate on Main Branch

```bash
# On main branch
git checkout main
git pull

# Migrate
openspec migrate opsx-path

# Push
git push origin main
```

### Step 3: Update Feature Branches

```bash
# On feature branches
git checkout feature-branch
git rebase main

# Resolve any conflicts (should be minimal)
```

### Step 4: Update CI/CD

If your CI references the old path:

```yaml
# .github/workflows/ci.yml
# Before
- run: cat project.opsx.yaml

# After
- run: cat openspec/project.opsx.yaml
```

## Verification Checklist

After migration, verify:

- [ ] `openspec/project.opsx.yaml` exists
- [ ] Old `project.opsx.yaml` removed from root
- [ ] All shards moved (if applicable)
- [ ] `openspec verify --opsx` passes
- [ ] Active changes still work
- [ ] Git history preserved (if using `git mv`)
- [ ] Team members notified
- [ ] CI/CD updated (if needed)

## Rollback

If something goes wrong:

```bash
# Restore from git
git checkout HEAD -- project.opsx.yaml
git checkout HEAD -- openspec/project.opsx.yaml

# Or revert the commit
git revert <commit-hash>
```

## FAQ

### Q: Do I have to migrate?

**A:** Not immediately, but it's recommended. The old path still works but is deprecated.

### Q: Will this break my workflow?

**A:** No. All commands work the same way. Only the file location changes.

### Q: What about archived changes?

**A:** Archived changes are not affected. They stay in `openspec/changes/archive/`.

### Q: Can I migrate gradually?

**A:** No. The file must be in one location. Use the migration command to move it atomically.

### Q: What if I have custom tooling?

**A:** Update your tools to use `openspec/project.opsx.yaml` instead of `project.opsx.yaml`.

### Q: Does this affect the dashboard?

**A:** No. The dashboard automatically detects the correct path.

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Search [GitHub issues](https://github.com/Fission-AI/openspec/issues)
3. Ask on [Discord](https://discord.gg/YctCnvvshC)
4. Open a new issue with:
   - Your OpenSpec version (`openspec --version`)
   - Error messages
   - Steps to reproduce

## Related Documentation

- [OPSX Integration](opsx-integration.md) — Understanding the OPSX system
- [OPSX Bootstrap](opsx-bootstrap.md) — Creating initial structure
- [Commands](commands.md) — CLI reference
