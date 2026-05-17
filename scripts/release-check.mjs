import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { getWorkspaceReleaseMetadata } from "./release-metadata.mjs"

const execFileAsync = promisify(execFile)
const root = process.cwd()
const npmCommand = "npm"
const windowsShellOptions =
  process.platform === "win32" ? { shell: true } : undefined

const metadata = await getWorkspaceReleaseMetadata()

await runNpm(["run", "check:package:release"], root)
await runNpm(
  [
    "publish",
    "--workspace",
    "@agent-html/ahtml",
    "--access",
    "public",
    "--tag",
    metadata.distTag,
    "--dry-run",
  ],
  root,
)

function runNpm(args, cwd) {
  return execFileAsync(npmCommand, args, {
    cwd,
    ...windowsShellOptions,
  })
}
