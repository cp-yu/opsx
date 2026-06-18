# OPSX Workflow

OpenSpec's managed workflow surface is skills-only.

## Surface

- `/opsx:propose`
- `/opsx:explore`
- `/opsx:apply`
- `/opsx:archive`
- `/opsx:bootstrap-opsx`
- `/opsx:snack`

`/opsx:archive` runs the full verify gate before archive and performs archive-time sync inline.

## Notes

- Legacy slash command files may still exist on disk
- OpenSpec no longer generates, refreshes, or removes them
