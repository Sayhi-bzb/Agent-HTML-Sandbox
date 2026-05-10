import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  format as formatWithPrettier,
  resolveConfig as resolvePrettierConfig,
} from "prettier"
import ts from "typescript"
import { createServer } from "vite"

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const uiDir = path.join(packageRoot, "src", "components", "ui")
const generatedPath = path.join(
  packageRoot,
  "src",
  "agent-html",
  "generated",
  "component-schema.generated.ts",
)
const blockedPropNames = [
  "asChild",
  "class",
  "className",
  "css",
  "dangerouslySetInnerHTML",
  "onClick",
  "onclick",
  "script",
  "style",
]
const textChild = "#text"
const checkOnly = process.argv.includes("--check")

const { COMPONENT_SCHEMA_OVERLAYS } = await loadOverlayModule()
const componentsConfig = await readJson(
  path.join(packageRoot, "components.json"),
)
assertComponentsConfig(componentsConfig)
const introspections = await collectShadcnIntrospections()
const schemas = composeComponentSchemas(
  introspections,
  COMPONENT_SCHEMA_OVERLAYS,
)
const source = await formatGeneratedSource(introspections, schemas)

if (checkOnly) {
  const current = await readFile(generatedPath, "utf8")

  if (current !== source) {
    throw new Error(
      "Generated component schema is stale. Run npm run schema:generate.",
    )
  }
} else {
  await mkdir(path.dirname(generatedPath), { recursive: true })
  await writeFile(generatedPath, source)
}

async function loadOverlayModule() {
  const server = await createServer({
    appType: "custom",
    configFile: false,
    logLevel: "error",
    optimizeDeps: {
      noDiscovery: true,
    },
    root: packageRoot,
    resolve: {
      alias: {
        "@": path.join(packageRoot, "src"),
      },
    },
    server: {
      hmr: false,
      middlewareMode: true,
      watch: null,
    },
  })

  try {
    return await server.ssrLoadModule("/src/agent-html/schema-overlays.ts")
  } finally {
    await server.close()
  }
}

async function collectShadcnIntrospections() {
  const fileNames = (await readdir(uiDir))
    .filter((name) => name.endsWith(".tsx"))
    .sort()
  const results = []

  for (const fileName of fileNames) {
    const absolutePath = path.join(uiDir, fileName)
    const source = await readFile(absolutePath, "utf8")
    const sourceFile = toPosixPath(path.relative(packageRoot, absolutePath))
    const registryName = path.basename(fileName, ".tsx")
    const exports = extractExports(source, absolutePath)
    const slots = extractStringAttributeValues(source, "data-slot")
    const variantProps = extractCvaVariants(source)
    const unionProps = extractLiteralUnionProps(source)
    const blockedProps = blockedPropNames.filter((name) =>
      new RegExp(`\\b${escapeRegExp(name)}\\b`).test(source),
    )
    const dependencies = extractImportSources(source)

    results.push({
      registryName,
      sourceFile,
      componentName: exports[0] ?? toPascalCase(registryName),
      exports,
      slots,
      variantProps,
      unionProps,
      blockedProps,
      dependencies,
      registryDependencies: [],
    })
  }

  return results
}

function composeComponentSchemas(introspections, overlays) {
  const exposedOverlays = overlays.filter((overlay) => overlay.expose)
  const schemaNames = new Set(exposedOverlays.map((overlay) => overlay.name))
  const exportedComponentNames = new Set(
    introspections.flatMap((item) => item.exports),
  )
  const allBlockedProps = new Set(blockedPropNames)
  const hiddenProps = new Set(
    overlays.flatMap((item) => item.hiddenProps ?? []),
  )

  for (const overlay of exposedOverlays) {
    if (!overlay.name || !overlay.description) {
      throw new Error(
        "Exposed ComponentSchemaOverlay must declare name and description.",
      )
    }

    for (const sourceComponent of overlay.sourceComponents) {
      if (!exportedComponentNames.has(sourceComponent)) {
        throw new Error(
          `${overlay.name} references missing shadcn source component ${sourceComponent}.`,
        )
      }
    }

    for (const prop of overlay.props ?? []) {
      if (allBlockedProps.has(prop.name)) {
        throw new Error(`${overlay.name} exposes blocked prop ${prop.name}.`)
      }

      if (
        prop.valueKind === "enum" &&
        (!Array.isArray(prop.enumValues) || prop.enumValues.length === 0)
      ) {
        throw new Error(`${overlay.name}.${prop.name} enum prop has no values.`)
      }
    }

    for (const childName of overlay.allowedChildren ?? []) {
      if (childName !== textChild && !schemaNames.has(childName)) {
        throw new Error(`${overlay.name} allows unknown child ${childName}.`)
      }
    }
  }

  for (const introspection of introspections) {
    for (const blockedProp of introspection.blockedProps) {
      if (!allBlockedProps.has(blockedProp) && !hiddenProps.has(blockedProp)) {
        throw new Error(
          `${introspection.registryName} found unclassified blocked prop ${blockedProp}.`,
        )
      }
    }
  }

  return exposedOverlays.map((overlay) => ({
    name: overlay.name,
    description: overlay.description,
    props: overlay.props ?? [],
    allowedChildren: overlay.allowedChildren ?? [],
  }))
}

function extractExports(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const names = []

  sourceFile.forEachChild((node) => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableStatement(node)) &&
      hasExportModifier(node)
    ) {
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            names.push(declaration.name.text)
          }
        }
      } else if (node.name) {
        names.push(node.name.text)
      }
    }

    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          names.push(element.name.text)
        }
      }
    }
  })

  return [...new Set(names)].sort()
}

function hasExportModifier(node) {
  return node.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  )
}

function extractStringAttributeValues(source, attributeName) {
  return [
    ...new Set(
      [...source.matchAll(new RegExp(`${attributeName}="([^"]+)"`, "g"))].map(
        (match) => match[1],
      ),
    ),
  ].sort()
}

function extractCvaVariants(source) {
  const variants = {}
  let searchIndex = 0

  while (searchIndex < source.length) {
    const variantsKey = source.indexOf("variants:", searchIndex)

    if (variantsKey === -1) {
      break
    }

    const objectStart = source.indexOf("{", variantsKey)
    const objectEnd = findMatchingBrace(source, objectStart)
    const variantObject = source.slice(objectStart + 1, objectEnd)
    const entries = extractTopLevelObjectKeys(variantObject)

    for (const entry of entries) {
      const valueStart = variantObject.indexOf("{", entry.start)
      const valueEnd = findMatchingBrace(variantObject, valueStart)
      variants[entry.key] = extractTopLevelObjectKeys(
        variantObject.slice(valueStart + 1, valueEnd),
      ).map((item) => item.key)
    }

    searchIndex = objectEnd + 1
  }

  return Object.keys(variants).length > 0 ? sortRecord(variants) : undefined
}

function extractTopLevelObjectKeys(source) {
  const keys = []
  let depth = 0
  let quote = null
  let token = ""
  let tokenStart = 0

  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    const previous = source[index - 1]

    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = null
      }
      token += char
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      token += char
      continue
    }

    if (char === "{") {
      depth += 1
      token = ""
      continue
    }

    if (char === "}") {
      depth -= 1
      token = ""
      continue
    }

    if (depth === 0 && char === ":") {
      const key = cleanObjectKey(token)

      if (key) {
        keys.push({ key, start: tokenStart })
      }

      token = ""
      continue
    }

    if (depth === 0 && char === ",") {
      token = ""
      tokenStart = index + 1
      continue
    }

    if (depth === 0) {
      if (!token.trim()) {
        tokenStart = index
      }
      token += char
    }
  }

  return keys
}

function extractLiteralUnionProps(source) {
  const props = {}
  const pattern =
    /([A-Za-z][A-Za-z0-9_-]*)\??:\s*((?:"[^"]+"\s*\|\s*)+"[^"]+")/g
  let match

  while ((match = pattern.exec(source))) {
    props[match[1]] = [
      ...new Set([...match[2].matchAll(/"([^"]+)"/g)].map((item) => item[1])),
    ].sort()
  }

  return Object.keys(props).length > 0 ? sortRecord(props) : undefined
}

function extractImportSources(source) {
  return [
    ...new Set(
      [...source.matchAll(/from\s+"([^"]+)"/g)]
        .map((match) => match[1])
        .filter((specifier) => !specifier.startsWith("@/")),
    ),
  ].sort()
}

function findMatchingBrace(source, start) {
  if (start < 0 || source[start] !== "{") {
    throw new Error("Cannot find object literal start.")
  }

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

    if (char === "{") {
      depth += 1
      continue
    }

    if (char === "}") {
      depth -= 1

      if (depth === 0) {
        return index
      }
    }
  }

  throw new Error("Cannot find matching object literal end.")
}

async function formatGeneratedSource(introspections, schemas) {
  const source = [
    'import type { ComponentSchema, GeneratedShadcnIntrospection } from "../types"',
    "",
    "export const GENERATED_SHADCN_INTROSPECTIONS =",
    `${formatJson(introspections)} as const satisfies readonly GeneratedShadcnIntrospection[]`,
    "",
    "export const GENERATED_STANDARD_COMPONENT_SCHEMAS =",
    `${formatJson(schemas)} as const satisfies readonly ComponentSchema[]`,
    "",
  ].join("\n")

  return formatWithPrettier(source, {
    ...((await resolvePrettierConfig(generatedPath)) ?? {}),
    parser: "typescript",
  })
}

function cleanObjectKey(value) {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  return trimmed.replace(/^["']|["']$/g, "")
}

function sortRecord(record) {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, [...values].sort()]),
  )
}

function toPascalCase(value) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("")
}

function toPosixPath(value) {
  return value.split(path.sep).join("/")
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function formatJson(value) {
  return JSON.stringify(value, null, 2)
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"))
}

function assertComponentsConfig(config) {
  if (config?.aliases?.ui !== "@/components/ui") {
    throw new Error(
      "components.json must define aliases.ui as @/components/ui.",
    )
  }
}
