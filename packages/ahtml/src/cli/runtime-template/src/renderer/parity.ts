import type { RendererSpecComponent, RuntimeCapabilities } from "./types"

export function createRendererSpecMap(
  runtimeCapabilities: RuntimeCapabilities,
) {
  return new Map(
    runtimeCapabilities.rendererMapping.components.map((component) => [
      component.name,
      component,
    ]),
  )
}

export function assertRendererRegistryParity(
  runtimeCapabilities: RuntimeCapabilities,
  rendererSpecByName: Map<string, RendererSpecComponent>,
) {
  const expected = runtimeCapabilities.verificationData.components
  const actual = runtimeCapabilities.rendererMapping.components
  const expectedNames = expected.map((component) => component.name)
  const actualNames = actual.map((component) => component.name)
  const missing = expectedNames.filter((name) => !actualNames.includes(name))
  const extra = actualNames.filter((name) => !expectedNames.includes(name))
  const kindMismatches = expected
    .map((component) => {
      const rendererSpec = rendererSpecByName.get(component.name)
      if (!rendererSpec) {
        return null
      }

      if (!component.renderKind || component.renderKind === rendererSpec.kind) {
        return null
      }

      return `${component.name} kind: ${rendererSpec.kind} expected ${component.renderKind}`
    })
    .filter(Boolean)

  if (missing.length > 0 || extra.length > 0 || kindMismatches.length > 0) {
    throw new Error(
      [
        "Runtime renderer registry does not match runtime verification data.",
        missing.length > 0 ? `Missing: ${missing.join(", ")}` : "",
        extra.length > 0 ? `Extra: ${extra.join(", ")}` : "",
        kindMismatches.length > 0
          ? `Kind mismatch: ${kindMismatches.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
  }
}
