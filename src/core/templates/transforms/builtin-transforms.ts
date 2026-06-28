/**
 * Built-in artifact transforms.
 * Registered at module load time.
 */

import { getWorkflowSurfaces } from '../../workflow-surface.js';
import { TransformRegistry } from './runner.js';
import type { ArtifactTransform, GenerationContext } from './types.js';

// ---------------------------------------------------------------------------
// Shared: build replacement map from workflow surfaces
// ---------------------------------------------------------------------------

const EXPLICIT_REFERENCE_TOOLS = new Set(['codex', 'opencode', 'pi', 'claude']);

interface ReplacementPair {
  source: string;
  codexTarget: string;
  claudeTarget: string;
  piTarget: string;
  opencodeTarget: string;
  neutralTarget: string;
}

function buildReplacementPairs(): ReplacementPair[] {
  return getWorkflowSurfaces().map((entry) => ({
    source: `/opsx:${entry.commandSlug}`,
    codexTarget: `$${entry.skillDirName}`,
    claudeTarget: `/${entry.skillDirName}`,
    piTarget: `/skill:${entry.skillDirName}`,
    opencodeTarget: `/opsx-${entry.commandSlug}`,
    neutralTarget: `invoke the ${entry.skillDirName} skill`,
  }));
}

const PAIRS = buildReplacementPairs();

// ---------------------------------------------------------------------------
// Codex command reference transform
// ---------------------------------------------------------------------------

const codexCommandRefsTransform: ArtifactTransform = {
  id: 'codex-command-refs',
  scope: 'both',
  phase: 'preAdapter',
  priority: 10,
  applies(ctx: GenerationContext): boolean {
    return ctx.toolId === 'codex';
  },
  transform(content: string, _ctx: GenerationContext): string {
    let result = content;
    for (const pair of PAIRS) {
      result = result.split(pair.source).join(pair.codexTarget);
    }
    return result;
  },
};

// ---------------------------------------------------------------------------
// OpenCode command reference transform
// ---------------------------------------------------------------------------

const opencodeCommandRefsTransform: ArtifactTransform = {
  id: 'opencode-command-refs',
  scope: 'both',
  phase: 'preAdapter',
  priority: 10,
  applies(ctx: GenerationContext): boolean {
    return ctx.toolId === 'opencode';
  },
  transform(content: string, _ctx: GenerationContext): string {
    let result = content;
    for (const pair of PAIRS) {
      result = result.split(pair.source).join(pair.opencodeTarget);
    }
    return result;
  },
};

// ---------------------------------------------------------------------------
// Pi command reference transform
// ---------------------------------------------------------------------------

const piCommandRefsTransform: ArtifactTransform = {
  id: 'pi-command-refs',
  scope: 'both',
  phase: 'preAdapter',
  priority: 10,
  applies(ctx: GenerationContext): boolean {
    return ctx.toolId === 'pi';
  },
  transform(content: string, _ctx: GenerationContext): string {
    let result = content;
    for (const pair of PAIRS) {
      result = result.split(pair.source).join(pair.piTarget);
    }
    return result;
  },
};

// ---------------------------------------------------------------------------
// Claude Code command reference transform
// ---------------------------------------------------------------------------

const claudeCommandRefsTransform: ArtifactTransform = {
  id: 'claude-command-refs',
  scope: 'both',
  phase: 'preAdapter',
  priority: 10,
  applies(ctx: GenerationContext): boolean {
    return ctx.toolId === 'claude';
  },
  transform(content: string, _ctx: GenerationContext): string {
    let result = content;
    for (const pair of PAIRS) {
      result = result.split(pair.source).join(pair.claudeTarget);
    }
    return result;
  },
};

// ---------------------------------------------------------------------------
// Neutral skill invocation transform
// ---------------------------------------------------------------------------

const neutralSkillRefsTransform: ArtifactTransform = {
  id: 'neutral-skill-refs',
  scope: 'both',
  phase: 'preAdapter',
  priority: 10,
  applies(ctx: GenerationContext): boolean {
    return !EXPLICIT_REFERENCE_TOOLS.has(ctx.toolId);
  },
  transform(content: string, _ctx: GenerationContext): string {
    let result = content;
    for (const pair of PAIRS) {
      result = result.split(pair.source).join(pair.neutralTarget);
    }
    return result;
  },
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

TransformRegistry.register(codexCommandRefsTransform);
TransformRegistry.register(opencodeCommandRefsTransform);
TransformRegistry.register(piCommandRefsTransform);
TransformRegistry.register(claudeCommandRefsTransform);
TransformRegistry.register(neutralSkillRefsTransform);
