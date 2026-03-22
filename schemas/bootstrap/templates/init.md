# Bootstrap Init

Phase: init
Baseline: {{ baseline_type }}
Mode: {{ mode }}
Created: {{ date }}

Supported upgrade paths:
- specs-based -> full
- raw -> full
- raw -> opsx-first

Mode contract:
- full => formal OPSX + complete valid specs
- opsx-first => formal OPSX + README-only starter
