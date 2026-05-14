import { readFile } from "node:fs/promises"

import {
  collectRendererSpecComponentIssues,
  structuralAgentComponents,
  supportedRendererKinds,
} from "../config/render-capabilities.mjs"
import { parseJson } from "./cli-io.mjs"

const rendererSpecScalarFields = [
  "source",
  "requiredRegistryItem",
  "kind",
  "component",
  "root",
  "title",
  "titleContainer",
  "content",
  "list",
  "trigger",
  "body",
  "header",
  "row",
  "headerCell",
  "bodyCell",
  "item",
  "itemSlot",
  "rowSlot",
  "cellSlot",
  "rootClassName",
  "titleClassName",
  "titleProp",
  "defaultProp",
  "fallback",
  "mode",
  "headerKind",
  "kindProp",
  "itemValueProp",
  "itemHeadingProp",
  "childMode",
]
const rendererSpecStructuredFields = [
  "requiredExports",
  "rootByProp",
  "propMappings",
]

export async function readRuntimeCapabilities(paths) {
  return parseJson(
    await readFile(paths.runtimeCapabilitiesPath, "utf8"),
    "render-capabilities.generated.json must be valid JSON.",
  )
}

export async function getRuntimeRenderDiagnostics({
  document,
  runtimePaths,
  schema,
}) {
  const runtimeCapabilities = await readRuntimeCapabilities(runtimePaths)
  return createRuntimeRenderDiagnostics({
    document,
    runtimeCapabilities,
    schema,
  })
}

export function createRuntimeRenderDiagnostics({
  document,
  runtimeCapabilities,
  schema,
}) {
  const diagnostics = []
  const runtimeVerificationData = runtimeCapabilities.verificationData
  const schemaVerificationData = schema.verificationData
  const runtimeRendererMapping = runtimeCapabilities.rendererMapping
  const schemaRendererMapping = schema.rendererMapping

  pushRuntimeCheckDiagnostic({
    actual: runtimeVerificationData,
    actualName: "runtime verification data ui capabilities",
    code: "runtime-verification-data-parity",
    diagnostics,
    expected: schemaVerificationData,
    expectedName: "schema verificationData",
    path: "/runtime",
    validate: assertUiCapabilitiesParity,
  })
  pushRuntimeCheckDiagnostic({
    actual: runtimeRendererMapping,
    actualName: "runtime renderer mapping spec",
    code: "runtime-renderer-mapping-parity",
    diagnostics,
    expected: schemaRendererMapping,
    expectedName: "schema rendererMapping",
    path: "/runtime",
    validate: assertRendererSpecParity,
  })

  try {
    assertRuntimeRendererRegistryParity(runtimeCapabilities)
  } catch (error) {
    diagnostics.push(
      createRuntimeDiagnostic({
        code: "runtime-renderer-parity",
        message: error instanceof Error ? error.message : String(error),
        path: "/runtime",
      }),
    )
  }

  diagnostics.push(
    ...collectDocumentRenderDiagnostics({
      nodes: document?.components ?? [],
      rendererSpecByName: new Map(
        (runtimeRendererMapping?.components ?? []).map((component) => [
          component.name,
          component,
        ]),
      ),
      parentPath: "",
    }),
  )

  return diagnostics
}

export function assertUiCapabilitiesParity({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  const actualComponents = actual?.components ?? []
  const expectedComponents = expected?.components ?? []

  assertSameStringSet({
    actual: actualComponents.map((component) => component.name),
    actualName: `${actualName} components`,
    expected: expectedComponents.map((component) => component.name),
    expectedName: `${expectedName} components`,
  })

  for (const expectedComponent of expectedComponents) {
    const actualComponent = actualComponents.find(
      (component) => component.name === expectedComponent.name,
    )

    if (!actualComponent) {
      continue
    }

    assertSameStringSet({
      actual: actualComponent.props ?? [],
      actualName: `${actualName} ${expectedComponent.name} props`,
      expected: expectedComponent.props ?? [],
      expectedName: `${expectedName} ${expectedComponent.name} props`,
    })
    assertSameValue({
      actual: actualComponent.renderKind,
      actualName: `${actualName} ${expectedComponent.name} renderKind`,
      expected: expectedComponent.renderKind,
      expectedName: `${expectedName} ${expectedComponent.name} renderKind`,
    })
    assertSameStringSet({
      actual: (actualComponent.slots ?? []).map((slot) => slot.name),
      actualName: `${actualName} ${expectedComponent.name} slots`,
      expected: (expectedComponent.slots ?? []).map((slot) => slot.name),
      expectedName: `${expectedName} ${expectedComponent.name} slots`,
    })

    for (const expectedSlot of expectedComponent.slots ?? []) {
      const actualSlot = (actualComponent.slots ?? []).find(
        (slot) => slot.name === expectedSlot.name,
      )

      if (!actualSlot) {
        continue
      }

      assertSameStringSet({
        actual: actualSlot.props ?? [],
        actualName: `${actualName} ${expectedComponent.name}.${expectedSlot.name} props`,
        expected: expectedSlot.props ?? [],
        expectedName: `${expectedName} ${expectedComponent.name}.${expectedSlot.name} props`,
      })
      assertSameStringSet({
        actual: actualSlot.children ?? [],
        actualName: `${actualName} ${expectedComponent.name}.${expectedSlot.name} children`,
        expected: expectedSlot.children ?? [],
        expectedName: `${expectedName} ${expectedComponent.name}.${expectedSlot.name} children`,
      })
    }
  }
}

export function assertRendererSpecParity({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  const actualComponents = actual?.components ?? []
  const expectedComponents = expected?.components ?? []

  assertSameStringSet({
    actual: actualComponents.map((component) => component.name),
    actualName: `${actualName} components`,
    expected: expectedComponents.map((component) => component.name),
    expectedName: `${expectedName} components`,
  })

  for (const expectedComponent of expectedComponents) {
    const actualComponent = actualComponents.find(
      (component) => component.name === expectedComponent.name,
    )

    if (!actualComponent) {
      continue
    }

    assertSameValue({
      actual: actualComponent.renderKind,
      actualName: `${actualName} ${expectedComponent.name} renderKind`,
      expected: expectedComponent.renderKind,
      expectedName: `${expectedName} ${expectedComponent.name} renderKind`,
    })
    assertRendererSpecComponentRequirements({
      component: actualComponent,
      componentName: `${actualName} ${expectedComponent.name}`,
    })
    assertRendererSpecComponentRequirements({
      component: expectedComponent,
      componentName: `${expectedName} ${expectedComponent.name}`,
    })
    assertRendererSpecFields({
      actual: actualComponent,
      actualName: `${actualName} ${expectedComponent.name}`,
      expected: expectedComponent,
      expectedName: `${expectedName} ${expectedComponent.name}`,
    })
    assertSameStringSet({
      actual: (actualComponent.slots ?? []).map((slot) => slot.name),
      actualName: `${actualName} ${expectedComponent.name} slots`,
      expected: (expectedComponent.slots ?? []).map((slot) => slot.name),
      expectedName: `${expectedName} ${expectedComponent.name} slots`,
    })
  }
}

export function assertRuntimeRendererRegistryParity(runtimeCapabilities) {
  const expected = runtimeCapabilities.verificationData?.components ?? []
  const actual = runtimeCapabilities.rendererMapping?.components ?? []
  const expectedNames = expected.map((component) => component.name)
  const actualNames = actual.map((component) => component.name)
  const missing = expectedNames.filter((name) => !actualNames.includes(name))
  const extra = actualNames.filter((name) => !expectedNames.includes(name))
  const kindMismatches = expected
    .map((component) => {
      const rendererSpec = actual.find((item) => item.name === component.name)

      if (!rendererSpec) {
        return null
      }

      if (!component.renderKind || component.renderKind === rendererSpec.kind) {
        return null
      }

      return `${component.name} kind: ${rendererSpec.kind} expected ${component.renderKind}`
    })
    .filter(Boolean)
  const unsupportedKinds = actual
    .filter((component) => !supportedRendererKinds.has(component.kind))
    .map((component) => `${component.name} kind: ${component.kind}`)

  if (
    missing.length > 0 ||
    extra.length > 0 ||
    kindMismatches.length > 0 ||
    unsupportedKinds.length > 0
  ) {
    throw new Error(
      [
        "Runtime renderer registry does not match runtime verification data.",
        missing.length > 0 ? `Missing: ${missing.join(", ")}` : "",
        extra.length > 0 ? `Extra: ${extra.join(", ")}` : "",
        kindMismatches.length > 0
          ? `Kind mismatch: ${kindMismatches.join("; ")}`
          : "",
        unsupportedKinds.length > 0
          ? `Unsupported kinds: ${unsupportedKinds.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
  }
}

export function assertSameStringSet({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  const missing = expected.filter((item) => !actualSet.has(item))
  const extra = actual.filter((item) => !expectedSet.has(item))

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      [
        `${actualName} does not match ${expectedName}.`,
        missing.length > 0 ? `Missing: ${missing.join(", ")}` : "",
        extra.length > 0 ? `Extra: ${extra.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
  }
}

export function assertSameValue({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  if (actual !== expected) {
    throw new Error(
      `${actualName} does not match ${expectedName}. Actual: ${String(actual)} Expected: ${String(expected)}.`,
    )
  }
}

function assertRendererSpecFields({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  for (const fieldName of rendererSpecScalarFields) {
    assertSameValue({
      actual: actual?.[fieldName],
      actualName: `${actualName} ${fieldName}`,
      expected: expected?.[fieldName],
      expectedName: `${expectedName} ${fieldName}`,
    })
  }

  for (const fieldName of rendererSpecStructuredFields) {
    assertSameSerializedValue({
      actual: actual?.[fieldName],
      actualName: `${actualName} ${fieldName}`,
      expected: expected?.[fieldName],
      expectedName: `${expectedName} ${fieldName}`,
    })
  }
}

function assertRendererSpecComponentRequirements({ component, componentName }) {
  const issues = collectRendererSpecComponentIssues(component)

  if (issues.length > 0) {
    throw new Error(
      `${componentName} is not a valid renderer spec component. ${issues.join(" ")}`,
    )
  }
}

function assertSameSerializedValue({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  const actualSerialized = JSON.stringify(actual ?? null)
  const expectedSerialized = JSON.stringify(expected ?? null)

  if (actualSerialized !== expectedSerialized) {
    throw new Error(
      `${actualName} does not match ${expectedName}. Actual: ${actualSerialized} Expected: ${expectedSerialized}.`,
    )
  }
}

function pushRuntimeCheckDiagnostic({
  actual,
  actualName,
  code,
  diagnostics,
  expected,
  expectedName,
  path,
  validate,
}) {
  try {
    validate({
      actual,
      actualName,
      expected,
      expectedName,
    })
  } catch (error) {
    diagnostics.push(
      createRuntimeDiagnostic({
        code,
        message: error instanceof Error ? error.message : String(error),
        path,
      }),
    )
  }
}

function collectDocumentRenderDiagnostics({
  nodes,
  parentPath,
  rendererSpecByName,
}) {
  const diagnostics = []

  for (const [index, node] of nodes.entries()) {
    if (node.type !== "component") {
      continue
    }

    const path = `${parentPath}/${index}`
    const rendererSpec = rendererSpecByName.get(node.name)

    if (!rendererSpec) {
      if (structuralAgentComponents.includes(node.name)) {
        diagnostics.push(
          ...collectDocumentRenderDiagnostics({
            nodes: node.children,
            parentPath: path,
            rendererSpecByName,
          }),
        )
        continue
      }

      diagnostics.push(
        createRuntimeDiagnostic({
          code: "runtime-renderer-component",
          message: `Component "${node.name}" has no runtime renderer mapping spec.`,
          path,
        }),
      )
      continue
    }

    if (!supportedRendererKinds.has(rendererSpec.kind)) {
      diagnostics.push(
        createRuntimeDiagnostic({
          code: "runtime-renderer-kind",
          message: `Component "${node.name}" uses unsupported renderer kind "${rendererSpec.kind}".`,
          path,
        }),
      )
      continue
    }

    diagnostics.push(
      ...collectDocumentRenderDiagnostics({
        nodes: node.children,
        parentPath: path,
        rendererSpecByName,
      }),
    )
  }

  return diagnostics
}

function createRuntimeDiagnostic({ code, message, path }) {
  return {
    code,
    message,
    path,
    severity: "error",
  }
}
