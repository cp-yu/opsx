/**
 * Tool Profile Registry.
 *
 * Maps every AI tool to its skill generation capabilities.
 * Skills-only workflow surface: command adapter metadata is no longer tracked.
 */

import { AI_TOOLS } from '../../config.js';
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

  supportsSkills(toolId: string): boolean {
    const profile = BY_ID.get(toolId);
    return profile?.skillsDir !== undefined;
  },
} as const;
