import type { SanitizedAgentHtml } from "../types"
import { parseAgentHtml } from "./parse-agent-html"
import type { AgentHtmlDiagnostic } from "./parse-agent-html"
import { validateAgentHtml } from "./validate-agent-html"

type SanitizeAgentHtmlResult = {
  readonly document?: SanitizedAgentHtml
  readonly diagnostics: readonly AgentHtmlDiagnostic[]
}

export function sanitizeAgentHtml(source: string): SanitizeAgentHtmlResult {
  const parsed = parseAgentHtml(source)
  const validated = validateAgentHtml(parsed)

  if (validated.diagnostics.length > 0) {
    return {
      diagnostics: validated.diagnostics,
    }
  }

  return {
    document: {
      meta: validated.meta,
      blocks: validated.blocks,
    },
    diagnostics: [],
  }
}
