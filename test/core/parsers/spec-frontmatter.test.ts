import { describe, expect, it } from 'vitest';
import { parseSpecFrontmatter } from '../../../src/core/parsers/spec-frontmatter.js';

describe('parseSpecFrontmatter', () => {
  it('parses capabilities from frontmatter', () => {
    const content = `---
capabilities:
  - cap.cli.archive
  - cap.change.archive
---
# Archive

## Requirements
`;

    expect(parseSpecFrontmatter(content)).toEqual({
      capabilities: ['cap.cli.archive', 'cap.change.archive'],
    });
  });

  it('returns empty capabilities without frontmatter or with malformed YAML', () => {
    expect(parseSpecFrontmatter('# Archive\n\n## Requirements\n')).toEqual({ capabilities: [] });
    expect(parseSpecFrontmatter('---\ncapabilities: [cap.cli.archive\n---\n# Archive')).toEqual({ capabilities: [] });
  });

  it('only parses the leading frontmatter block', () => {
    const content = `---
capabilities:
  - cap.cli.archive
---
# Archive

## Requirements

### Requirement: Marker
The system SHALL keep markdown untouched.

---
capabilities:
  - cap.ignored
---
`;

    expect(parseSpecFrontmatter(content)).toEqual({ capabilities: ['cap.cli.archive'] });
  });
});
