import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./app"
import "./styles.css"

createRoot(window.document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
