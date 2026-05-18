import type { SanitizedAgentHtml } from "../types"
import type { ParseRenderConfigOptions } from "../render-config"
import { parseAgentHtml } from "./parse-agent-html"
import type { AgentHtmlDiagnostic } from "./parse-agent-html"
import { validateAgentHtml } from "./validate-agent-html"

type SanitizeAgentHtmlResult = {
  readonly document?: SanitizedAgentHtml
  readonly diagnostics: readonly AgentHtmlDiagnostic[]
}

export function sanitizeAgentHtml(
  source: string,
  options: ParseRenderConfigOptions = {},
): SanitizeAgentHtmlResult {
  const parsed = parseAgentHtml(source)
  const validated = validateAgentHtml(parsed, options)

  if (validated.diagnostics.length > 0) {
    return {
      diagnostics: validated.diagnostics,
    }
  }

  return {
    document: {
      meta: validated.meta,
      components: validated.components,
    },
    diagnostics: [],
  }
}
