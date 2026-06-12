/**
 * Agent Skill Templates
 *
 * Compatibility facade that re-exports split workflow template modules.
 */

export type { SkillTemplate, CommandTemplate } from './types.js';

export { getExploreSkillTemplate, getOpsxExploreCommandTemplate } from './workflows/explore.js';
export { getApplyChangeSkillTemplate, getOpsxApplyCommandTemplate } from './workflows/apply-change.js';
export { getArchiveChangeSkillTemplate, getOpsxArchiveCommandTemplate } from './workflows/archive-change.js';
export { getOpsxProposeSkillTemplate, getOpsxProposeCommandTemplate } from './workflows/propose.js';
export { getBootstrapOpsxSkillTemplate, getOpsxBootstrapCommandTemplate } from './workflows/bootstrap-opsx.js';
export { getReviewerSkillTemplate } from './workflows/reviewer.js';
export { getOptimizerSkillTemplate } from './workflows/optimizer.js';
export { getImpactSweeperSkillTemplate } from './workflows/impact-sweeper.js';
export { getFeedbackSkillTemplate } from './workflows/feedback.js';
