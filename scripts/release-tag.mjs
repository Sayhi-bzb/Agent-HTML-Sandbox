import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { getWorkspaceReleaseMetadata } from "./release-metadata.mjs"

const execFileAsync = promisify(execFile)
const { gitTag, version } = await getWorkspaceReleaseMetadata()

await ensureTagMissing(gitTag)
await execFileAsync("git", ["tag", gitTag])
process.stdout.write(`Created ${gitTag} for ${version}.\n`)

async function ensureTagMissing(gitTag) {
  try {
    await execFileAsync("git", ["rev-parse", "--verify", gitTag])
  } catch {
    return
  }

  throw new Error(`Git tag ${gitTag} already exists.`)
}
