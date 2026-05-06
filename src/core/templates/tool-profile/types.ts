/**
 * Tool profile types.
 * Centralized capability model per AI tool.
 */

export interface ToolProfile {
  toolId: string;
  name: string;
  skillsDir?: string;
  commandAdapterId?: string;
  transforms: string[];
}
