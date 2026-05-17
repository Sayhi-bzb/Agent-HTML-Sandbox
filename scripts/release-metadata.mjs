import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

const root = process.cwd()
const workspacePackages = [
  {
    name: "@agent-html/ahtml",
    manifestPath: path.join(root, "packages", "ahtml", "package.json"),
  },
]

export async function readWorkspaceVersions() {
  return Promise.all(
    workspacePackages.map(async ({ name, manifestPath }) => ({
      name,
      version: JSON.parse(await readFile(manifestPath, "utf8")).version,
    })),
  )
}

export function getSharedWorkspaceVersion(versions) {
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
        `Release package versions are out of sync: ${versions
          .map(({ name, version }) => `${name}@${version}`)
          .join(", ")}.`,
      )
    }
  }

  return first.version
}

export function createReleaseMetadata(version) {
  const parsed = parseReleaseVersion(version)
  return {
    version,
    gitTag: `v${version}`,
    channel: parsed.channel,
    distTag: parsed.channel === "stable" ? "latest" : "alpha",
  }
}

export function assertReleaseChannel(version, expectedChannel) {
  const metadata = createReleaseMetadata(version)

  if (metadata.channel !== expectedChannel) {
    throw new Error(
      `Version ${version} is ${metadata.channel}, expected ${expectedChannel}.`,
    )
  }

  return metadata
}

export async function getWorkspaceReleaseMetadata() {
  const versions = await readWorkspaceVersions()
  const version = getSharedWorkspaceVersion(versions)
  return createReleaseMetadata(version)
}

function parseReleaseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/)

  if (!match) {
    throw new Error(`Unsupported workspace version format: ${version}.`)
  }

  const prerelease = match[4]

  if (!prerelease) {
    return { channel: "stable" }
  }

  if (/^alpha\.\d+$/.test(prerelease)) {
    return { channel: "alpha" }
  }

  throw new Error(
    `Unsupported prerelease channel "${prerelease}". Supported channels: alpha.`,
  )
}

const command = process.argv[2] ?? "json"

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const metadata = await getWorkspaceReleaseMetadata()

  switch (command) {
    case "json":
      process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
      break
    case "version":
      process.stdout.write(`${metadata.version}\n`)
      break
    case "gitTag":
      process.stdout.write(`${metadata.gitTag}\n`)
      break
    case "distTag":
      process.stdout.write(`${metadata.distTag}\n`)
      break
    case "channel":
      process.stdout.write(`${metadata.channel}\n`)
      break
    case "assert-stable":
      assertReleaseChannel(metadata.version, "stable")
      process.stdout.write(`${metadata.version}\n`)
      break
    case "assert-alpha":
      assertReleaseChannel(metadata.version, "alpha")
      process.stdout.write(`${metadata.version}\n`)
      break
    default:
      throw new Error(
        `Unknown release metadata command "${command}". Expected one of: json, version, gitTag, distTag, channel, assert-stable, assert-alpha.`,
      )
  }
}
