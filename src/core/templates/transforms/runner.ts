/**
 * Transform runner.
 * Applies registered transforms in deterministic order using scope, phase, and priority.
 */

import type { ArtifactTransform, GenerationContext } from './types.js';

// ---------------------------------------------------------------------------
// Transform registry
// ---------------------------------------------------------------------------

const transforms: ArtifactTransform[] = [];

export const TransformRegistry = {
  register(t: ArtifactTransform): void {
    transforms.push(t);
  },

  getAll(): readonly ArtifactTransform[] {
    return transforms;
  },

  remove(id: string): boolean {
    const idx = transforms.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    transforms.splice(idx, 1);
    return true;
  },

  clear(): void {
    transforms.length = 0;
  },
} as const;

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function phaseOrder(phase: string): number {
  return phase === 'preAdapter' ? 0 : 1;
}

function sortTransforms(list: ArtifactTransform[]): ArtifactTransform[] {
  return [...list].sort((a, b) => {
    const phaseDiff = phaseOrder(a.phase) - phaseOrder(b.phase);
    if (phaseDiff !== 0) return phaseDiff;
    return a.priority - b.priority;
  });
}

/**
 * Applies all matching transforms for the given context and phase.
 * Called by the artifact sync engine during generation.
 */
export function runTransforms(
  content: string,
  ctx: GenerationContext,
  phase?: 'preAdapter' | 'postAdapter'
): string {
  const applicable = transforms.filter((t) => {
    if (phase !== undefined && t.phase !== phase) return false;
    if (t.scope !== 'both' && t.scope !== ctx.artifactType) return false;
    return t.applies(ctx);
  });

  let result = content;
  for (const t of sortTransforms(applicable)) {
    result = t.transform(result, ctx);
  }
  return result;
}
