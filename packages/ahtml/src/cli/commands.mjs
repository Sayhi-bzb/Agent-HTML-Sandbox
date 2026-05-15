import { cliDefaults, safetyHelpText } from "../config/defaults.mjs"

export const commandMetadata = {
  setup: {
    summary: "Prepare or repair the managed runtime.",
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
  prompt: {
    summary: "Print the agent-facing writing prompt.",
    purpose: "Print the agent-facing component and config contract.",
    usage: "ahtml prompt [--format prompt|json] [--out <path>]",
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
    example: "ahtml prompt",
  },
  build: {
    summary: "Validate and build a static HTML artifact.",
    purpose: "Validate, sanitize, and build a static artifact directory.",
    usage: "ahtml build [<input>] [--out <dir>] [--format text|json]",
    options: [
      {
        name: "input",
        description: "Agent-html document path.",
        value: true,
        hidden: true,
      },
      {
        name: "out",
        description: `Output directory. Defaults to ${cliDefaults.outputDir}.`,
        value: true,
      },
      {
        name: "format",
        description: "Command output format. Defaults to text.",
        value: true,
      },
    ],
    example: `ahtml build ${cliDefaults.documentPath}`,
  },
  preview: {
    summary: "Build and preview a static HTML artifact.",
    purpose: "Build and serve the same static artifact output used by build.",
    usage: "ahtml preview [<input>] [--out <dir>] [--port <port>]",
    options: [
      {
        name: "input",
        description: "Agent-html document path.",
        value: true,
        hidden: true,
      },
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
    example: `ahtml preview ${cliDefaults.documentPath}`,
  },
  doctor: {
    summary: "Check runtime health and output paths.",
    purpose:
      "Check local runtime, config, package paths, and output path writability.",
    usage: "ahtml doctor [--format text|json]",
    options: [
      {
        name: "format",
        description: "Command output format. Defaults to text.",
        value: true,
      },
    ],
    example: "ahtml doctor",
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
    hidden: true,
  },
}

export function formatGlobalHelp() {
  return `ahtml

Interactive agent-html artifact CLI.

Commands:
${formatCommandList()}

Main workflow:
  ahtml
  ahtml prompt
  ahtml build ${cliDefaults.documentPath}
  ahtml preview ${cliDefaults.documentPath}
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
      ...definition.options
        .filter((option) => !option.hidden)
        .map((option) => `  --${option.name.padEnd(7)} ${option.description}`),
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
