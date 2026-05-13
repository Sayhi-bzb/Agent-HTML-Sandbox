import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { getRegistryItems } from "shadcn/registry"
import ts from "typescript"

const root = process.cwd()
const generatedPath = path.join(
  root,
  "src",
  "engine",
  "generated",
  "component-schema.generated.ts",
)
const overlayPath = path.join(root, "src", "engine", "schema-overlays.ts")
const registryNames = [
  "accordion",
  "alert",
  "badge",
  "button",
  "card",
  "checkbox",
  "progress",
  "separator",
  "slider",
  "table",
  "tabs",
  "textarea",
  "toggle-group",
  "toggle",
  "tooltip",
]
const blockedPropCandidates = [
  "asChild",
  "class",
  "className",
  "style",
]

const overlays = await loadOverlays()
const registryItems = await getRegistryItems(
  registryNames.map((name) => `@shadcn/${name}`),
  { useCache: true },
)
const introspections = registryItems.map(createIntrospection).sort((left, right) =>
  left.registryName.localeCompare(right.registryName),
)
const schemas = overlays
  .filter((overlay) => overlay.expose)
  .map((overlay) => ({
    name: overlay.name,
    description: overlay.description,
    props: overlay.props,
    allowedChildren: overlay.allowedChildren,
  }))

await writeFile(generatedPath, formatGeneratedFile({ introspections, schemas }))

async function loadOverlays() {
  const source = await readFile(overlayPath, "utf8")
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText
  const modulePath = path.join(root, ".cache", "schema-overlays.generated.mjs")

  await mkdir(path.dirname(modulePath), { recursive: true })
  await writeFile(modulePath, js)
  const module = await import(pathToFileURL(modulePath).href)
  return module.COMPONENT_SCHEMA_OVERLAYS
}

function createIntrospection(item) {
  const files = item.files ?? []
  const sourceFiles = files
    .filter((file) => typeof file.content === "string")
    .map((file) =>
      ts.createSourceFile(
        file.path ?? `${item.name}.tsx`,
        file.content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      ),
    )
  const exports = unique(sourceFiles.flatMap(extractExports))
  const slots = unique(sourceFiles.flatMap(extractSlots))
  const variantProps = mergeRecordArrays(sourceFiles.map(extractVariantProps))
  const unionProps = mergeRecordArrays(sourceFiles.map(extractUnionProps))
  const blockedProps = unique(sourceFiles.flatMap(extractBlockedProps))

  return compactObject({
    registryName: item.name,
    componentName: exports[0] ?? toPascalCase(item.name),
    exports,
    slots,
    variantProps,
    unionProps,
    blockedProps,
    dependencies: item.dependencies ?? [],
    registryDependencies: item.registryDependencies ?? [],
  })
}

function extractExports(sourceFile) {
  const exports = []

  visit(sourceFile)
  return exports

  function visit(node) {
    if (isExportedDeclaration(node)) {
      const name = getDeclarationName(node)

      if (name) {
        exports.push(name)
      }
    }

    if (ts.isExportDeclaration(node) && node.exportClause) {
      const clause = node.exportClause
      const elements = ts.isNamedExports(clause) ? clause.elements : []
      exports.push(
        ...elements.map((element) => (element.propertyName ?? element.name).text),
      )
    }

    ts.forEachChild(node, visit)
  }
}

function extractSlots(sourceFile) {
  const slots = []

  visit(sourceFile)
  return slots

  function visit(node) {
    if (
      ts.isJsxAttribute(node) &&
      node.name.text === "data-slot" &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      slots.push(node.initializer.text)
    }

    ts.forEachChild(node, visit)
  }
}

function extractVariantProps(sourceFile) {
  const variants = {}

  visit(sourceFile)
  return variants

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "cva"
    ) {
      const config = node.arguments[1]

      if (config && ts.isObjectLiteralExpression(config)) {
        const variantProperty = config.properties.find(
          (property) =>
            ts.isPropertyAssignment(property) &&
            getPropertyName(property.name) === "variants" &&
            ts.isObjectLiteralExpression(property.initializer),
        )

        if (variantProperty && ts.isPropertyAssignment(variantProperty)) {
          Object.assign(variants, extractObjectKeysByProperty(variantProperty.initializer))
        }
      }
    }

    ts.forEachChild(node, visit)
  }
}

function extractUnionProps(sourceFile) {
  const unionProps = {}

  visit(sourceFile)
  return unionProps

  function visit(node) {
    if (
      ts.isPropertySignature(node) &&
      node.type &&
      ts.isUnionTypeNode(node.type)
    ) {
      const values = node.type.types
        .filter(ts.isLiteralTypeNode)
        .map((type) => type.literal)
        .filter(ts.isStringLiteral)
        .map((literal) => literal.text)

      if (values.length > 0) {
        unionProps[getPropertyName(node.name)] = values
      }
    }

    ts.forEachChild(node, visit)
  }
}

function extractBlockedProps(sourceFile) {
  const found = new Set()

  visit(sourceFile)
  return [...found]

  function visit(node) {
    if (
      ts.isIdentifier(node) &&
      blockedPropCandidates.includes(node.text)
    ) {
      found.add(node.text)
    }

    ts.forEachChild(node, visit)
  }
}

function extractObjectKeysByProperty(objectNode) {
  return Object.fromEntries(
    objectNode.properties
      .filter(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ts.isObjectLiteralExpression(property.initializer),
      )
      .map((property) => [
        getPropertyName(property.name),
        property.initializer.properties
          .map((variant) => getPropertyName(variant.name))
          .filter(Boolean),
      ]),
  )
}

function isExportedDeclaration(node) {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts
        .getModifiers(node)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  )
}

function getDeclarationName(node) {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name
  ) {
    return node.name.text
  }

  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations
      .map((declaration) =>
        ts.isIdentifier(declaration.name) ? declaration.name.text : undefined,
      )
      .find(Boolean)
  }

  return undefined
}

function getPropertyName(name) {
  if (!name) {
    return undefined
  }

  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text
  }

  return undefined
}

function mergeRecordArrays(records) {
  const merged = {}

  for (const record of records) {
    for (const [key, values] of Object.entries(record)) {
      merged[key] = unique([...(merged[key] ?? []), ...values])
    }
  }

  return merged
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (Array.isArray(item)) {
        return item.length > 0
      }

      if (item && typeof item === "object") {
        return Object.keys(item).length > 0
      }

      return item !== undefined
    }),
  )
}

function toPascalCase(value) {
  return value
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("")
}

function formatGeneratedFile({ introspections, schemas }) {
  return `import type { ComponentSchema, GeneratedShadcnIntrospection } from "../types"

export const GENERATED_SHADCN_INTROSPECTIONS = ${JSON.stringify(introspections, null, 2)} as const satisfies readonly GeneratedShadcnIntrospection[]

export const GENERATED_STANDARD_COMPONENT_SCHEMAS = ${JSON.stringify(schemas, null, 2)} as const satisfies readonly ComponentSchema[]
`
}
