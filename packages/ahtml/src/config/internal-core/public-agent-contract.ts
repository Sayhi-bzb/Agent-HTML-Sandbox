import {
  BLOCKED_AGENT_FACING_PROP_NAMES,
  VALIDATED_STANDARD_COMPONENT_SCHEMAS,
} from "./component-schema"
import {
  DEFAULT_RENDER_CONFIG,
  PUBLIC_RENDER_CONFIG_DEFAULTS,
  PUBLIC_RENDER_CONFIG_MODEL,
  RENDER_CONFIG_KEYS,
  RENDER_CONFIG_VALUES,
} from "./render-config"
import type {
  PublicAgentContract,
  PublicRenderConfigContract,
  PublicSafetyPolicy,
} from "./types"

const safetyForbiddenCategories = [
  "Tailwind",
  "shadcn props",
  "Radix props",
  "React props",
  "events",
  "external URLs",
  "unknown tags",
  "unknown attrs",
] as const

export function createPublicRenderConfigContract(): PublicRenderConfigContract {
  return {
    defaults: PUBLIC_RENDER_CONFIG_DEFAULTS ?? DEFAULT_RENDER_CONFIG,
    keys: RENDER_CONFIG_KEYS,
    values: Object.fromEntries(
      RENDER_CONFIG_KEYS.map((key) => {
        const values = RENDER_CONFIG_VALUES[key]

        if (!values) {
          throw new Error(`Cannot find render config values for ${key}`)
        }

        return [key, values]
      }),
    ),
    model: PUBLIC_RENDER_CONFIG_MODEL,
  }
}

export function createPublicSafetyPolicy(): PublicSafetyPolicy {
  return {
    blockedNames: BLOCKED_AGENT_FACING_PROP_NAMES,
    forbidden: formatForbiddenPolicy(BLOCKED_AGENT_FACING_PROP_NAMES),
  }
}

export function createPublicAgentContract(): PublicAgentContract {
  const safetyPolicy = createPublicSafetyPolicy()

  return {
    components: VALIDATED_STANDARD_COMPONENT_SCHEMAS,
    renderConfig: createPublicRenderConfigContract(),
    safetyPolicy,
    forbidden: safetyPolicy.forbidden,
  }
}

export function formatForbiddenPolicy(blockedNames: readonly string[]): string {
  return [...blockedNames, ...safetyForbiddenCategories].join("/")
}
