import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import App from "./App"

describe("App", () => {
  it("renders the end-to-end MVP demo", () => {
    render(<App />)

    expect(screen.getByText("agent-html MVP")).toBeInTheDocument()
    expect(
      screen.getAllByRole("heading", { name: "Payment Review" }),
    ).toHaveLength(2)

    const renderedArtifact = screen.getByRole("article")
    expect(
      within(renderedArtifact).getByText(
        "Refund API misses finance role check",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("payment/refund.ts")).toBeInTheDocument()
  })
})
