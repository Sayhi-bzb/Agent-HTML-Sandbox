import { VALIDATED_STANDARD_COMPONENT_SCHEMAS } from "./internal-core-bridge.mjs"

import {
  createRendererMapping,
  createRuntimeElementRegistrySpec,
  createRuntimeRendererKindSpec,
  createRuntimeVerificationData,
} from "./render-capabilities.mjs"

export function createRuntimeContract(components) {
  const normalizedComponents = normalizeRuntimeContractComponents(components)
  const verificationData = createRuntimeVerificationData(normalizedComponents)
  const rendererMapping = createRendererMapping(normalizedComponents)

  return {
    version: 1,
    components: normalizedComponents,
    renderableAgentComponents: normalizedComponents.map(
      (component) => component.name,
    ),
    verificationData,
    rendererMapping,
    elementRegistrySpec: createRuntimeElementRegistrySpec(rendererMapping),
    rendererKindSpec: createRuntimeRendererKindSpec(),
  }
}

export function createRuntimeContractFromSchema(schema) {
  return createRuntimeContract(schema?.components)
}

export function createManagedRuntimeManifest({
  componentSource,
  packageVersion = "0.0.0",
  paths,
  preset,
  renderer,
  runtimeBase,
  runtimeContract,
  runtimeSurface,
  uiLibrary,
  version,
  components = [],
  installMode,
}) {
  return {
    kind: "ahtml-managed-runtime",
    version,
    renderer,
    packageVersion,
    uiLibrary,
    componentSource,
    runtimeBase,
    shadcnRuntimeSurface: runtimeSurface,
    installMode,
    preset,
    components,
    installedUiComponents: components,
    renderableAgentComponents: runtimeContract.renderableAgentComponents,
    paths: {
      runtime: paths.runtimeDir,
      cache: paths.cacheDir,
      logs: paths.logsDir,
      config: paths.configDir,
      styleProfiles: paths.styleProfilesDir,
      builtinStyleProfiles: paths.builtinStyleProfilesDir,
      userStyleProfiles: paths.userStyleProfilesDir,
      styleProfileManifest: paths.styleProfileManifestPath,
    },
  }
}

export function createRuntimeVerificationState({
  components = [],
  runtimeBase,
  runtimeContract,
  runtimeSurface,
  version = 1,
}) {
  return {
    kind: "ahtml-runtime-render-verification",
    version,
    runtimeBase,
    shadcnRuntimeSurface: runtimeSurface,
    installedUiComponents: components,
    renderableAgentComponents: runtimeContract.renderableAgentComponents,
    verificationData: runtimeContract.verificationData,
    rendererMapping: runtimeContract.rendererMapping,
  }
}

function normalizeRuntimeContractComponents(components) {
  if (Array.isArray(components) && components.length > 0) {
    return components
  }

  return VALIDATED_STANDARD_COMPONENT_SCHEMAS
}
