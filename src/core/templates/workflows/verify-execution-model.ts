export const REREAD_VERIFY_EXECUTION_MODEL = 'current-agent-reread' as const;
export const SUBAGENT_VERIFY_EXECUTION_MODEL = 'subagent-orchestrated' as const;

export type VerifyExecutionModel =
  | typeof REREAD_VERIFY_EXECUTION_MODEL
  | typeof SUBAGENT_VERIFY_EXECUTION_MODEL;

const VERIFY_EXECUTION_MODEL_BY_TOOL: Partial<Record<string, VerifyExecutionModel>> = {
  claude: SUBAGENT_VERIFY_EXECUTION_MODEL,
  codex: SUBAGENT_VERIFY_EXECUTION_MODEL,
};

export function resolveVerifyExecutionModel(toolId?: string): VerifyExecutionModel {
  if (!toolId) {
    return REREAD_VERIFY_EXECUTION_MODEL;
  }

  return VERIFY_EXECUTION_MODEL_BY_TOOL[toolId] ?? REREAD_VERIFY_EXECUTION_MODEL;
}
