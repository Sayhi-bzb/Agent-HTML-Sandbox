import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const packagePath = path.join(process.cwd(), "package.json")
const manifest = JSON.parse(await readFile(packagePath, "utf8"))
const version = manifest.version
const gitTag = `v${version}`

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
