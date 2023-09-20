import "./main.js"

// No styles are present by default.
const stage = document.querySelector("just-headlines")
const style = document.createElement("style")

// All template tags feature self-decriptive namespaced class names if need be.
style.textContent = `
  a:hover {
    text-decoration: none;
  }
  p:first-child {
    margin-top: auto;
  }
  p:last-child {
    margin-bottom: auto;
  }
`

// Inline scoped css, adding via `link` also an option.
stage.shadowRoot.appendChild(style)

// Done loading.
stage.addEventListener("ready", () => {
  const links = stage.shadowRoot.querySelectorAll("a")

  links.forEach((link) => {
    link.setAttribute("target", "_parent")
  })
})

stage.addEventListener("progress", () => {
  document.querySelector(".spinner").remove()
}, { once: true, passive: true })
