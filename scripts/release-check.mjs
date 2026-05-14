import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { getReleaseMetadata } from "./release-shared.mjs"

const execFileAsync = promisify(execFile)
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
const windowsShellOptions =
  process.platform === "win32" ? { shell: true } : undefined

const { distTag, publishCommand } = await getReleaseMetadata()

process.stdout.write(`Running ${publishCommand} --dry-run\n`)

const { stdout, stderr } = await execFileAsync(
  npmCommand,
  ["publish", "--access", "public", "--tag", distTag, "--dry-run"],
  windowsShellOptions,
)

if (stdout) {
  process.stdout.write(stdout)
}

if (stderr) {
  process.stderr.write(stderr)
}
