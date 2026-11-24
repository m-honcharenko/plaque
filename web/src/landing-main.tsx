import { render } from "preact"

import { Landing } from "./landing.js"

const root = document.getElementById("app")
if (root === null) throw new Error("#app not found")
render(<Landing />, root)
