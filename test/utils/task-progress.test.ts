import { describe, expect, it } from 'vitest';

import { countTasksFromContent } from '../../src/utils/task-progress.js';

describe('countTasksFromContent', () => {
  it('counts legacy checkbox tasks', () => {
    expect(countTasksFromContent('- [x] Done\n- [ ] Todo\n')).toEqual({
      total: 2,
      completed: 1,
    });
  });

  it('counts coarse Task sections using nested check completion', () => {
    expect(
      countTasksFromContent(`### Task 1: First

#### Checks

- [x] C1 Done
- [x] C2 Done

### Task 2: Second

#### Checks

- [x] C3 Done
- [ ] C4 Todo
`)
    ).toEqual({
      total: 2,
      completed: 1,
    });
  });

  it('counts coarse Task sections with Windows line endings', () => {
    expect(
      countTasksFromContent(
        '### Task 1: Windows\r\n\r\n#### Checks\r\n\r\n- [x] C1 Done\r\n\r\n### Task 2: Pending\r\n\r\n#### Checks\r\n\r\n- [ ] C2 Todo\r\n'
      )
    ).toEqual({
      total: 2,
      completed: 1,
    });
  });
});
