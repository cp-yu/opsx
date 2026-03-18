/**
 * Shared Utilities
 *
 * Common code shared between init and update commands.
 */

export {
  SKILL_NAMES,
  type SkillName,
  COMMAND_IDS,
  type CommandId,
  WORKFLOW_TO_COMMAND_SLUG,
  getCommandSlug,
  type ToolSkillStatus,
  type ToolVersionStatus,
  getToolsWithSkillsDir,
  getToolSkillStatus,
  getToolStates,
  extractGeneratedByVersion,
  getToolVersionStatus,
  getConfiguredTools,
  getAllToolVersionStatus,
} from './tool-detection.js';

export {
  ALL_WORKFLOWS,
  CORE_WORKFLOWS,
  EXPANDED_WORKFLOWS,
  WORKFLOW_TO_SKILL_DIR,
  getWorkflowPromptMeta,
  normalizeWorkflowIds,
  type WorkflowId,
} from '../workflow-surface.js';

export {
  type SkillTemplateEntry,
  type CommandTemplateEntry,
  getSkillTemplates,
  getCommandTemplates,
  getCommandContents,
  generateSkillContent,
} from './skill-generation.js';
