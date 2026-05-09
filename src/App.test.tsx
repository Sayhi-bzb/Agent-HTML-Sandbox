import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import App from "./App"

describe("App", () => {
  it("renders the end-to-end MVP demo", () => {
    render(<App />)

    expect(screen.getByText("agent-html MVP")).toBeInTheDocument()
    expect(
      screen.getAllByRole("heading", {
        name: "Human Agent Collaboration Workbench",
      }),
    ).toHaveLength(2)

    const renderedArtifact = screen.getByRole("article")
    expect(
      within(renderedArtifact).getByText(
        "HTML artifacts should not stop at readable reports. A stronger artifact lets the human compare options, adjust preferences, write feedback, and export a precise next prompt without giving the agent raw script or styling access.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Explore" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Decide" })).toBeInTheDocument()
    expect(screen.getByText("Workbench readiness")).toBeInTheDocument()
  })
})
