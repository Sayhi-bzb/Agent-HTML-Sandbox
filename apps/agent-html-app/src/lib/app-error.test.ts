import { describe, expect, it } from "vitest"

import { formatAppError } from "./app-error"

describe("formatAppError", () => {
  it("returns plain string errors unchanged", () => {
    expect(formatAppError("Simple failure")).toBe("Simple failure")
  })

  it("includes session, run, and details when available", () => {
    expect(
      formatAppError({
        message: "Build failed",
        sessionId: "session-1",
        runId: "build-123",
        details: "stdout log: D:/tmp/out.log",
      }),
    ).toBe(
      "Build failed (session session-1 · run build-123 | stdout log: D:/tmp/out.log)",
    )
  })

  it("falls back to a stable default message", () => {
    expect(formatAppError({ code: "session-io" })).toBe(
      "Unknown command failure.",
    )
  })
})
