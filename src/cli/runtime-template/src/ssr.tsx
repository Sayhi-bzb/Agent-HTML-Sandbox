import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { App } from "./app"

process.stdout.write(renderToStaticMarkup(<App />))
