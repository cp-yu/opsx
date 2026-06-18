# Commands

OpenSpec's active workflow surface is skills-only. Older slash command files may still exist on disk, but OpenSpec no longer generates or refreshes them.

## Current Surface

| Command | Purpose |
|---|---|
| `/opsx:propose` | Create a change and generate planning artifacts in one step |
| `/opsx:explore` | Think through ideas before committing to a change |
| `/opsx:apply` | Implement tasks from the change |
| `/opsx:archive` | Archive a completed change |
| `/opsx:bootstrap-opsx` | Bootstrap OPSX architecture tracking from an existing codebase |
| `/opsx:snack` | Back-fill specs and OPSX delta from code changes |

`/opsx:archive` runs the full verify gate before archive and performs archive-time sync inline.

## Current Commands

### `/opsx:propose`

Create a new change and generate planning artifacts in one step.

```text
/opsx:propose [change-name-or-description]
```

### `/opsx:explore`

Think through ideas, investigate problems, and clarify requirements.

```text
/opsx:explore [topic]
```

### `/opsx:apply`

Implement tasks from the change.

```text
/opsx:apply [change-name]
```

### `/opsx:archive`

Archive a completed change.

```text
/opsx:archive [change-name]
```

### `/opsx:bootstrap-opsx`

Bootstrap OPSX architecture tracking from an existing codebase.

```text
/opsx:bootstrap-opsx
```

### `/opsx:snack`

Back-fill specs and OPSX delta from code changes.

```text
/opsx:snack [change-name]
```

## Legacy Files

Older workflow command files may still exist on disk as historical artifacts only.
