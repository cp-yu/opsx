/**
 * Transform pipeline types.
 * Ordered artifact transforms with explicit scope and phase semantics.
 */

/**
 * Context available to transforms during artifact generation.
 */
export interface GenerationContext {
  toolId: string;
  workflowId: string;
  artifactType: 'skill' | 'command';
}

export type TransformScope = 'skill' | 'command' | 'both';
export type TransformPhase = 'preAdapter' | 'postAdapter';

export interface ArtifactTransform {
  id: string;
  scope: TransformScope;
  phase: TransformPhase;
  priority: number;
  applies(ctx: GenerationContext): boolean;
  transform(content: string, ctx: GenerationContext): string;
}
