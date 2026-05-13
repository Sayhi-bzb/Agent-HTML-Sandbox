import { cliDefaults, safetyHelpText } from "../config/defaults.mjs"

export const commandMetadata = {
  setup: {
    summary: "Configure the managed shadcn runtime.",
    purpose:
      "Interactively configure or repair the user-level managed runtime.",
    usage:
      "ahtml setup [--yes] [--force] [--ui shadcn] [--component-source shadcn-cli] [--preset <name|custom>] [--components <list|all>]",
    options: [
      {
        name: "yes",
        description: "Use default answers without prompting.",
        value: false,
      },
      {
        name: "force",
        description: "Rewrite the managed runtime even if it is ready.",
        value: false,
      },
      {
        name: "ui",
        description: "UI implementation library. Currently shadcn.",
        value: true,
      },
      {
        name: "component-source",
        description: "Component source. Defaults to shadcn-cli.",
        value: true,
      },
      {
        name: "preset",
        description: "shadcn preset name, or custom.",
        value: true,
      },
      {
        name: "components",
        description: "Comma-separated shadcn components, or all.",
        value: true,
      },
    ],
    example: "ahtml setup --yes --preset nova",
  },
  schema: {
    summary: "Print the agent-facing component and config contract.",
    purpose: "Print the dehydrated agent-facing contract.",
    usage: "ahtml schema [--format prompt|json] [--out <path>]",
    options: [
      {
        name: "format",
        description: "Output format. Defaults to prompt.",
        value: true,
      },
      {
        name: "out",
        description: "Write output to a file instead of stdout.",
        value: true,
      },
    ],
    example: "ahtml schema --format prompt",
  },
  validate: {
    summary: "Validate an agent-html document without writing output.",
    purpose:
      "Validate a standard .agent.html document without generating an artifact.",
    usage: "ahtml validate --input <path>",
    options: [
      { name: "input", description: "Agent-html document path.", value: true },
    ],
    example: `ahtml validate --input ${cliDefaults.documentPath}`,
  },
  build: {
    summary: "Build a sanitized static artifact directory.",
    purpose: "Validate, sanitize, and build a static artifact directory.",
    usage: "ahtml build --input <path> [--out <dir>]",
    options: [
      { name: "input", description: "Agent-html document path.", value: true },
      {
        name: "out",
        description: `Output directory. Defaults to ${cliDefaults.outputDir}.`,
        value: true,
      },
    ],
    example: `ahtml build --input ${cliDefaults.documentPath} --out ${cliDefaults.outputDir}`,
  },
  inspect: {
    summary: "Summarize config and component usage.",
    purpose:
      "Report effective config and component usage from a document or built artifact.",
    usage: "ahtml inspect --input <path>|--dir <dir> [--format summary|json]",
    options: [
      { name: "input", description: "Agent-html document path.", value: true },
      { name: "dir", description: "Built artifact directory.", value: true },
      {
        name: "format",
        description: "Output format. Defaults to summary.",
        value: true,
      },
    ],
    example: `ahtml inspect --input ${cliDefaults.documentPath}`,
  },
  preview: {
    summary: "Build and serve the static artifact over local HTTP.",
    purpose: "Build and serve the same static artifact output used by build.",
    usage: "ahtml preview --input <path> [--out <dir>] [--port <port>]",
    options: [
      { name: "input", description: "Agent-html document path.", value: true },
      {
        name: "out",
        description: `Output directory. Defaults to ${cliDefaults.outputDir}.`,
        value: true,
      },
      {
        name: "port",
        description: `Local HTTP port. Defaults to ${cliDefaults.previewPort}.`,
        value: true,
      },
    ],
    example: `ahtml preview --input ${cliDefaults.documentPath} --out ${cliDefaults.outputDir} --port ${cliDefaults.previewPort}`,
  },
  doctor: {
    summary: "Check local runtime, config, and output path.",
    purpose:
      "Check local runtime, config, package paths, and output path writability.",
    usage: "ahtml doctor",
    options: [],
    example: "ahtml doctor",
  },
  status: {
    summary: "Show setup readiness and the next command.",
    purpose:
      "Show managed runtime readiness, output writability, update status, and one recommended next command.",
    usage: "ahtml status",
    options: [],
    example: "ahtml status",
  },
  config: {
    summary: "Read default finite render config values.",
    purpose:
      "Read the default finite presentation config values from the schema.",
    usage: "ahtml config get",
    options: [],
    example: "ahtml config get",
  },
}

export function formatGlobalHelp() {
  return `ahtml

Sanitized agent-html artifact CLI.

Commands:
${formatCommandList()}

Closed-loop workflow:
  ahtml setup --yes
  ahtml status
  ahtml schema --format prompt
  ahtml validate --input ${cliDefaults.documentPath}
  ahtml build --input ${cliDefaults.documentPath} --out ${cliDefaults.outputDir}
  ahtml inspect --input ${cliDefaults.documentPath}
  ahtml preview --input ${cliDefaults.documentPath} --out ${cliDefaults.outputDir}
  ahtml doctor

Defaults:
  document: ${cliDefaults.documentPath}
  output: ${cliDefaults.outputDir}

Safety:
  ${safetyHelpText}

Run "ahtml <command> --help" for command details.
`
}

export function formatCliCommandUsageBlock() {
  return Object.entries(commandMetadata)
    .filter(([, definition]) => !definition.hidden)
    .map(([, definition]) => definition.usage.split("\n")[0])
    .join("\n")
}

export function formatCommandHelp(commandName, definition) {
  const sections = [
    `ahtml ${commandName}`,
    "",
    "Purpose:",
    `  ${definition.purpose}`,
    "",
    "Usage:",
    ...definition.usage.split("\n").map((line) => `  ${line}`),
  ]

  if (definition.options.length > 0) {
    sections.push(
      "",
      "Options:",
      ...definition.options.map(
        (option) => `  --${option.name.padEnd(7)} ${option.description}`,
      ),
    )
  }

  sections.push("", "Example:", `  ${definition.example}`)
  return `${sections.join("\n")}\n`
}

export function isHelpCommand(value) {
  return value === "--help" || value === "-h"
}

export function hasHelpFlag(commandArgs) {
  return commandArgs.includes("--help") || commandArgs.includes("-h")
}

function formatCommandList() {
  return Object.entries(commandMetadata)
    .filter(([, definition]) => !definition.hidden)
    .map(([name, definition]) => `  ${name.padEnd(10)} ${definition.summary}`)
    .join("\n")
}
