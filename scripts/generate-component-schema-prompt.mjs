import { writeFile } from "node:fs/promises"
import path from "node:path"

import { formatPrompt, getCliSchemaOutput } from "./agent-html-cli-schema.mjs"

const root = process.cwd()
const outputPath = path.join(
  root,
  "src",
  "agent-html",
  "component-schema-prompt.txt",
)
const schema = await getCliSchemaOutput(root)

await writeFile(outputPath, `${formatPrompt(schema)}\n`)
