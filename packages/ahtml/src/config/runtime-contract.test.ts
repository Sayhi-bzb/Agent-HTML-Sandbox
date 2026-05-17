/// <reference types="node" />
// @vitest-environment node

import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

describe("runtime contract", () => {
  it("derives verification, mapping, and renderer registry views from one source", async () => {
    const { createRuntimeContract, VALIDATED_STANDARD_COMPONENT_SCHEMAS } =
      await importRuntimeContract()
    const runtimeContract = createRuntimeContract(
      VALIDATED_STANDARD_COMPONENT_SCHEMAS,
    )

    expect(runtimeContract.renderableAgentComponents).toEqual(
      VALIDATED_STANDARD_COMPONENT_SCHEMAS.map((component) => component.name),
    )
    expect(
      runtimeContract.verificationData.components.map(
        (component) => component.name,
      ),
    ).toEqual(
      runtimeContract.rendererMapping.components.map(
        (component) => component.name,
      ),
    )
    expect(runtimeContract.elementRegistrySpec.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          registryItem: "tabs",
        }),
      ]),
    )
    expect(runtimeContract.rendererKindSpec.kinds).toContain("tabs")
  })

  it("builds managed runtime manifest and verification state from the same contract", async () => {
    const {
      createManagedRuntimeManifest,
      createRuntimeContract,
      createRuntimeVerificationState,
      VALIDATED_STANDARD_COMPONENT_SCHEMAS,
    } = await importRuntimeContract()
    const runtimeContract = createRuntimeContract(
      VALIDATED_STANDARD_COMPONENT_SCHEMAS,
    )
    const runtimeSurface = { source: "shadcn-init" }

    const manifest = createManagedRuntimeManifest({
      componentSource: "shadcn-cli",
      components: ["card", "tabs"],
      installMode: "default",
      packageVersion: "0.0.0",
      paths: {
        runtimeDir: "/runtime",
        cacheDir: "/cache",
        logsDir: "/logs",
        configDir: "/config",
      },
      preset: "nova",
      renderer: "shadcn-runtime",
      runtimeBase: "radix",
      runtimeContract,
      runtimeSurface,
      uiLibrary: "shadcn",
      version: 1,
    })
    const verificationState = createRuntimeVerificationState({
      components: ["card", "tabs"],
      runtimeBase: "radix",
      runtimeContract,
      runtimeSurface,
      version: 1,
    })

    expect(manifest.renderableAgentComponents).toEqual(
      runtimeContract.renderableAgentComponents,
    )
    expect(verificationState.renderableAgentComponents).toEqual(
      runtimeContract.renderableAgentComponents,
    )
    expect(verificationState.verificationData).toBe(
      runtimeContract.verificationData,
    )
    expect(verificationState.rendererMapping).toBe(
      runtimeContract.rendererMapping,
    )
  })
})

async function importRuntimeContract() {
  const runtimeContractUrl = pathToFileURL(
    path.join(
      process.cwd(),
      "packages",
      "ahtml",
      "src",
      "config",
      "runtime-contract.mjs",
    ),
  ).href
  const coreModuleUrl = pathToFileURL(
    path.join(
      process.cwd(),
      "packages",
      "ahtml",
      "src",
      "config",
      "internal-core-bridge.mjs",
    ),
  ).href
  const [runtimeContractModule, coreModule] = await Promise.all([
    import(runtimeContractUrl),
    import(coreModuleUrl),
  ])

  return {
    createManagedRuntimeManifest:
      runtimeContractModule.createManagedRuntimeManifest as (input: {
        componentSource: string
        components: readonly string[]
        installMode: string
        packageVersion: string
        paths: {
          runtimeDir: string
          cacheDir: string
          logsDir: string
          configDir: string
        }
        preset: string
        renderer: string
        runtimeBase: string
        runtimeContract: {
          renderableAgentComponents: readonly string[]
        }
        runtimeSurface: { source: string }
        uiLibrary: string
        version: number
      }) => {
        readonly renderableAgentComponents: readonly string[]
      },
    createRuntimeContract: runtimeContractModule.createRuntimeContract as (
      components: readonly { readonly name: string }[],
    ) => {
      readonly renderableAgentComponents: readonly string[]
      readonly verificationData: {
        readonly components: readonly { readonly name: string }[]
      }
      readonly rendererMapping: {
        readonly components: readonly { readonly name: string }[]
      }
      readonly elementRegistrySpec: {
        readonly modules: readonly { readonly registryItem: string }[]
      }
      readonly rendererKindSpec: {
        readonly kinds: readonly string[]
      }
    },
    createRuntimeVerificationState:
      runtimeContractModule.createRuntimeVerificationState as (input: {
        components: readonly string[]
        runtimeBase: string
        runtimeContract: {
          renderableAgentComponents: readonly string[]
          verificationData: unknown
          rendererMapping: unknown
        }
        runtimeSurface: { source: string }
        version: number
      }) => {
        readonly renderableAgentComponents: readonly string[]
        readonly verificationData: unknown
        readonly rendererMapping: unknown
      },
    VALIDATED_STANDARD_COMPONENT_SCHEMAS:
      coreModule.VALIDATED_STANDARD_COMPONENT_SCHEMAS as readonly {
        readonly name: string
      }[],
  }
}
