import { readFile } from "node:fs/promises"
import path from "node:path"

export async function getReleaseMetadata() {
  const packagePath = path.join(process.cwd(), "package.json")
  const manifest = JSON.parse(await readFile(packagePath, "utf8"))
  const version = manifest.version
  const distTag = getDistTag(version)

  return {
    name: manifest.name,
    version,
    distTag,
    gitTag: `v${version}`,
    publishCommand: `npm publish --access public --tag ${distTag}`,
  }
}

function getDistTag(version) {
  const prerelease = /^\d+\.\d+\.\d+-([0-9A-Za-z-]+)/.exec(version)?.[1]

  return prerelease ?? "latest"
}
