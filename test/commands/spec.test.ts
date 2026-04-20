import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

describe('spec command', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-spec-command-tmp');
  const specsDir = path.join(testDir, 'openspec', 'specs');

  async function runSpecCli(args: string[]) {
    return runCLI(args, { cwd: testDir });
  }
  
  
  beforeEach(async () => {
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create test spec files
    const testSpec = `## Purpose
This is a test specification for the authentication system.

## Requirements

### Requirement: User Authentication
The system SHALL provide secure user authentication

#### Scenario: Successful login
- **GIVEN** a user with valid credentials
- **WHEN** they submit the login form  
- **THEN** they are authenticated

### Requirement: Password Reset
The system SHALL allow users to reset their password

#### Scenario: Reset via email
- **GIVEN** a user with a registered email
- **WHEN** they request a password reset
- **THEN** they receive a reset link`;

    await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'auth', 'spec.md'), testSpec);
    
    const testSpec2 = `## Purpose
This specification defines the payment processing system.

## Requirements

### Requirement: Process Payments
The system SHALL process credit card payments securely`;

    await fs.mkdir(path.join(specsDir, 'payment'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'payment', 'spec.md'), testSpec2);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('spec show', () => {
    it('should display spec in text format', async () => {
      const result = await runSpecCli(['spec', 'show', 'auth']);
      expect(result.exitCode).toBe(0);

      const raw = await fs.readFile(path.join(specsDir, 'auth', 'spec.md'), 'utf-8');
      expect(result.stdout.trim()).toBe(raw.trim());
    });

    it('should output spec as JSON with --json flag', async () => {
      const result = await runSpecCli(['spec', 'show', 'auth', '--json']);
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.id).toBe('auth');
      expect(json.title).toBe('auth');
      expect(json.overview).toContain('test specification');
      expect(json.requirements).toHaveLength(2);
      expect(json.metadata.format).toBe('openspec');
    });

    it('should filter to show only requirements with --requirements flag (JSON only)', async () => {
      const result = await runSpecCli(['spec', 'show', 'auth', '--json', '--requirements']);
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.requirements).toHaveLength(2);
      expect(json.requirements.every((r: any) => Array.isArray(r.scenarios) && r.scenarios.length === 0)).toBe(true);
    });

    it('should exclude scenarios with --no-scenarios flag (JSON only)', async () => {
      const result = await runSpecCli(['spec', 'show', 'auth', '--json', '--no-scenarios']);
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.requirements).toHaveLength(2);
      expect(json.requirements.every((r: any) => Array.isArray(r.scenarios) && r.scenarios.length === 0)).toBe(true);
    });

    it('should show specific requirement with -r flag (JSON only)', async () => {
      const result = await runSpecCli(['spec', 'show', 'auth', '--json', '-r', '1']);
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.requirements).toHaveLength(1);
      expect(json.requirements[0].text).toContain('The system SHALL provide secure user authentication');
    });

    it('should return JSON with filtered requirements', async () => {
      const result = await runSpecCli(['spec', 'show', 'auth', '--json', '--no-scenarios']);
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.requirements).toHaveLength(2);
      expect(json.requirements[0].scenarios).toHaveLength(0);
    });
  });

  describe('spec list', () => {
    it('should list all available specs (IDs only by default)', async () => {
      const result = await runSpecCli(['spec', 'list']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('auth');
      expect(result.stdout).toContain('payment');
      expect(result.stdout).not.toMatch(/Requirements:\s*\d+/);
    });

    it('should output spec list as JSON with --json flag', async () => {
      const result = await runSpecCli(['spec', 'list', '--json']);
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json).toHaveLength(2);
      expect(json.find((s: any) => s.id === 'auth')).toBeDefined();
      expect(json.find((s: any) => s.id === 'payment')).toBeDefined();
      expect(json[0].requirementCount).toBeDefined();
    });
  });

  describe('spec validate', () => {
    it('should validate a valid spec', async () => {
      const result = await runSpecCli(['spec', 'validate', 'auth']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Specification 'auth' is valid");
    });

    it('should output validation report as JSON with --json flag', async () => {
      const result = await runSpecCli(['spec', 'validate', 'auth', '--json']);
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.valid).toBeDefined();
      expect(json.issues).toBeDefined();
      expect(json.summary).toBeDefined();
      expect(json.summary.errors).toBeDefined();
      expect(json.summary.warnings).toBeDefined();
    });

    it('should validate with strict mode', async () => {
      const result = await runSpecCli(['spec', 'validate', 'auth', '--strict', '--json']);
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.valid).toBeDefined();
    });

    it('should detect invalid spec structure', async () => {
      const invalidSpec = `## Purpose

## Requirements
This section has no actual requirements`;

      await fs.mkdir(path.join(specsDir, 'invalid'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'invalid', 'spec.md'), invalidSpec);

      const result = await runSpecCli(['spec', 'validate', 'invalid']);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent spec gracefully', async () => {
      const result = await runSpecCli(['spec', 'show', 'nonexistent']);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('not found');
    });

    it('should handle missing specs directory gracefully', async () => {
      await fs.rm(specsDir, { recursive: true, force: true });
      const result = await runSpecCli(['spec', 'list']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('No items found');
    });

    it('should honor --no-color (no ANSI escapes)', async () => {
      const result = await runSpecCli(['--no-color', 'spec', 'list', '--long']);
      expect(result.exitCode).toBe(0);
      const hasAnsi = /\u001b\[[0-9;]*m/.test(result.stdout);
      expect(hasAnsi).toBe(false);
    });
  });
});
