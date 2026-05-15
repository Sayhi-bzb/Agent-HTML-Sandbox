export const cliDefaults = {
  documentPath: "artifact.agent.html",
  outputDir: "dist/html",
  previewPort: "4173",
}

const safetyForbiddenCategories = [
  "Tailwind",
  "shadcn props",
  "Radix props",
  "React props",
  "events",
  "external URLs",
  "unknown tags",
  "unknown attrs",
]

export const safetyHelpText =
  "Agent input cannot use Tailwind classes, className, style, scripts, event handlers, shadcn props, Radix props, arbitrary HTML attributes, or external resource passthrough."

export function formatForbiddenPolicy(blockedNames) {
  return [...blockedNames, ...safetyForbiddenCategories].join("/")
}
