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

interface ReplacementPair {
  source: string;
  codexTarget: string;
  opencodeTarget: string;
}

function buildReplacementPairs(): ReplacementPair[] {
  return getWorkflowSurfaces().map((entry) => ({
    source: `/opsx:${entry.commandSlug}`,
    codexTarget: `$${entry.skillDirName}`,
    opencodeTarget: `/opsx-${entry.commandSlug}`,
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
// Pi command reference transform (same hyphen format as OpenCode)
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
      result = result.split(pair.source).join(pair.opencodeTarget);
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
      result = result.split(pair.source).join('/' + pair.codexTarget.slice(1));
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
