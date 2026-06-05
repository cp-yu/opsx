/**
 * Core template types for skills and slash commands.
 */

export interface SkillTemplate {
  name: string;
  description: string;
  instructions: string;
  referenceFiles?: SkillReferenceFile[];
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

export interface SkillReferenceFile {
  path: string;
  content: string;
}

export interface CommandTemplate {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
}
