# Workflows

This guide covers the current OpenSpec workflow surface.

> [!NOTE]
> OpenSpec's managed workflow surface is **skills-only**. Older slash command files may still exist on disk, but OpenSpec no longer generates, refreshes, or removes them.

## Current Surface

- `/opsx:propose`
- `/opsx:explore`
- `/opsx:apply`
- `/opsx:archive`
- `/opsx:bootstrap-opsx`
- `/opsx:snack`

## Typical Flows

### Fast Path

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

Use this when the request is already clear.

### Explore First

```text
/opsx:explore ──► /opsx:propose ──► /opsx:apply ──► /opsx:archive
```

Use this when the problem needs investigation before artifact generation.

### Code-First Backfill

```text
/opsx:snack ──► /opsx:archive
```

Use this when code already exists and you need to back-fill proposal, specs, and OPSX delta.

## Archive Contract

`/opsx:archive` is the completion gate:

- it requires a fresh full verify result
- it re-runs full verify when evidence is missing or stale
- it performs archive-time spec and OPSX sync inline

## Notes

- Use `/opsx:apply <change-name>` when multiple active changes exist
- Use `/opsx:bootstrap-opsx` to create initial OPSX structure for an existing codebase
- Use `/opsx:explore` before `/opsx:propose` when requirements are unclear
