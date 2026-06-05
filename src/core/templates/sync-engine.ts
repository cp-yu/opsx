/**
 * Shared Artifact Sync Engine.
 *
 * Single orchestration engine for planning, rendering, transforming,
 * and writing skill/command artifacts. Used by init, update, and
 * legacy-upgrade entry points to eliminate duplicated write loops.
 */

import path from 'path';
import os from 'os';
import * as fs from 'fs';
import { FileSystemUtils } from '../../utils/file-system.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from '../command-generation/index.js';
import type { CommandContent } from '../command-generation/index.js';
import {
  generateSkillContent,
  getSkillTemplates,
  getCommandContents,
  getManagedSkillDirNames,
} from '../shared/skill-generation.js';
import type { SkillTemplateEntry } from '../shared/skill-generation.js';
import { runTransforms } from './transforms/index.js';
import {
  ALL_WORKFLOWS,
  getCommandSlug,
  normalizeWorkflowIds,
  type WorkflowId,
} from '../workflow-surface.js';
import { ToolProfileRegistry } from './tool-profile/index.js';
import type { Delivery } from '../global-config.js';
import { toolSupportsCommandGeneration } from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArtifactSyncRequest {
  toolId: string;
  projectPath: string;
  workflows: readonly string[];
  delivery: Delivery;
  version: string;
}

export interface ArtifactSyncResult {
  toolId: string;
  toolName: string;
  skillsWritten: number;
  commandsWritten: number;
  skillsRemoved: number;
  commandsRemoved: number;
  error?: Error;
}

export interface ArtifactSyncSummary {
  results: ArtifactSyncResult[];
  totalSkillsWritten: number;
  totalCommandsWritten: number;
  totalSkillsRemoved: number;
  totalCommandsRemoved: number;
  failed: ArtifactSyncResult[];
  succeeded: ArtifactSyncResult[];
}

// ---------------------------------------------------------------------------
// Plan types
// ---------------------------------------------------------------------------

interface SkillWriteEntry {
  template: SkillTemplateEntry['template'];
  dirName: string;
  workflowId: string;
}

interface CommandWriteEntry {
  content: CommandContent;
}

interface ToolSyncPlan {
  toolId: string;
  toolName: string;
  skillsDir: string;
  shouldGenerateSkills: boolean;
  shouldGenerateCommands: boolean;
  skillEntries: SkillWriteEntry[];
  commandEntries: CommandWriteEntry[];
  expectedSkillDirNames: string[];
  expectedCommandSlugs: string[];
  managedSkillDirNames: string[];
  managedCommandSlugs: string[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function resolveEffectiveWorkflows(
  projectPath: string,
  workflows: readonly string[]
): readonly WorkflowId[] {
  const effective = new Set<WorkflowId>(normalizeWorkflowIds(workflows));
  const bootstrapDir = path.join(projectPath, 'openspec', 'bootstrap');

  try {
    if (fs.statSync(bootstrapDir).isDirectory()) {
      effective.add('bootstrap-opsx' as WorkflowId);
    }
  } catch {
    // No bootstrap workspace; keep the requested workflows unchanged.
  }

  return ALL_WORKFLOWS.filter((workflowId) => effective.has(workflowId));
}

function buildPlan(request: ArtifactSyncRequest): ToolSyncPlan | null {
  const profile = ToolProfileRegistry.get(request.toolId);
  if (!profile?.skillsDir) return null;

  const normalizedWorkflows = resolveEffectiveWorkflows(request.projectPath, request.workflows);

  const supportsCommands = toolSupportsCommandGeneration(request.toolId);
  const keepsSkillsWithoutCommands = request.toolId === 'codex';

  const shouldGenerateSkills = request.delivery !== 'commands' || keepsSkillsWithoutCommands;
  const shouldGenerateCommands = request.delivery !== 'skills' && supportsCommands;

  const skillTemplates = shouldGenerateSkills
    ? getSkillTemplates(normalizedWorkflows, request.toolId)
    : [];
  const commandContents = shouldGenerateCommands
    ? getCommandContents(normalizedWorkflows, request.toolId)
    : [];

  const skillEntries: SkillWriteEntry[] = skillTemplates.map((entry) => ({
    template: entry.template,
    dirName: entry.dirName,
    workflowId: entry.workflowId,
  }));

  const commandEntries: CommandWriteEntry[] = commandContents.map((content) => ({
    content,
  }));

  return {
    toolId: request.toolId,
    toolName: profile.name,
    skillsDir: profile.skillsDir,
    shouldGenerateSkills,
    shouldGenerateCommands,
    skillEntries,
    commandEntries,
    expectedSkillDirNames: skillEntries.map((e) => e.dirName),
    expectedCommandSlugs: commandEntries.map((e) => e.content.commandSlug),
    managedSkillDirNames: getManagedSkillDirNames(),
    managedCommandSlugs: ALL_WORKFLOWS.map((workflowId) => getCommandSlug(workflowId)),
  };
}

async function writeSkills(
  projectPath: string,
  skillsDir: string,
  toolId: string,
  entries: SkillWriteEntry[],
  version: string
): Promise<number> {
  let written = 0;
  const baseDir = path.join(projectPath, skillsDir, 'skills');

  for (const entry of entries) {
    const skillDir = path.join(baseDir, entry.dirName);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const referencesDir = path.join(skillDir, 'references');
    const referenceFiles = (entry.template.referenceFiles ?? []).map((referenceFile) => {
      const referencePath = path.normalize(referenceFile.path);
      if (
        path.isAbsolute(referencePath) ||
        referencePath.startsWith('..') ||
        !referencePath.startsWith(`references${path.sep}`)
      ) {
        throw new Error(`Invalid skill reference path: ${referenceFile.path}`);
      }

      return { ...referenceFile, path: referencePath };
    });

    const skillContent = generateSkillContent(entry.template, version, (instructions) =>
      runTransforms(instructions, {
        toolId,
        workflowId: entry.workflowId,
        artifactType: 'skill',
      })
    );

    await FileSystemUtils.writeFile(skillFile, skillContent);
    await fs.promises.rm(referencesDir, { recursive: true, force: true });

    if (referenceFiles.length > 0) {
      for (const referenceFile of referenceFiles) {
        await FileSystemUtils.writeFile(
          path.join(skillDir, referenceFile.path),
          runTransforms(referenceFile.content, {
            toolId,
            workflowId: entry.workflowId,
            artifactType: 'skill',
          })
        );
      }
    }
    written++;
  }

  return written;
}

async function writeCommands(
  projectPath: string,
  toolId: string,
  entries: CommandWriteEntry[]
): Promise<number> {
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter || entries.length === 0) return 0;

  // Apply preAdapter transforms to each command body.
  // `entry.content.id` is the WorkflowId (see getCommandContents mapping).
  const contents: CommandContent[] = entries.map((entry) => ({
    ...entry.content,
    body: runTransforms(entry.content.body, {
      toolId,
      workflowId: entry.content.id,
      artifactType: 'command',
    }, 'preAdapter'),
  }));

  const generated = generateCommands(contents, adapter);
  let written = 0;

  for (const cmd of generated) {
    const commandFile = path.isAbsolute(cmd.path) ? cmd.path : path.join(projectPath, cmd.path);
    await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
    written++;
  }

  return written;
}

async function removeUnselectedSkillDirs(
  projectPath: string,
  skillsDir: string,
  expected: readonly string[],
  managed: readonly string[]
): Promise<number> {
  const expectedSet = new Set(expected);
  const baseDir = path.join(projectPath, skillsDir, 'skills');
  let removed = 0;

  for (const dirName of managed) {
    if (expectedSet.has(dirName)) continue;
    const skillDir = path.join(baseDir, dirName);
    try {
      if (fs.existsSync(skillDir)) {
        await fs.promises.rm(skillDir, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // Ignore errors
    }
  }

  return removed;
}

async function removeAllSkillDirs(
  projectPath: string,
  skillsDir: string,
  managed: readonly string[]
): Promise<number> {
  const baseDir = path.join(projectPath, skillsDir, 'skills');
  let removed = 0;

  for (const dirName of managed) {
    const skillDir = path.join(baseDir, dirName);
    try {
      if (fs.existsSync(skillDir)) {
        await fs.promises.rm(skillDir, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // Ignore errors
    }
  }

  return removed;
}

function getLegacyCodexCommandFiles(commandSlugs: readonly string[]): string[] {
  const envHome = process.env.CODEX_HOME;
  const codexHome = path.resolve(envHome || path.join(os.homedir(), '.codex'));
  return commandSlugs.map((commandSlug) =>
    path.join(codexHome, 'prompts', `opsx-${commandSlug}.md`)
  );
}

function getManagedCommandFiles(
  projectPath: string,
  toolId: string,
  commandSlugs: readonly string[]
): string[] {
  const files: string[] = [];
  if (toolSupportsCommandGeneration(toolId)) {
    const adapter = CommandAdapterRegistry.get(toolId);
    if (adapter) {
      for (const commandSlug of commandSlugs) {
        const commandPath = adapter.getFilePath(commandSlug);
        files.push(path.isAbsolute(commandPath) ? commandPath : path.join(projectPath, commandPath));
      }
    }
  }
  // Include legacy codex files for cleanup
  if (toolId === 'codex') {
    files.push(...getLegacyCodexCommandFiles(commandSlugs));
  }
  return files;
}

async function removeUnselectedCommandFiles(
  projectPath: string,
  toolId: string,
  expected: readonly string[],
  managed: readonly string[]
): Promise<number> {
  const expectedSet = new Set(expected);
  let removed = 0;

  for (const commandSlug of managed) {
    if (expectedSet.has(commandSlug)) continue;
    const files = getManagedCommandFiles(projectPath, toolId, [commandSlug]);
    for (const fullPath of files) {
      try {
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
          removed++;
        }
      } catch {
        // Ignore errors
      }
    }
  }

  return removed;
}

async function removeAllCommandFiles(
  projectPath: string,
  toolId: string,
  managed: readonly string[]
): Promise<number> {
  let removed = 0;
  const files = getManagedCommandFiles(projectPath, toolId, managed);
  for (const fullPath of files) {
    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        removed++;
      }
    } catch {
      // Ignore errors
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const ArtifactSyncEngine = {
  /**
   * Execute a single tool sync.
   */
  async syncOne(request: ArtifactSyncRequest): Promise<ArtifactSyncResult> {
    const plan = buildPlan(request);
    if (!plan) {
      return {
        toolId: request.toolId,
        toolName: request.toolId,
        skillsWritten: 0,
        commandsWritten: 0,
        skillsRemoved: 0,
        commandsRemoved: 0,
        error: new Error(`No tool profile or skillsDir for ${request.toolId}`),
      };
    }

    try {
      let skillsWritten = 0;
      let commandsWritten = 0;
      let skillsRemoved = 0;
      let commandsRemoved = 0;

      if (plan.shouldGenerateSkills) {
        skillsWritten = await writeSkills(
          request.projectPath,
          plan.skillsDir,
          request.toolId,
          plan.skillEntries,
          request.version
        );
        skillsRemoved = await removeUnselectedSkillDirs(
          request.projectPath,
          plan.skillsDir,
          plan.expectedSkillDirNames,
          plan.managedSkillDirNames
        );
      } else {
        skillsRemoved = await removeAllSkillDirs(
          request.projectPath,
          plan.skillsDir,
          plan.managedSkillDirNames
        );
      }

      if (plan.shouldGenerateCommands) {
        commandsWritten = await writeCommands(
          request.projectPath,
          request.toolId,
          plan.commandEntries
        );
        commandsRemoved = await removeUnselectedCommandFiles(
          request.projectPath,
          request.toolId,
          plan.expectedCommandSlugs,
          plan.managedCommandSlugs
        );
      } else {
        commandsRemoved = await removeAllCommandFiles(
          request.projectPath,
          request.toolId,
          plan.managedCommandSlugs
        );
      }

      return {
        toolId: request.toolId,
        toolName: plan.toolName,
        skillsWritten,
        commandsWritten,
        skillsRemoved,
        commandsRemoved,
      };
    } catch (error) {
      return {
        toolId: request.toolId,
        toolName: plan.toolName,
        skillsWritten: 0,
        commandsWritten: 0,
        skillsRemoved: 0,
        commandsRemoved: 0,
        error: error instanceof Error ? error : new Error(String(error ?? 'Unknown error')),
      };
    }
  },

  /**
   * Execute sync for multiple tools.
   */
  async syncAll(requests: ArtifactSyncRequest[]): Promise<ArtifactSyncSummary> {
    const results: ArtifactSyncResult[] = [];
    for (const request of requests) {
      results.push(await this.syncOne(request));
    }

    return {
      results,
      totalSkillsWritten: results.reduce((sum, r) => sum + r.skillsWritten, 0),
      totalCommandsWritten: results.reduce((sum, r) => sum + r.commandsWritten, 0),
      totalSkillsRemoved: results.reduce((sum, r) => sum + r.skillsRemoved, 0),
      totalCommandsRemoved: results.reduce((sum, r) => sum + r.commandsRemoved, 0),
      failed: results.filter((r) => r.error),
      succeeded: results.filter((r) => !r.error),
    };
  },
};
