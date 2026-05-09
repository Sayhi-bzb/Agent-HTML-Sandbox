import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import App from "./App"

describe("App", () => {
  it("renders the MVP app shell", () => {
    render(<App />)

    expect(screen.getByText("agent-html MVP")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Phase 0 App Foundation" }),
    ).toBeInTheDocument()
  })
})
