import type {
  RendererSpecComponent,
  RuntimeVerificationState,
} from "./types"

export function createRendererSpecMap(
  runtimeVerificationState: RuntimeVerificationState,
) {
  return new Map(
    runtimeVerificationState.rendererMapping.components.map((component) => [
      component.name,
      component,
    ]),
  )
}

export function assertRendererRegistryParity(
  runtimeVerificationState: RuntimeVerificationState,
  rendererSpecByName: Map<string, RendererSpecComponent>,
) {
  const expected = runtimeVerificationState.verificationData.components
  const actual = runtimeVerificationState.rendererMapping.components
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
