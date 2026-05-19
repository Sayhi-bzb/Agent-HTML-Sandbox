import path from "node:path"
import { pathToFileURL } from "node:url"

export function createConformanceFixtures() {
  return [
    {
      name: "default profile without meta-agent",
      source: '<page title="Fallback"><card title="Summary">Default profile.</card></page>',
      expect: {
        ok: true,
        documentStyleConfigReference: "report-default",
        components: [
          { name: "card", count: 1 },
          { name: "page", count: 1 },
        ],
      },
    },
    {
      name: "builtin style-ref via meta-agent",
      source: [
        '<meta-agent style-ref="ops-compact" />',
        '<page title="Dashboard"><card title="Queue">Ready.</card></page>',
      ].join("\n"),
      expect: {
        ok: true,
        documentStyleConfigReference: "ops-compact",
        components: [
          { name: "card", count: 1 },
          { name: "page", count: 1 },
        ],
      },
    },
    {
      name: "unknown attr rejection",
      source: '<page title="Bad"><card className="x" /></page>',
      expect: {
        ok: false,
        diagnosticCodes: ["unknown-attr"],
      },
    },
    {
      name: "unresolved style-ref falls back to default",
      source: [
        '<meta-agent style-ref="team-missing" />',
        '<page title="Fallback"><card title="Summary">Default profile.</card></page>',
      ].join("\n"),
      expect: {
        ok: true,
        documentStyleConfigReference: "report-default",
        components: [
          { name: "card", count: 1 },
          { name: "page", count: 1 },
        ],
      },
    },
  ]
}

export function normalizeConformanceResult(result) {
  return {
    ok: result.ok,
    documentStyleConfigReference:
      result.documentStyleConfigReference ?? undefined,
    components: [...(result.components ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    diagnosticCodes: [...(result.diagnosticCodes ?? [])].sort(),
  }
}

export function assertConformanceResultMatchesFixture(expect, actual) {
  const normalizedActual = normalizeConformanceResult(actual)

  if (normalizedActual.ok !== expect.ok) {
    throw new Error(
      `Expected ok=${expect.ok}, received ok=${normalizedActual.ok}.`,
    )
  }

  if (expect.documentStyleConfigReference) {
    if (
      normalizedActual.documentStyleConfigReference !==
      expect.documentStyleConfigReference
    ) {
      throw new Error(
        `Expected documentStyleConfigReference="${expect.documentStyleConfigReference}", received "${normalizedActual.documentStyleConfigReference ?? "undefined"}".`,
      )
    }
  }

  if (expect.components) {
    const expectedComponents = [...expect.components].sort((left, right) =>
      left.name.localeCompare(right.name),
    )
    const actualComponents = normalizedActual.components

    if (JSON.stringify(actualComponents) !== JSON.stringify(expectedComponents)) {
      throw new Error(
        `Expected components ${JSON.stringify(expectedComponents)}, received ${JSON.stringify(actualComponents)}.`,
      )
    }
  }

  if (expect.diagnosticCodes) {
    const missingCodes = expect.diagnosticCodes.filter(
      (code) => !normalizedActual.diagnosticCodes.includes(code),
    )

    if (missingCodes.length > 0) {
      throw new Error(
        `Expected diagnostic codes ${missingCodes.join(", ")} in ${JSON.stringify(normalizedActual.diagnosticCodes)}.`,
      )
    }
  }
}

export async function runCoreConformanceFixture(root, fixture) {
  const coreModule = await importCoreModule(root)
  const result = coreModule.sanitizeAgentHtml(fixture.source)

  return normalizeConformanceResult({
    ok: result.diagnostics.length === 0,
    documentStyleConfigReference:
      result.document?.meta.documentStyleConfigReference,
    components: createInspectionCounts(result.document?.components ?? []),
    diagnosticCodes: result.diagnostics.map((diagnostic) => diagnostic.code),
  })
}

export async function runAhtmlConformanceFixture(root, fixture, runtimePaths) {
  const validateModule = await importValidateModule(root)
  const result = await validateModule.validateAgentHtmlSource(
    fixture.source,
    runtimePaths,
  )

  return normalizeConformanceResult({
    ok: result.diagnostics.length === 0,
    documentStyleConfigReference:
      result.document?.meta.documentStyleConfigReference,
    components: createInspectionCounts(result.document?.components ?? []),
    diagnosticCodes: result.diagnostics.map((diagnostic) => diagnostic.code),
  })
}

async function importCoreModule(root) {
  const moduleUrl = pathToFileURL(
    path.join(root, "packages", "core", "index.mjs"),
  ).href

  return import(moduleUrl)
}

async function importValidateModule(root) {
  const moduleUrl = pathToFileURL(
    path.join(root, "packages", "ahtml", "src", "cli", "validate.mjs"),
  ).href

  return import(moduleUrl)
}

function createInspectionCounts(nodes, counts = {}) {
  for (const node of nodes) {
    if (node.type !== "component") {
      continue
    }

    counts[node.name] = (counts[node.name] ?? 0) + 1
    createInspectionCounts(node.children ?? [], counts)
  }

  return Object.entries(counts).map(([name, count]) => ({ name, count }))
}
