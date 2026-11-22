import { render } from "preact"

import { App } from "./app.js"

const root = document.getElementById("app")
if (root === null) throw new Error("#app not found")
render(<App />, root)
