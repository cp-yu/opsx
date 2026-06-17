/**
 * Shared Artifact Sync Engine.
 *
 * Single orchestration engine for planning, rendering, transforming,
 * and writing skill artifacts. Skills-only workflow surface.
 */

import path from 'path';
import * as fs from 'fs';
import { FileSystemUtils } from '../../utils/file-system.js';
import {
  generateSkillContent,
  getSkillTemplates,
  getManagedSkillDirNames,
} from '../shared/skill-generation.js';
import type { SkillTemplateEntry } from '../shared/skill-generation.js';
import type { SkillTemplate } from './types.js';
import { runTransforms } from './transforms/index.js';
import {
  ALL_WORKFLOWS,
  normalizeWorkflowIds,
  type WorkflowId,
} from '../workflow-surface.js';
import { ToolProfileRegistry } from './tool-profile/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArtifactSyncRequest {
  toolId: string;
  projectPath: string;
  workflows: readonly string[];
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

interface SharedReferenceSource {
  template: Pick<SkillTemplate, 'referenceFiles'>;
  workflowId: string;
}

export interface SharedReferenceFile {
  fileName: string;
  sourcePath: string;
  content: string;
}

interface ToolSyncPlan {
  toolId: string;
  toolName: string;
  skillsDir: string;
  skillEntries: SkillWriteEntry[];
  expectedSkillDirNames: string[];
  managedSkillDirNames: string[];
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

  const skillTemplates = getSkillTemplates(normalizedWorkflows, request.toolId);

  const skillEntries: SkillWriteEntry[] = skillTemplates.map((entry) => ({
    template: entry.template,
    dirName: entry.dirName,
    workflowId: entry.workflowId,
  }));

  return {
    toolId: request.toolId,
    toolName: profile.name,
    skillsDir: profile.skillsDir,
    skillEntries,
    expectedSkillDirNames: skillEntries.map((e) => e.dirName),
    managedSkillDirNames: getManagedSkillDirNames(),
  };
}

function toSharedReferenceFileName(referencePath: string): string {
  const normalized = path.posix.normalize(referencePath);
  if (
    path.posix.isAbsolute(referencePath) ||
    path.win32.isAbsolute(referencePath) ||
    referencePath.includes('\\') ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    !normalized.startsWith('references/')
  ) {
    throw new Error(`Invalid skill reference path: ${referencePath}`);
  }

  return `openspec-${path.posix.basename(normalized)}`;
}

function assertToolNeutralReference(referencePath: string, content: string): void {
  if (/\/opsx:|\$openspec-/.test(content)) {
    throw new Error(`Tool-specific syntax in skill reference file: ${referencePath}`);
  }
}

export function collectSharedReferenceFiles(
  sources: readonly SharedReferenceSource[]
): SharedReferenceFile[] {
  const byFileName = new Map<string, string>();
  const references: SharedReferenceFile[] = [];

  for (const source of sources) {
    for (const referenceFile of source.template.referenceFiles ?? []) {
      const fileName = toSharedReferenceFileName(referenceFile.path);
      const previousSource = byFileName.get(fileName);
      if (previousSource) {
        throw new Error(
          `Duplicate skill reference file name: ${fileName} from ${previousSource} and ${source.workflowId}`
        );
      }

      assertToolNeutralReference(referenceFile.path, referenceFile.content);
      byFileName.set(fileName, source.workflowId);
      references.push({
        fileName,
        sourcePath: referenceFile.path,
        content: referenceFile.content,
      });
    }
  }

  return references;
}

async function writeSharedReferences(
  projectPath: string,
  references: readonly SharedReferenceFile[]
): Promise<void> {
  const referencesDir = path.join(projectPath, 'openspec', 'references');

  for (const referenceFile of references) {
    if (!referenceFile.fileName.startsWith('openspec-')) {
      throw new Error(`Invalid managed reference file name: ${referenceFile.fileName}`);
    }

    await FileSystemUtils.writeFile(
      path.join(referencesDir, referenceFile.fileName),
      referenceFile.content
    );
  }
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
  const sharedReferenceFiles = collectSharedReferenceFiles(entries);
  await writeSharedReferences(projectPath, sharedReferenceFiles);

  for (const entry of entries) {
    const skillDir = path.join(baseDir, entry.dirName);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const referencesDir = path.join(skillDir, 'references');

    const skillContent = generateSkillContent(entry.template, version, (instructions) =>
      runTransforms(instructions, {
        toolId,
        workflowId: entry.workflowId,
        artifactType: 'skill',
      })
    );

    await FileSystemUtils.writeFile(skillFile, skillContent);
    await fs.promises.rm(referencesDir, { recursive: true, force: true });
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
      const skillsWritten = await writeSkills(
        request.projectPath,
        plan.skillsDir,
        request.toolId,
        plan.skillEntries,
        request.version
      );
      const skillsRemoved = await removeUnselectedSkillDirs(
        request.projectPath,
        plan.skillsDir,
        plan.expectedSkillDirNames,
        plan.managedSkillDirNames
      );

      return {
        toolId: request.toolId,
        toolName: plan.toolName,
        skillsWritten,
        commandsWritten: 0,
        skillsRemoved,
        commandsRemoved: 0,
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
