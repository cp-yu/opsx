/**
 * Tool Profile Registry.
 *
 * Maps every AI tool to its generation capabilities.
 * Derived from the canonical AI_TOOLS list and command adapter registrations.
 */

import { AI_TOOLS, COMMAND_BACKED_TOOL_IDS } from '../../config.js';
import type { ToolProfile } from './types.js';

// ---------------------------------------------------------------------------
// Transform ID constants
// ---------------------------------------------------------------------------

export const TRANSFORM_IDS = {
  CODEX_COMMAND_REFS: 'codex-command-refs',
  OPENCODE_COMMAND_REFS: 'opencode-command-refs',
  PI_COMMAND_REFS: 'pi-command-refs',
} as const;

// ---------------------------------------------------------------------------
// Build profiles from AI_TOOLS
// ---------------------------------------------------------------------------

function resolveCommandAdapterId(toolId: string): string | undefined {
  if (toolId === 'codex') return undefined;
  if (COMMAND_BACKED_TOOL_IDS.has(toolId)) return toolId;
  return undefined;
}

function resolveTransforms(toolId: string): string[] {
  const transforms: string[] = [];
  if (toolId === 'codex') transforms.push(TRANSFORM_IDS.CODEX_COMMAND_REFS);
  if (toolId === 'opencode') transforms.push(TRANSFORM_IDS.OPENCODE_COMMAND_REFS);
  if (toolId === 'pi') transforms.push(TRANSFORM_IDS.PI_COMMAND_REFS);
  return transforms;
}

function buildProfiles(): ToolProfile[] {
  return AI_TOOLS
    .filter((t) => t.available)
    .map((t) => ({
      toolId: t.value,
      name: t.name,
      skillsDir: t.skillsDir,
      commandAdapterId: resolveCommandAdapterId(t.value),
      transforms: resolveTransforms(t.value),
    }));
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const PROFILES = buildProfiles();
const BY_ID = new Map<string, ToolProfile>(PROFILES.map((p) => [p.toolId, p]));

export const ToolProfileRegistry = {
  profiles: PROFILES,

  get(toolId: string): ToolProfile | undefined {
    return BY_ID.get(toolId);
  },

  has(toolId: string): boolean {
    return BY_ID.has(toolId);
  },

  getToolsWithSkills(): string[] {
    return PROFILES.filter((p) => p.skillsDir).map((p) => p.toolId);
  },

  getToolsWithCommands(): string[] {
    return PROFILES.filter((p) => p.commandAdapterId).map((p) => p.toolId);
  },

  supportsSkills(toolId: string): boolean {
    const profile = BY_ID.get(toolId);
    return profile?.skillsDir !== undefined;
  },

  supportsCommands(toolId: string): boolean {
    const profile = BY_ID.get(toolId);
    return profile?.commandAdapterId !== undefined;
  },
} as const;
