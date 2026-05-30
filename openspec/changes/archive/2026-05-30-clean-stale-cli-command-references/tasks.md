## 1. Audit

- [x] 1.1 Record the current CLI surface from `openspec --help`, `openspec verify --help`, `openspec validate --help`, `openspec archive --help`, `openspec sync --help`, and `openspec bootstrap --help`
- [x] 1.2 Scan active docs, specs, workflow templates, generated skills, commands, and prompts for stale command forms
- [x] 1.3 Separate active stale references from `openspec/changes/archive/**` historical occurrences

## 2. Cleanup

- [x] 2.1 Update active user-facing docs that reference removed command forms
- [x] 2.2 Update generated Agent instruction files only where they are current user-facing surfaces
- [x] 2.3 Update source templates or fragments that can regenerate stale command references
- [x] 2.4 Preserve valid `openspec verify phase1|phase2|seal|status` references

## 3. Verification

- [x] 3.1 Re-run stale-reference search for active surfaces and confirm no removed command forms remain
- [x] 3.2 Report any remaining archive-only occurrences separately
- [x] 3.3 Run `openspec validate clean-stale-cli-command-references --type change --json`
- [x] 3.4 Run the relevant documentation or generation tests if existing test coverage targets these surfaces
