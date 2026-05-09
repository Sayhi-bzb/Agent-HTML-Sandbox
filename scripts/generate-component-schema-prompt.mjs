import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const componentSchemaPath = path.join(
  root,
  "src",
  "agent-html",
  "component-schema.ts",
)
const renderConfigPath = path.join(
  root,
  "src",
  "agent-html",
  "render-config.ts",
)
const outputPath = path.join(
  root,
  "src",
  "agent-html",
  "component-schema-prompt.txt",
)

const [componentSchemaSource, renderConfigSource] = await Promise.all([
  readFile(componentSchemaPath, "utf8"),
  readFile(renderConfigPath, "utf8"),
])

const components = extractArrayLiteral(
  componentSchemaSource,
  "STANDARD_COMPONENT_SCHEMAS",
)
const renderValues = {
  theme: extractConstArray(renderConfigSource, "RENDER_THEME_VALUES"),
  density: extractConstArray(renderConfigSource, "RENDER_DENSITY_VALUES"),
  tone: extractConstArray(renderConfigSource, "RENDER_TONE_VALUES"),
  width: extractConstArray(renderConfigSource, "RENDER_WIDTH_VALUES"),
}

const lines = [
  "Write agent-html only.",
  "",
  "Header:",
  `<meta-agent theme="${renderValues.theme.join("|")}" density="${renderValues.density.join("|")}" tone="${renderValues.tone.join("|")}" width="${renderValues.width.join("|")}" />`,
  "",
  "Standard components:",
  ...components.map(formatComponent),
  "",
  "Forbidden:",
  "class/className/style/css/Tailwind/shadcn props/Radix props/React props/script/onclick/events/external URLs/unknown tags/unknown attrs.",
]

await writeFile(outputPath, `${lines.join("\n")}\n`)

function extractArrayLiteral(source, exportName) {
  const marker = `export const ${exportName} = `
  const start = source.indexOf(marker)

  if (start === -1) {
    throw new Error(`Cannot find ${exportName}`)
  }

  const arrayStart = source.indexOf("[", start)
  const arrayEnd = findMatchingBracket(source, arrayStart)
  const literal = source
    .slice(arrayStart, arrayEnd + 1)
    .replaceAll("TEXT_CHILD", '"#text"')

  return Function(`"use strict"; return (${literal});`)()
}

function extractConstArray(source, exportName) {
  const exportMarker = `export const ${exportName} = `
  const constMarker = `const ${exportName} = `
  const start = source.includes(exportMarker)
    ? source.indexOf(exportMarker)
    : source.indexOf(constMarker)

  if (start === -1) {
    throw new Error(`Cannot find ${exportName}`)
  }

  const arrayStart = source.indexOf("[", start)
  const arrayEnd = findMatchingBracket(source, arrayStart)
  const literal = source.slice(arrayStart, arrayEnd + 1)

  return Function(`"use strict"; return (${literal});`)()
}

function findMatchingBracket(source, start) {
  let depth = 0
  let quote = null

  for (let index = start; index < source.length; index++) {
    const char = source[index]
    const previous = source[index - 1]

    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = null
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (char === "[") {
      depth += 1
    }

    if (char === "]") {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  throw new Error("Unclosed array literal")
}

function formatComponent(component) {
  const props = component.props.map(formatProp).join(" ")
  const propText = props ? `(${props})` : ""
  const children = (component.allowedChildren ?? [])
    .map((child) => (child === "#text" ? "text" : child))
    .join("/")

  return `${component.name}${propText} -> ${children || "none"}`
}

function formatProp(prop) {
  const required = prop.required ? "*" : "?"
  const name = `${prop.name}${required}`

  if (prop.valueKind === "enum") {
    return `${name}=${prop.enumValues.join("|")}`
  }

  return name
}
