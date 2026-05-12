import { getReleaseMetadata } from "./release-shared.mjs"

const metadata = await getReleaseMetadata()
const field = process.argv[2]

if (field) {
  if (!(field in metadata)) {
    throw new Error(`Unknown release metadata field "${field}".`)
  }

  process.stdout.write(`${metadata[field]}\n`)
} else {
  process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
}
