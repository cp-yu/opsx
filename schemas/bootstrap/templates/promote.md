# Bootstrap Promote

Confirm promotion of candidate OPSX files to formal project files.

## Pre-promote Checklist

- [ ] review.md matches the current candidate output
- [ ] All review checkboxes checked
- [ ] Referential integrity validated
- [ ] Code-map integrity validated
- [ ] Scan/map completeness re-validated

## Actions

1. Re-check all promotion gates before any formal write
2. Write openspec/project.opsx.yaml
3. Write openspec/project.opsx.relations.yaml
4. Write openspec/project.opsx.code-map.yaml
5. In `raw + full`, copy reviewed candidate specs into `openspec/specs/<capability-folder>/spec.md`
6. In `raw + opsx-first`, create only `openspec/specs/README.md`
7. In `specs-based + full`, preserve existing specs and add only missing capability specs
8. Retain openspec/bootstrap/ as audit history and direct the next run to `openspec bootstrap init --mode refresh --restart`
