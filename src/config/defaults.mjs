export const cliDefaults = {
  configPath: "agent-html.config.json",
  documentPath: "artifact.agent.html",
  outputDir: "dist/html",
  projectConfigPath: "agent-html.project.json",
  previewPort: "4173",
  shadcnComponents: [
    "accordion",
    "alert",
    "badge",
    "button",
    "card",
    "checkbox",
    "progress",
    "separator",
    "slider",
    "table",
    "tabs",
    "textarea",
    "toggle",
    "toggle-group",
    "tooltip",
  ],
  shadcnPreset: "nova",
  shadcnTemplate: "vite",
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
