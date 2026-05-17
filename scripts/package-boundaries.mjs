export const forbiddenPackFileSuffixes = [".test.ts", ".test.tsx"]

export const packageBoundaryChecks = {
  ahtml: {
    forbiddenPrefixes: [
      "blueprint/",
      "spec/",
      "tests/",
      "src/components/ui/",
      "src/agent-html/renderer/",
      "scripts/agent-html-cli",
      ".gitnexus/",
      "dist/",
      "build/",
      "coverage/",
      "scripts/shadcn-test-fixtures/",
    ],
    forbiddenFiles: [
      "agent-html.config.json",
      "agent-html.project.json",
      "artifact.agent.html",
      "src/config/project.mjs",
      "src/cli/scaffold.mjs",
    ],
    requiredFiles: [
      "bin/ahtml.mjs",
      "src/cli/command-contract.mjs",
      "src/config/internal-core-bridge.mjs",
      "package.json",
      "README.md",
    ],
  },
}

export function assertPackBoundary(packageName, files) {
  const check = packageBoundaryChecks[packageName]

  if (!check) {
    throw new Error(`Unknown package boundary target: ${packageName}`)
  }

  for (const file of files) {
    if (check.forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
      throw new Error(`Forbidden package file included: ${file}`)
    }

    if (check.forbiddenFiles.includes(file)) {
      throw new Error(`Forbidden package file included: ${file}`)
    }

    if (forbiddenPackFileSuffixes.some((suffix) => file.endsWith(suffix))) {
      throw new Error(`Test file included in package: ${file}`)
    }
  }

  for (const requiredFile of check.requiredFiles) {
    if (!files.includes(requiredFile)) {
      throw new Error(`Required package file missing: ${requiredFile}`)
    }
  }
}
