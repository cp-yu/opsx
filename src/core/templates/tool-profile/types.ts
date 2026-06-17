/**
 * Tool profile types.
 * Centralized capability model per AI tool.
 * Skills-only workflow surface: command adapter metadata is no longer tracked.
 */

export interface ToolProfile {
  toolId: string;
  name: string;
  skillsDir?: string;
  transforms: string[];
}
