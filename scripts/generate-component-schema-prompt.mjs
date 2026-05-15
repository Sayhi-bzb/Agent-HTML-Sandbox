import { writeFile } from "node:fs/promises"
import path from "node:path"

import {
  formatPrompt,
  getCliSchemaOutput,
} from "../packages/ahtml/src/cli/schema.mjs"

const root = process.cwd()
const outputPath = path.join(
  root,
  "packages",
  "core",
  "src",
  "component-schema-prompt.txt",
)
const schema = await getCliSchemaOutput(root)

await writeFile(outputPath, `${formatPrompt(schema)}\n`)
