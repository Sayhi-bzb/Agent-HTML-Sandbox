import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import App from "./App"

describe("App", () => {
  it("renders the package-safe fallback artifact", () => {
    render(<App />)

    expect(screen.getByText("agent-html MVP")).toBeInTheDocument()
    expect(
      screen.getAllByRole("heading", {
        name: "agent-html Artifact",
      }),
    ).toHaveLength(2)

    const renderedArtifact = screen.getByRole("article")
    expect(
      within(renderedArtifact).getByText(
        "This artifact was rendered through the sanitized agent-html pipeline.",
      ),
    ).toBeInTheDocument()
  })
})
