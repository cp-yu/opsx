import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { Validator } from '../../src/core/validation/validator.js';

describe('validateChangeDeltaSpecs cross-check against main spec', () => {
  const testDir = path.join(process.cwd(), 'test-cross-check-tmp');
  // Layout: <testDir>/openspec/changes/test-change/specs/<cap>/spec.md
  //         <testDir>/openspec/specs/<cap>/spec.md
  const changeDir = path.join(testDir, 'openspec', 'changes', 'test-change');
  const mainSpecsDir = path.join(testDir, 'openspec', 'specs');

  beforeEach(async () => {
    await fs.mkdir(path.join(changeDir, 'specs'), { recursive: true });
    await fs.mkdir(mainSpecsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function writeChangeSpec(capName: string, content: string) {
    const dir = path.join(changeDir, 'specs', capName);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'spec.md'), content);
  }

  async function writeMainSpec(capName: string, content: string) {
    const dir = path.join(mainSpecsDir, capName);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'spec.md'), content);
  }

  const mainSpecWithHeaders = (headers: string[]) => {
    const reqs = headers.map(h => `### Requirement: ${h}\nThe system SHALL do ${h}.\n\n#### Scenario: ${h} works\n- **WHEN** foo\n- **THEN** bar\n`).join('\n');
    return `# Test Spec\n\n## Purpose\nTest spec for cross-check validation.\n\n## Requirements\n\n${reqs}`;
  };

  const deltaSpec = (section: string, reqName: string) => {
    if (section === 'REMOVED') {
      return `## ${section} Requirements\n\n### Requirement: ${reqName}\n`;
    }
    if (section === 'RENAMED') {
      return `## RENAMED Requirements\n\n- FROM: \`### Requirement: ${reqName}\`\n- TO: \`### Requirement: New Name\`\n`;
    }
    return `## ${section} Requirements\n\n### Requirement: ${reqName}\nThe system SHALL do something.\n\n#### Scenario: Test\n- **WHEN** action\n- **THEN** result\n`;
  };

  it('should report ERROR when MODIFIED header not found in main spec', async () => {
    await writeMainSpec('foo', mainSpecWithHeaders(['Existing Header']));
    await writeChangeSpec('foo', deltaSpec('MODIFIED', 'Non Existent'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find(i => i.message.includes('MODIFIED') && i.message.includes('not found in main spec'));
    expect(issue).toBeDefined();
    expect(issue!.level).toBe('ERROR');
    expect(issue!.message).toContain('Non Existent');
    expect(issue!.message).toContain('ADDED Requirements');
  });

  it('should report ERROR when ADDED header already exists in main spec', async () => {
    await writeMainSpec('foo', mainSpecWithHeaders(['Already Here']));
    await writeChangeSpec('foo', deltaSpec('ADDED', 'Already Here'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find(i => i.message.includes('ADDED') && i.message.includes('already exists'));
    expect(issue).toBeDefined();
    expect(issue!.level).toBe('ERROR');
    expect(issue!.message).toContain('Already Here');
    expect(issue!.message).toContain('MODIFIED Requirements');
  });

  it('should report ERROR when REMOVED header not found in main spec', async () => {
    await writeMainSpec('foo', mainSpecWithHeaders(['Something Else']));
    await writeChangeSpec('foo', deltaSpec('REMOVED', 'Ghost'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find(i => i.message.includes('REMOVED') && i.message.includes('not found in main spec'));
    expect(issue).toBeDefined();
    expect(issue!.level).toBe('ERROR');
    expect(issue!.message).toContain('Ghost');
  });

  it('should report ERROR when RENAMED FROM header not found in main spec', async () => {
    await writeMainSpec('foo', mainSpecWithHeaders(['Other']));
    await writeChangeSpec('foo', deltaSpec('RENAMED', 'Missing'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find(i => i.message.includes('RENAMED FROM') && i.message.includes('not found in main spec'));
    expect(issue).toBeDefined();
    expect(issue!.level).toBe('ERROR');
    expect(issue!.message).toContain('Missing');
  });

  it('should report ERROR when main spec does not exist and MODIFIED is used', async () => {
    // No main spec written for 'nonexistent'
    await writeChangeSpec('nonexistent', deltaSpec('MODIFIED', 'Something'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find(i => i.message.includes('MODIFIED') && i.message.includes('non-existent main spec'));
    expect(issue).toBeDefined();
    expect(issue!.level).toBe('ERROR');
  });

  it('should pass when main spec does not exist and only ADDED is used', async () => {
    // No main spec for 'brand-new'
    await writeChangeSpec('brand-new', deltaSpec('ADDED', 'New Feature'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(true);
    expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
  });

  it('should match headers case-insensitively', async () => {
    await writeMainSpec('foo', mainSpecWithHeaders(['Foo Bar']));
    // MODIFIED with different case — should match
    await writeChangeSpec('foo', deltaSpec('MODIFIED', 'foo bar'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    const crossCheckErrors = report.issues.filter(i => i.message.includes('not found in main spec'));
    expect(crossCheckErrors).toHaveLength(0);
  });

  it('should pass when MODIFIED header exists in main spec', async () => {
    await writeMainSpec('foo', mainSpecWithHeaders(['Valid Header']));
    await writeChangeSpec('foo', deltaSpec('MODIFIED', 'Valid Header'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    const crossCheckErrors = report.issues.filter(i => i.message.includes('not found in main spec') || i.message.includes('already exists'));
    expect(crossCheckErrors).toHaveLength(0);
  });

  it('should pass when ADDED header does not exist in main spec', async () => {
    await writeMainSpec('foo', mainSpecWithHeaders(['Existing']));
    await writeChangeSpec('foo', deltaSpec('ADDED', 'Brand New'));

    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    const crossCheckErrors = report.issues.filter(i => i.message.includes('already exists'));
    expect(crossCheckErrors).toHaveLength(0);
  });
});
