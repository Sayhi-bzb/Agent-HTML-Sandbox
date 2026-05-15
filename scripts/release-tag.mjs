import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const root = process.cwd()
const workspacePackages = [
  {
    name: "@agent-html/core",
    manifestPath: path.join(root, "packages", "core", "package.json"),
  },
  {
    name: "@agent-html/ahtml",
    manifestPath: path.join(root, "packages", "ahtml", "package.json"),
  },
]
const versions = await Promise.all(
  workspacePackages.map(async ({ name, manifestPath }) => ({
    name,
    version: JSON.parse(await readFile(manifestPath, "utf8")).version,
  })),
)
const version = getSharedWorkspaceVersion(versions)
const gitTag = `v${version}`

await ensureTagMissing(gitTag)
await execFileAsync("git", ["tag", gitTag])
process.stdout.write(`Created ${gitTag} for ${version}.\n`)

function getSharedWorkspaceVersion(versions) {
  const [first] = versions

  if (
    !first ||
    typeof first.version !== "string" ||
    first.version.length === 0
  ) {
    throw new Error("Cannot determine workspace package version.")
  }

  for (const entry of versions) {
    if (entry.version !== first.version) {
      throw new Error(
        `Workspace package versions are out of sync: ${versions
          .map(({ name, version }) => `${name}@${version}`)
          .join(", ")}.`,
      )
    }
  }

  return first.version
}

async function ensureTagMissing(gitTag) {
  try {
    await execFileAsync("git", ["rev-parse", "--verify", gitTag])
  } catch {
    return
  }

  throw new Error(`Git tag ${gitTag} already exists.`)
}
