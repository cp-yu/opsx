export const SUBAGENT_VERIFY_EXECUTION_MODEL = 'subagent-orchestrated' as const;

export type VerifyExecutionModel = typeof SUBAGENT_VERIFY_EXECUTION_MODEL;

/**
 * Skills-only workflow surface: every CLI workflow assumes subagent support.
 * The lookup is intentionally explicit — no tool lookup, pattern matching,
 * or fallback inference.
 */
export function resolveVerifyExecutionModel(_toolId?: string): VerifyExecutionModel {
  return SUBAGENT_VERIFY_EXECUTION_MODEL;
}
